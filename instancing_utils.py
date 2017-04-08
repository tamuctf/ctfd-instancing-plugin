import hashlib
import json
import logging
import logging.handlers
import os
import subprocess
import sys
from traceback import format_exception_only
from StringIO import StringIO

from flask import current_app as app, session

from CTFd.models import db, FileMappings, Teams, Instances, Files
from binascii import crc32



def hash_choice(items, keys):
    code = ""
    for k in keys:
        code += str(crc32(str(k)))
    index = crc32(code) % len(items)
    return items[index]


def choose_instance(chalid):
    instances = Instances.query.filter_by(chal=chalid) \
                         .order_by(Instances.id.asc()).all()

    if instances:
        team = Teams.query.filter_by(id=session.get('id')).first()
        return hash_choice(instances, [team.seed])
    else:
        raise KeyError("No instances found for challenge id %i" % chalid)

def raise_preserve_tb(etype, msg):
    root_etype, root_e, tb = sys.exc_info()
    formatted_root_e = format_exception_only(root_etype, root_e)[-1]
    formatted_msg = "{} due to {}".format(msg, formatted_root_e)
    raise etype, formatted_msg, tb


def get_instance_static(chal_id):

    instance = choose_instance(chal_id)

    try:
        params = json.loads(instance.params)
    except ValueError as e:
        msg = "JSON decode eror on string '{}'".format(instance.params)
        raise_preserve_tb(RuntimeError, msg)

    filemap_query = FileMappings.query.filter_by(instance=instance.id)
    fileids = [mapping.file for mapping in filemap_query.all()]

    file_query = Files.query.filter(Files.id.in_(fileids))
    files = [str(f.location) for f in file_query.all()]

    return params, files


def get_instance_dynamic(generator_path):
    gen_folder = os.path.join(os.path.normpath(app.root_path), app.config['GENERATOR_FOLDER'])
    team = Teams.query.add_columns('seed').filter_by(id=session.get('id')).first()
    abs_gen_path = os.path.abspath(os.path.join(gen_folder, generator_path))
    gen_script_dir = os.path.dirname(abs_gen_path)

    try:
        output = subprocess.check_output([abs_gen_path, 'config', team.seed],
                                         cwd=gen_script_dir)

    except subprocess.CalledProcessError as e:
        msg = """subprocess call failed for generator at {} failed with exit code {}
        Last output:
        {}""".format(generator_path, e.returncode, e.output)
        raise_preserve_tb(RuntimeError, msg)
    except IOError:
        msg = "subprocess call failed for generator at {}: File not found".format(generator_path)
        raise_preserve_tb(RuntimeError, msg)

    try:
        config = json.loads(output)
        params = config.get('params', {})
        files = config.get('files', [])

    except ValueError:
        msg = "subprocess call failed for generator at {} failed to produce JSON".format(generator_path)
        raise_preserve_tb(RuntimeError, msg)

    if files:
        file_path_prefix = os.path.relpath(gen_script_dir, start=gen_folder)
        files = [os.path.normpath(os.path.join(file_path_prefix, file)) for file in files]

        # Add an md5 hash of the path to the front of the path to avoid collisions
        files = [os.path.join(hashlib.md5(path).hexdigest(), path) for path in files]

    return params, files

def get_file_dynamic(generator_path, path):
    """
    Call upon the given generator to retrieve the file at the given "path"
    Returns the file object buffered in a StringIO object.
    """

    # Discard the first piece of the path, which (if generated properly) is simply an anti-collision measure
    path = '/'.join(path.split('/')[1:])

    gen_folder = os.path.join(os.path.normpath(app.root_path), app.config['GENERATOR_FOLDER'])
    team = Teams.query.add_columns('seed').filter_by(id=session.get('id')).first()
    abs_gen_path = os.path.abspath(os.path.join(gen_folder, generator_path))
    gen_script_dir = os.path.dirname(abs_gen_path)

    path_rel = os.path.relpath(os.path.join(gen_folder, path), start=gen_script_dir)

    try:
        output = subprocess.check_output([abs_gen_path, 'file', team.seed, path_rel],
                                          cwd=gen_script_dir)

    except subprocess.CalledProcessError as e:
        msg = """subprocess call failed for generator at {} failed with exit code {}
        Last output:
        {}""".format(generator_path, e.returncode, e.output)
        raise_preserve_tb(RuntimeError, msg)
    except IOError:
        msg = "subprocess call failed for generator at {}: File not found".format(generator_path)
        raise_preserve_tb(RuntimeError, msg)

    return StringIO(output)


def update_generated_files(chalid, files):
    """
    Adds any filenames given by the files list to the DB as generated files.
    The chalid of these new files will the the inputted chalid
    """
    files_db_objs = Files.query.add_columns('location').filter_by(chal=chalid).all()
    files_db = [f.location for f in files_db_objs]
    for file in files:
        if file not in files_db:
            db.session.add(Files(chalid, file, True))
    db.session.commit()


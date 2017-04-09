from CTFd.plugins.keys import get_key_class
from CTFd.plugins import challenges, keys
from CTFd.models import db, Keys, FileMappings, Instances, Challenges, Files
from CTFd.utils import admins_only
from instancing_utils import get_instance_static, get_file_dynamic, get_instance_dynamic, update_generated_files, init_instance_log
from werkzeug.exceptions import NotFound
from flask import Blueprint, request, jsonify, make_response, send_file
from sqlalchemy import and_
from functools import wraps
from jinja2 import Template
from StringIO import StringIO
from config import config
import json
import logging
import collections
import io
import os

class InstancedChallenge(challenges.BaseChallenge):
    id = 4321
    name = "instanced"

    @staticmethod
    def solve(chal, provided_flag):
        chal_keys = Keys.query.filter_by(chal=chal.id).all()
        instance_log = logging.getLogger('instancing')

        params = None
        try:
            if chal.generated:
                params, files = get_instance_dynamic(chal.generator)
            else:
                params, files = get_instance_static(chal.id)
            assert isinstance(params, collections.Mapping)
        except Exception:
            instance_log.exception("instancing error during key "
                                   "submission in challenge #{0.id} "
                                   "({0.name})".format(chal))
            return '-1'

        for chal_key in chal_keys:
            rendered_flag = Template(chal_key.flag).render(params)
            instance_log.debug("Key template '{}' render to '{}'".format(chal_key.flag, rendered_flag))

            if get_key_class(chal_key.key_type).compare(rendered_flag, provided_flag):
                return True
        return False

def load(app):
    config(app)
    init_instance_log()
    instancing = Blueprint('instancing', __name__)

    @instancing.route('/admin/instances/<chalid>', methods=['POST', 'GET'])
    @admins_only
    def admin_instances(chalid):
        if request.method == 'GET':
            instances = Instances.query.filter_by(chal=chalid).all()
            json_data = {'instances':[]}
            for x in instances:
                filemappings = [y.file for y in FileMappings.query.filter_by(instance=x.id)]
                json_data['instances'].append({'id':x.id, 'params':x.params, 'chal':x.chal, 'filemappings':filemappings})
            return jsonify(json_data)
        elif request.method == 'POST':
            currinstances = Instances.query.filter_by(chal=chalid).order_by(Instances.id.asc()).all()
            req_instances = request.form.getlist('instances[]', lambda x: json.loads(x));
            updatedinstances = dict([(int(x['id']), x) for x in req_instances])
            #Update any instances with new parameters if their ID is in the DB
            for instance in currinstances:
                updatedinst = updatedinstances.pop(instance.id, None)
                if updatedinst:
                    instance.params = updatedinst['params']
                    FileMappings.query.filter_by(instance=updatedinst['id']).delete()
                    for fileid in updatedinst['filemappings']:
                        filemapping = FileMappings(fileid, updatedinst['id'])
                        db.session.add(filemapping)

                else:
                    FileMappings.query.filter_by(instance=instance.id).delete()
                    db.session.delete(instance)
            # Create new instances (with new IDs) if their ID is not in the DB
            for newinst in updatedinstances.values():
                instance = Instances(chalid, newinst['params'])
                db.session.add(instance)
                db.session.flush()
                print instance.id
                for fileid in newinst['filemappings']:
                    filemapping = FileMappings(fileid, instance.id)
                    db.session.add(filemapping)
            db.session.commit()
            db.session.close()
            return '1'

    def chals_decorator(chals_func):
        @wraps(chals_func)
        def wrapper(*args, **kwargs):
            response = chals_func(*args, **kwargs)
            # Determine if the ouptut is the challenges versus something else
            try:
                game = json.loads(response.get_data())['game']
            except (ValueError, KeyError):
                return response

            # Get the columns we need from the DB and make a dict for fast lookup
            chal_ids = [item['id'] for item in game]
            filter = Challenges.id.in_(chal_ids)
            columns = ('id','instanced','generated','generator')
            chals = Challenges.query.filter(filter).add_columns(*columns).all()
            chals = dict((c.id, c) for c in chals)

            for item in game:
                chal = chals[item['id']]
                if chal.instanced:
                    try:
                        if chal.generated:
                            params, files = get_instance_dynamic(chal.generator)
                            if files:
                                update_generated_files(chal.id, files)

                            # Query the DB which now include newly added files and static files
                            files_query = Files.query.filter(and_(Files.chal == chal.id, Files.generated != True))
                            files.extend([str(f.location) for f in files_query.all()])
                            print files
                        else:
                            params, files = get_instance_static(chal.id)

                        assert isinstance(params, collections.Mapping)
                        assert isinstance(files, collections.Iterable)
                    except:
                        instance_log = logging.getLogger('instancing')
                        instance_log.exception("instancing error while generating "
                                               "chal list in challenge #{} "
                                               "({})".format(chal.id, item['name']))
                        continue

                    item['name'] = Template(item['name']).render(params)
                    item['description'] = Template(item['description']).render(params)
                    item['files'] = files

            db.session.close()
            response.set_data(json.dumps({'game' : game}))
            return response
    
        return wrapper

    def file_handler_decorator(file_handler_func):
        @wraps(file_handler_func)
        def wrapper(path):
            try:
                return file_handler_func(path)
            except NotFound:
                f = Files.query.filter_by(location=path).first_or_404()

                if f.generated:
                    logger_instancing = logging.getLogger('instancing')
                    logger_instancing.info("Creating file "+f.location)
                    chal = Challenges.query.filter_by(id=f.chal).first_or_404()
                    try:
                        generated_file = get_file_dynamic(chal.generator, path)

                        if isinstance(generated_file, (file, StringIO, io.IOBase, str)):
                            return send_file(generated_file,
                                             attachment_filename=os.path.basename(path),
                                             as_attachment=True)
                        else:
                            raise TypeError("Non-file or filename output of {}. Actual type '{}'"
                                            .format(generator.__name__, generated_file.__class__.__name__))
                    except Exception as e:
                        logger = logging.getLogger('instancing')
                        logger.exception("file request for '{}' failed".format(path))
                        return make_response("File {} unavailable.".format(path), 501)
            
                raise
        return wrapper

    def admin_chals_decorator(admin_chals_func):
        @wraps(admin_chals_func)
        def wrapper(*args, **kwargs):
            response = admin_chals_func(*args, **kwargs)
            if request.method == "POST":
                # Determine if the ouptut is the challenges versus something else
                try:
                    game = json.loads(response.get_data())['game']
                except (ValueError, KeyError):
                    return response
                

                columns = ('id','instanced','generated','generator')
                chals = Challenges.query.add_columns(*columns).all()
                chals = dict((c.id, c) for c in chals)

                for item in game:
                    chal = chals[item['id']]
                    item['instanced'] = chal.instanced
                    item['generated'] = chal.generated
                    item['generator'] = chal.generator
            
                db.session.close()
                response.set_data(json.dumps({'game' : game}))
            return response
        return wrapper

    def admin_update_chal_decorator(admin_update_chal_func):
        @wraps(admin_update_chal_func)
        def wrapper(*args, **kwargs):
            response = admin_update_chal_func(*args, **kwargs)
            
            challenge = Challenges.query.filter_by(id=request.form['id']).first_or_404()
            print challenge.name
            challenge.instanced = 'instanced' in request.form

            db.session.commit()
            db.session.close()
            return response
        return wrapper

    app.view_functions['challenges.chals'] = chals_decorator(app.view_functions['challenges.chals'])
    app.view_functions['admin_challenges.admin_chals'] = admin_chals_decorator(app.view_functions['admin_challenges.admin_chals'])
    app.view_functions['admin_challenges.admin_update_chal'] = admin_update_chal_decorator(app.view_functions['admin_challenges.admin_update_chal'])
    app.view_functions['views.file_handler'] = file_handler_decorator(app.view_functions['views.file_handler'])
    challenges.CHALLENGE_CLASSES[InstancedChallenge.id] = InstancedChallenge
    app.register_blueprint(instancing)

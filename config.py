import os

def config(app):
    '''
    GENERATOR_FOLDER is the location of the scripts which generated challenge instances.
    The default destination is the CTFd/generators folder.
    '''
    app.config['GENERATOR_FOLDER'] = os.path.normpath('generators')

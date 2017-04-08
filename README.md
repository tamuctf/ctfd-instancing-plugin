# ctfd-instancing-plugin
A plugin for CTFd to facilitate generating and serving unique problem instances to compeitors

### Install instructions

The install of this plugin is not entirely intuitive. This is partly because the CTFd plugin mechanics are in flux. I will make this plugin a bit simpler when those mechanics are settled. In the meantime it's not too hard either

1. `git clone` this repo into the CTFd/plugins directory
2. Move the `models.patch` file into the base directory or your CTFd repo
3. Run `git apply --check models.patch` to add the instancing models and suppress flask migrations
4. Move the `template/user` and `template/admin` files into `CTFd/static/<theme>/js/templates/challenges/instanced` and `CTFd/static/admin/js/templates/challenges/instanced` respectively, where `<theme>` is your theme ('origonal' by default)

Boot everything up and you should be good to go!

var reg = require('cla/reg');

reg.register('action.admin.variables', { name: 'Manage Variables' });

reg.register('menu.admin.variables', {
    title: _('Variables'),
    label: _('Variables'),
    icon: '/static/images/icons/admin-variable.svg',
    actions: [ 'action.admin.variables' ],
    url_comp: '/comp/var-admin.js'
});

reg.controller('list', {
    authenticate: true,
    handler: function(req, res) {

        var log = require('cla/log');
        var db = require('cla/db');
        var ci = require('cla/ci'),
            where = {},
            list = [];

        var user = req.user();

        try {

            var canEditCI = user.hasAction('action.admin.variables');

            if ( !canEditCI ) {
                throw _('Not authorized to view variables');
            }

            where = db.queryBuild(where, req.param('query'), ['varname', 'relatedStr'] );
            where[ '$or' ] = [ { projects: db.in( user.projects() ) }, { projects: [] } ];

            var rs = ci.findCi('RulebookVar', where ).sort({ varname: 1 });

            rs.forEach( function(variable) {

                var envs = variable.envs().map(function(obj) {
                    return obj.mid()
                });
                var envNames = variable.envs().map(function(obj) {
                    return obj.name()
                });

                var projects = variable.projects().map(function(obj) {
                    return obj.mid()
                });
                var projectNames = variable.projects().map(function(obj) {
                    return obj.name()
                });

                var varvalue = variable.vartype() == 'secret'
                    ? '**************************'
                    : variable.varvalue();

                list.push({
                    mid: variable.mid(),
                    varname: variable.varname(),
                    varvalue: varvalue,
                    vartype: variable.vartype(),
                    modified_date: variable.ts(),
                    project_names: projectNames,
                    projects: projects,
                    env_names: envNames,
                    envs: envs
                });
            });

            res.json({
                success: true,
                data: list,
                total: rs.count()
            });
        }
        catch(e) {
            var msg = e+'';
            res.json({
                success: false,
                reason: msg
            });
        }
    }
});

reg.controller('delete', {
    authenticate: true,
    handler: function(req, res) {

        var ci = require('cla/ci');
        var log = require('cla/log');

        try {
            var mid = req.param('mid');
            var variable = ci.load( mid );
            var varname = variable.varname();
            variable.delete();

            res.json({
                success: true,
                varname: varname,
                mid: mid
            });
        } catch (err) {
            log.error( err + '' );
            res.json({
                success: false,
                reason: err +''
            });
        }
    }
});

reg.controller('copy', {
    authenticate: true,
    handler: function(req, res) {

        var ci = require('cla/ci');
        var log = require('cla/log');

        try {
            var mid = req.param('mid');
            var variable = ci.load( mid );
            var cnt = 1;
            var varname;

            do {
                varname = variable.varname() + '-' + cnt++;
            } while( ci.findOne('RulebookVar', { varname: varname }) );

            var variableNew = ci.build('RulebookVar', {
                name: varname + '-' + Math.random(),
                varname: varname,
                vartype: variable.vartype(),
                varvalue: variable.varvalue(),
            });

            variableNew.projects( variable.projects().map(function(obj){ return obj.mid() }) || []);
            variableNew.envs( variable.envs().map(function(obj){ return obj.mid() }) || []);

            var midNew = variableNew.save();

            res.json({
                success: true,
                varname: varname,
                mid: midNew
            });
        } catch (err) {
            log.error( err + '' );
            res.json({
                success: false,
                reason: err +''
            });
        }
    }
});

reg.controller('save', {
    authenticate: true,
    handler: function(req, res) {

        var log = require('cla/log');
        var ci = require('cla/ci');

        var values = req.param('values');
        var secretChanged = req.param('secretChanged');

        var mid = values.mid;
        var isSecret = values.vartype == 'secret';

        try {

            var variable;

            values.varvalue = isSecret ? values.varSecretValue : values.varPlainValue;

            if (values.varvalue == undefined)
                values.varvalue = '';

            if (mid && mid.length) {

                if ( isSecret && !secretChanged)
                    delete values.varvalue;

                variable = ci.findCi('RulebookVar', {
                    mid: mid
                }).next();

                if (!variable) {
                    throw _('Variable %1 not found', mid);
                }

                variable.update(values);
            }
            else {
                var name = values.varname + '-' + Math.random();

                variable = ci.build('RulebookVar', {
                    name: name,
                    varname: values.varname,
                    vartype: values.vartype,
                    varvalue: values.varvalue
                });

                variable.projects(values.projects || []);
                variable.envs(values.envs || []);

                mid = variable.save();
            }

            var relatedNames = [];
            if( ! isSecret ) {
                relatedNames.push( variable.varvalue() );
            }
            variable.projects().map(function(prj) {
                relatedNames.push(prj.name())
            });
            variable.envs().map(function(env) {
                relatedNames.push(env.name())
            });
            variable.update({
                relatedStr: relatedNames.join(';')
            });

            res.json({
                success: true,
                mid: mid
            });
        } catch (err) {
            log.error( err + '' );
            res.json({
                success: false,
                reason: err+''
            });
        }
    }
});

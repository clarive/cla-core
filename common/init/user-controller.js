var reg = require('cla/reg');

reg.controller('user/projects', {
    handler: function(req, res) {
        var user = req.user();
        var ci = require('cla/ci');

        var projectMids = user.projects();
        var projects = ci.find({
            mid: {
                '$in': projectMids
            }
        }).sort({
            name: 1
        }).all();

        res.json(projects.map(function(prj) {
            return {
                mid: prj.mid,
                name: prj.name
            }
        }));
    }
});

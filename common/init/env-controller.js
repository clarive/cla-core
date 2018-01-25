var reg = require('cla/reg');

reg.controller('envs', {
    handler: function(req, res) {
        var ci = require('cla/ci');

        var cis = ci.find('bl', { bl: { '$ne': '*' } })
            .fields({ name: 1, bl: 1, mid: 1 })
            .all();

        res.json(cis);
    }
});

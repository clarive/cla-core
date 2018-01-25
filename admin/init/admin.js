var reg = require('cla/reg');

reg.controller('', {
    authenticate: true,
    handler: function(req, res) {
        return require('handler').apply(this, arguments);
    }
});

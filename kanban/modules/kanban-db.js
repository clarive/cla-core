"use strict";

var db  = require("cla/db");
var ci = require('cla/ci');

module.exports = {
    collection: db.getCollection('plugin_kanban'),
    query: function(username) {
        var groups = ci.find('user', {
            username: username
        }).fields({
            _id: 0,
            groups: 1
        }).next().groups;

        return {
            $or: [{
                creator: username
            }, {
                'settings.users': username
            }, {
                'settings.groups': db.in( groups )
            }, {
                'settings.administrators': username
            }]
        };
    }
}

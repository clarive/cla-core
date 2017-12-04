"use strict";

var db = require("cla/db");
var ci = require('cla/ci');

var kanbanDB = require('./kanban-db.js');
var utils = require('./utils.js');


function userCanEditBoard(user, id) {
    if (user.isRoot()) {
        return true;
    }

    var board = kanbanDB.find({
        id: id
    }).fields({
        _id: 0,
        creator: 1
    }).next();

    if (board && board.creator === user.username()) {
        return board;
    }

    return false;
}


var api = require('./api/index.js');
api.board = require('./api/board.js');
api.job = require('./api/job.js');
api.topic = require('./api/topic.js');


module.exports = function handler(req, res) {
    var path = req.param('path');

    if (!path) {
        var fs = require('cla/fs');
        var content = fs.slurp(__dirname + "/../static/index.html");
        res.contentType('text/html');
        res.body(content);
        return;
    }

    // api handler

    res.contentType('text/json');
    var user = req.user();

    var fn;
    var parts = path.split('/');


    if (parts.length === 1 && typeof api[parts[0]] === 'function') {
        fn = api[parts[0]];
    }
    else if (parts.length === 2 && typeof api[parts[0]] === 'object') {
        fn = api[parts[0]][parts[1]];
    }


    if (!fn) {
        res.json({
            error: 1,
            msg: 'unknow resource'
        });
        return;
    }

    try {
        var ret = fn.call(null, req, res, user);
        res.json(ret);
    } catch (e) {
        res.json({
            error: 1,
            msg: e.message
        })
    }

    return;
};

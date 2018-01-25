"use strict";

var db = require("cla/db");
var ci = require('cla/ci');
var config = require("cla/config");

/*
    api: config/save
    save config settings
 */
exports.save = function(req, res, user) {
    var configVariables = JSON.parse(req.param('config'));
    var result = config.setValues(configVariables);

    return {
        result: result
    };
};

/*
    api: config/list
    load config list
 */
exports.list = function(req, res, user) {
    var configList = config.list();
    return {
        list: configList,
    };
};

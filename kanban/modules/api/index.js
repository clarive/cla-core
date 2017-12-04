"use strict";

var db = require("cla/db");
var ci = require('cla/ci');


/*
    api: statuses
    returns all statuses
 */
exports.statuses = function(req, res) {
    var statuses = ci.find('status', {})
        .sort({
            _seq: 1
        })
        .fields({
            name: 1,
            id_status: 1,
            _id: 0,
        })
        .all();

    return statuses;
};


/*
    api: categories
    returns all categories
 */
exports.categories = function(req, res, user) {

    var categories = db.getCollection('category').find()
        .fields({
            default_form: 1,
            name: 1,
            id: 1,
            _id: 0,
            acronym: 1,
            color: 1,
            default_workflow: 1,
            statuses: 1,
            is_changeset: 1,
            is_release: 1
        }).all();

    categories.forEach(function(cat) {
        cat.form = [];
        if (!cat.default_form) return;
        cat.form = cla.model('Topic').getFieldletsFromDefaultForm(cat.default_form);
    });

    return categories || [];
};


/*
    api: users
    returns all users
 */
exports.users = function(req, res, user) {
    var users = ci.find('user', {})
        .fields({
            mid: 1,
            username: 1,
            realname: 1,
            _id: 0
        })
        .all();

    // adding avatar URL
    users.forEach(function(user) {
        user.avatar = '/user/avatar/' + user.username + '/image.png';
    });
    return users;
};


/*
    api: projects
    returns all projects
 */
exports.projects = function(req, res, user) {
    var projects = ci.find('project', {})
        .fields({
            mid: 1,
            name: 1,
            _id: 0
        })
        .all();

    return projects;
};


/*
    api: workflow
    returns next possible workflow for a user
 */
exports.workflow = function(req, res, user) {

    var category = req.param('category');
    var status = req.param('status');
    var mid = req.param('mid');

    var workflow = cla.model('Topic').nextStatusForUser(
        'username', user.username(),
        'id_category', category,
        'topic_mid', mid,
        'id_status_from', status
    );

    workflow = Array.isArray(workflow) ? workflow : [workflow];
    return workflow;
};


// this has been copied from static/ui/date.js
// and should be fixed by using more convenient way
// to use directly from clarive core
var DEFAULT_DATE_FORMAT = 'DD/MM/YYYY';
var COUNTRY_DATE_FORMATS = {
    es: 'DD/MM/YYYY',
    ru: 'DD.MM.YYYY',
    us: 'MM//DD/YYYY',
    gb: 'DD/MM/YYYY',
    za: 'YYYY/MM/DD'
};


var DEFAULT_TIME_FORMAT = 'HH:mm';
var COUNTRY_TIME_FORMATS = {
    es: 'HH:mm',
    ru: 'HH:mm',
    us: 'hh:mma',
    gb: 'HH:mm',
    za: 'HH:mm'
};

/*
    api: user_info
    returns current user permissions and prefs required for kanban operations
 */
exports.user_info = function(req, res, user) {

    var prefs = ci.find('user', {
        username: user.username()
    }).fields({  _id: 0, date_format_pref: 1, country: 1, time_format_pref: 1, ts: 1, timezone_pref: 1 }).next();

    var dateFormat = prefs.date_format_pref;
    if (dateFormat === 'format_from_local') {
        dateFormat = COUNTRY_DATE_FORMATS[prefs.country] || DEFAULT_DATE_FORMAT;
    }

    var timeFormat = prefs.time_format_pref;
    if (timeFormat === 'format_from_local') {
        timeFormat = COUNTRY_TIME_FORMATS[prefs.country] || DEFAULT_TIME_FORMAT;
    }

    return {
        prefs: {
            country: prefs.country,
            dateFormat: dateFormat,
            timeFormat: timeFormat
        },
        perm: {
            canCreateJobOutSideWindow: user.hasAction('action.job.no_cal'),
            canChangePipeLine: user.hasAction('action.job.chain_change')
        }
    }
};

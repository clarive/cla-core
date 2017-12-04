"use strict";

var db = require("cla/db");
var ci = require('cla/ci');

exports.related_changesets = function(req, res, user) {

    var mid = req.param('mid');
    var status_from = req.param('status_from');

    var config = cla.model('ConfigStore').get('config.releases');
    var depth = config.depth_level || 2;

    var relatedTopics = ci.load(mid).children(
        'where', {
            'category.is_changeset': '1',
        },
        'depth', depth,
        'docs_only', 1,
        'fields', {
            mid: 1,
            _id: 0
        }
    );

    var changesets = relatedTopics.map(function(topic) {
        return topic.mid
    })

    var topicCollection = db.getCollection('topic');

    var jobContent = topicCollection.find({
        mid: db.in( changesets ),
        'id_category_status' : status_from
    }).fields({ _id: 0, title: 1, mid: 1, '_project_security.project': 1, id_category : 1, id_category_status: 1 }).all();

    return jobContent;
}

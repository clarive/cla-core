"use strict";

var db = require("cla/db");
var ci = require('cla/ci');

var kanbanDB = require('../kanban-db.js');
var utils = require('../utils.js');

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

/*
    api: board/create
    create new board

    {
        id: 'kanban id',
        name : 'kanban name',
        creator : 'username of the creator',

        // static board cards
        cards: [],

        settings: {
            type: '[ dynamic | static ]',

            // list of users who can use the board
            users : [],

            // board lists/columns
            lists: [
                {
                    name: 'list name',

                    wip: 'work in process limit' //Number

                    // list of statuses this column related to
                    // there must be at least one status
                    statuses: [status-1, status-2, ...],
                }
            ],

            // main board filter
            filter : {
                projects: ['project-mid', ...] // list of projects,
                categories: ['1','2',...], // list of categories
                labels: [],
                modifiedOn: ['after','before'],
                createdOn: ['after','before']
            }
        }
    }
 */
exports.create = function(req, res, user, isTemp) {

    var name = req.param('name') || _("Temporary Board");
    var type = req.param('type');


    var filter = {
        mids: [],
        parent: [],
        categories: [],
        projects: [],
        statuses: [],
        labels: [],
        createdOn: ["", ""], // [after, before]
        modifiedOn: ["", ""] // [ after, before ]
    };

    // if we passed custom filters
    // most probably from a temporaty board
    if (req.param('filters')) {
        var filters = JSON.parse( req.param('filters') );
        Object.keys(filters).forEach(function(key){
            filter[key] = filters[key];
        })
    }

    var kanban = {
        name: name,
        id: isTemp ? 'temp' : utils.UUID(),
        creator: user.username(),
        cards: [],
        settings: {
            isTemp: isTemp ? 1 : 0,
            type: type || 'dynamic',
            users: [],
            lists: [],
            filter: filter,
            swimlanes: {}
        }
    };

    if (!isTemp) {
        kanbanDB.insert(kanban);
    }

    return kanban;
};


/*
    api: board/data
    returns board data
 */
exports.data = function(req, res, user) {
    var id = req.param('id');

    var username = user.username();

    var query = {
        $or: [{
            creator: username
        }, {
            'settings.users': username
        }, {
            'settings.administrators': username
        }]
    };

    if (id) {
        query.id = id;

        var board = id === 'temp' ? exports.create(req, res, user, 'temp') : kanbanDB.find(query).fields({
            _id: 0,
            cards: 0
        }).next();

        var isAdmin = user.isRoot() || board.creator === username;

        if (!isAdmin) {
            delete board.settings.users;
        }

        return {
            isAdmin: isAdmin ? 1 : 0,
            board: board
        };
    }

    var boards = kanbanDB.find(query).all();
    return boards;
};


/*
    api: board/save
    save board settings
 */
exports.save = function(req, res, user) {

    var settings = JSON.parse(req.param('settings'));
    var name = req.param('name');

    var id = req.param('id');

    var newSet = {};

    if (id === 'temp') {

        if ( settings.filter.mids && settings.filter.mids.length ) {
            newSet.cards = settings.filter.mids.map(function(mid, i){ return { mid: mid, sort: i } });
            settings.type = 'static';
            settings.filter.cards = [];
        }

        settings.isTemp = 0;
        id = exports.create(req, res, user).id;
    }

    if (!userCanEditBoard(user, id)) {
        return {
            error: 1,
            msg: _("You can't edit this board")
        }
    }


    Object.keys(settings).forEach(function(key) {
        newSet["settings." + key] = settings[key];
    });

    newSet.name = name;

    kanbanDB.update({
        id: id
    }, {
        '$set': newSet
    });

    return {
        id: id,
        name: name,
        settings: settings
    };
};


/*
    api: board/delete
    delete board
 */
exports.delete = function(req, res, user) {
    var id = req.param('id');
    if (!userCanEditBoard(user, id)) {
        return {
            error: 1,
            msg: _("You can't delete this board")
        }
    }

    kanbanDB.remove({
        id: id
    });

    return {
        success: 1
    }
};


/*
    api: board/topicsbymid
    return list of topics from mids array
 */
exports.topicsbymid = function(req, res, user) {

    var mids = JSON.parse(req.param('mids'));

    var fields = {
        mid: 1,
        title: 1,
        category_color: 1,
        id_category: 1,
        _id: 0
    };

    var query = {
        mid: db.in(mids)
    };

    var topics = db.getCollection('topic').find(query).sort({
        created_on: 1
    }).fields(fields).all();
    return topics;
};


/*
    api: board/topics
    returns board topics

    for dynamic boards it returns topics matching filters
    for static boards returns saved cards topics
 */
exports.topics = function(req, res, user) {

    var id = req.param('id');
    var customFields = req.param('fields');
    var page = req.param('page') || 1;
    var loadCards = req.param('cards');

    var board = id === 'temp' ? exports.create(req, res, user, 'temp') : kanbanDB.find({
        id: id
    }).next();

    if (!board) {
        return {
            error: 1,
            msg: _("board not found")
        }
    }

    var filter = req.param('filter') ? JSON.parse( req.param('filter') ) : board.settings.filter;
    var lists = board.settings.lists;
    var type = board.settings.type;
    var isTemp = board.settings.isTemp;

    var topicCollection = db.getCollection('topic');

    var fields = {
        mid: 1,
        title: 1,
        created_by: 1,
        created_on: 1,
        modified_on: 1,
        username: 1,
        labels: 1,
        category_color: 1,
        id_category: 1,
        id_category_status: 1,
        '_project_security.project': 1,
        is_changeset: 1,
        is_release: 1,
        _id: 0
    };

    if (customFields) {
        JSON.parse(customFields).forEach(function(field) {
            fields[field] = 1;
        });
    }

    var query = {};

    // load static board cards
    if (type === 'static' && loadCards) {
        var cards = board.cards || [];
        var cardsMids = [];
        var cardById = {};

        cards.forEach(function(card) {
            if (card.mid) {
                cardsMids.push(card.mid);
                cardById[card.mid] = card;
            }
        });

        query['mid'] = db.in(cardsMids);

        lists.forEach(function(list) {
            var statuses = db.in(list.statuses);
            query['category_status.id'] = statuses;

            var topics = topicCollection.find(query).fields(fields);
            list.total = topics.count();
            list.cards = topics.all().map(function(card) {
                var savedCard = cardById[card.mid];
                card.sort = savedCard.sort;
                return card;
            });
        });
        return lists;
    }

    if (filter.categories.length) {
        query['id_category'] = db.in(filter.categories);
    }

    if (filter.projects.length) {
        query['_project_security.project'] = db.in(filter.projects);
    }

    if (filter.statuses.length) {
        query['id_category_status'] = db.in(filter.statuses);
    }

    if (filter.labels.length) {
        query['labels'] = db.in(filter.labels);
    }

    if (filter.modifiedOn) {
        if (filter.modifiedOn[0]) {
            query['modified_on'] = query['modified_on'] || {};
            query['modified_on']["$gte"] = filter.modifiedOn[0]
        }
        if (filter.modifiedOn[1]) {
            query['modified_on'] = query['modified_on'] || {};
            query['modified_on']["$lte"] = filter.modifiedOn[1]
        }
    }

    if (filter.createdOn) {
        if (filter.createdOn[0]) {
            query['created_on'] = query['created_on'] || {};
            query['created_on']["$gte"] = filter.createdOn[0]
        }
        if (filter.createdOn[1]) {
            query['created_on'] = query['created_on'] || {};
            query['created_on']["$lte"] = filter.createdOn[1]
        }
    }

    if (filter.parent && filter.parent.length) {
        var children = db.getCollection('master_rel').find({
            from_mid: db.in(filter.parent),
            rel_type: 'topic_topic'
        }).fields({
            _id: 0,
            to_mid: 1,
            title: 1
        }).all().map(function(topic) {
            return topic.to_mid
        });

        query['mid'] = db.in(children);
    }

    if (filter.mids && filter.mids.length) {
        query['mid'] = db.in(filter.mids);
    }

    if (type === 'dynamic') {

        // this is a temproary board
        // create lists on the fly
        if (isTemp) {

            // temp boards should have mid query otherwise
            // it will try to list all topics on board
            if ( !query.mid ) return [];

            fields.category = 1;
            var topics = topicCollection.find(query).fields(fields).sort({
                modified_on: -1
            }).limit(5000);
            var statuses = [];
            var cards = {};
            var categoryStatuses = {};

            var topic;
            while (topic = topics.next()) {
                cards[topic.id_category_status] = cards[topic.id_category_status] || [];
                cards[topic.id_category_status].push(topic);
                categoryStatuses[topic.id_category] = topic.category.statuses;
            }

            Object.keys(categoryStatuses).forEach(function(key) {
                statuses = statuses.concat(categoryStatuses[key])
            });

            var lists = ci.find('status', {
                id_status: db.in(statuses)
            }).fields({
                seq: 1,
                name: 1,
                id_status: 1,
                _id: 0,
            }).all().map(function(status) {
                var statusCards = cards[status.id_status] || [];
                return {
                    seq: status.seq,
                    name: status.name,
                    wip: 0,
                    statuses: [status.id_status],
                    cards: statusCards,
                    total: statusCards.length,
                    collapsed: statusCards.length === 0 ? 1 : 0
                }
            });

            lists = lists.sort(function(a, b) {
                return Number(a.seq) - Number(b.seq);
            });

            return lists;
        }

        // or this is a normal dynamic board
        // load cards for each saved list
        lists.forEach(function(list) {

            query['category_status.id'] = db.in(list.statuses);

            var topics = topicCollection.find(query).fields(fields);
            list.total = topics.count();
            list.cards = topics.sort({
                modified_on: -1
            }).limit(1000).all();
        });

        return lists;
    } else {
        // load topics for static plan mode
        var cards = board.cards || [];

        var cardsMids = cards.map(function(card) {
            return card.mid;
        });

        // don't show already saved cards
        query['mid'] = db.nin(cardsMids);

        var topics = topicCollection.find(query).fields(fields);
        var total = topics.count();

        topics = topics.sort({
            modified_on: -1
        }).skip((page - 1) * 100).limit(100).all();

        return {
            topics: topics,
            total: total,
            page: page
        }
    }
};


function _updateTopicsWithSort(id, topics) {
    kanbanDB.update({
        id: id
    }, {
        $push: {
            cards: {
                $each: topics,
                $sort: {
                    sort: 1
                }
            }
        }
    });
}

/*
    api: board/add_cards
    adds selected cards to static board
 */
exports.add_cards = function(req, res, user) {

    var mids = JSON.parse(req.param('mids'));

    var id = req.param('id');

    if (!userCanEditBoard(user, id)) {
        return {
            error: 1,
            msg: _("You can't edit this board")
        }
    }


    var highestCardSort = 9000000;
    var cards = kanbanDB.find({ id: id }).fields({ _id: 0, cards: 1 }).next().cards;

    if (cards.length) {
        var sort = cards[ cards.length - 1 ].sort;
        if (sort > highestCardSort) {
            highestCardSort = sort + 1;
        }
    }

    var topics = mids.map( function(mid, i){
        return {
            mid: mid,
            sort: highestCardSort + (i + 1)
        }
    })

    _updateTopicsWithSort(id, topics);

    return {
        success: 1
    };
};


/*
    api: board/remove_cards
    removes cards from static board
 */
exports.remove_cards = function(req, res, user) {
    var id = req.param('id');
    var mids = JSON.parse(req.param('mids'));

    if (!userCanEditBoard(user, id)) {
        return {
            error: 1,
            msg: _("You can't edit this board")
        }
    }

    kanbanDB.update({
        id: id
    }, {
        $pull: {
            cards: {
                mid: {
                    $in: mids
                }
            }
        }
    });

    return { success: 1 }
};


/*
    api: board/update_sort
    updates cards sort
 */
exports.update_sort = function(req, res, user) {
    var id = req.param('id');
    var mid = req.param('mid');
    var sort = req.param('sort');

    kanbanDB.update({
        id: id,
        "cards.mid": mid
    }, {
        $set: {
            "cards.$.sort": parseFloat(sort)
        }
    });

    // just update topics sort
    _updateTopicsWithSort(id, []);

    return {
        success: 1
    }
}

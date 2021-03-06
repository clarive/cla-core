var reg = require('cla/reg');
var ci  = require("cla/ci");

reg.controller('', {
    authenticate: true,
    handler: function(req, res) {
        return require('handler').apply(this, arguments);
    }
});

ci.createClass("Kanban", {
    has: {
        user: {
            is: "rw",
            isa: "Str",
            required: true
        }
    },
    methods: {
        loadBoards: function () {
            var kanbanDB = require("kanban-db.js");

            var user = this.user();

            var query = kanbanDB.query(user);

            var boards = kanbanDB.collection.find(query).fields({ _id: 0, name: 1, id: 1 }).all();
            return boards;
        }
    }
});

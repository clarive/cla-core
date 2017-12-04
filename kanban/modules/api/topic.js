"use strict";

var db = require("cla/db");
var ci = require('cla/ci');

exports.update = function(req, res, user) {
    var mid = req.param('mid');
    var category = req.param('category');
    var status = req.param('status');
    var update = JSON.parse( req.param('update') );

    var updateObj = {
        action: 'update',
        topic_mid: mid,
        status: status,
        status_new: status,
        username: user.username()
    }

    if ( update.hasOwnProperty('status') ) {
        updateObj.status_new = update.status;
    }

    if ( update.hasOwnProperty('field') ) {
        var canEditField = user.hasAction('action.topicsfield.write', 'bounds', {
            id_category : category,
            id_status   : status,
            id_field    : update.field.id
        });

        if (!canEditField) {
            return {
                success: 0,
                msg: _("You don't have permission to change topic value of '%1'", update.field.id)
            }
        }

        updateObj[ update.field.id ] = update.field.val;
    }

    cla.model('Topic').update(updateObj);

    return {
        success: 1
    };
};

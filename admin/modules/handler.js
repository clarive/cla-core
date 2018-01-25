"use strict";

var apiHandler = require('api');

module.exports = apiHandler({
    config: require('./api/config.js')
});

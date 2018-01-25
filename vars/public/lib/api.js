define(function (require, exports, module) {
    function _api_call (type, isJSONBody, url, data){
        data = data || {};

        // work around for a limitation where
        // we can't use multiple conrollers in
        // clarive plugin
        if (url.indexOf('/') !== 0){
            data.path = url;
            url = '/plugin/vars';
        }

        var deferred = new $.Deferred();
        var promise = deferred.promise();

        promise.success = promise.done;
        promise.error   = promise.fail;

        if (isJSONBody) {
            if (typeof data === 'object') {
                data = JSON.stringify(data);
            }
        }

        var request = {
            url   : url,
            data  : data,
            type  : type,
            traditional: true,
            cache : false
        };

        if (isJSONBody) request.contentType = 'application/json';

        var jqxhr = $.ajax(request);

        jqxhr.done(function(data, status, xhr) {
            deferred.resolve(data, status, xhr);
        });

        jqxhr.fail(function(jqXHR, status, error) {
            deferred.reject(jqXHR, status, error);
        });

        return promise;
    }

    /**
     *  api methods exports
     */
    module.exports = {
        get: function(url, data)  { return _api_call ('GET', false, url, data) },
        post: function(url, data) { return _api_call ('POST', false, url, data) },
        postJSON: function(url, data) { return _api_call ('POST', true, url, data) }
    };
});

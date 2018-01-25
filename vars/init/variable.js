var ci = require("cla/ci");

ci.createClass("RulebookVar", {
    has_bl: 0,
    roles: [ '::EncryptAttributes' ],
    methods: {
        encrypt_attributes: function(){
            return [ 'varvalue' ]
        }
    },
    has: {
        varname: {
            is: "rw",
            isa: "Str",
            required: true
        },
        vartype: {
            is: "rw",
            isa: "Str",
            required: true
        },
        varvalue: {
            is: "rw",
            isa: "Maybe[Str]",
            required: true
        },
        relatedStr: {
            is: "rw",
            isa: "Maybe[Str]"
        }
    },
    hasParents: [
        'projects',
        'envs'
    ]
});

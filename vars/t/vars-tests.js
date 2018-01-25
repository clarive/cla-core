t = require('cla/t');

t.subtest('rulebookvar: ci test', function(){
    var db = require('cla/db');
    var ci = require('cla/ci');

    var obj ci.build( 'RulebookVar', { varname: 'foo', vartype:'secret', varvalue:'bar' });
    var mid = obj.save();

    var doc = db.getCollection('master_doc').findOne({ mid: mid });

    t.ok( doc.varvalue.length > 0 );
    t.ok( doc.varvalue !== 'bar' );
});

t.doneTesting();

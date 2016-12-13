const express = require('express');
const rdfa_parser = require('./rdfa_parser');
const rdfStore = require('rdfstore');

// var prefixes = require('./rdfa_core.json');
const router = express.Router();

const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    let text = req.body.text;

    rdfStore.create(function (err, store) {
        rdfa_parser.parseRDFa(text, store, base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/", function (output) {
            if (DEBUG) console.log(output);

            store.execute("SELECT * { ?s ?p ?o }", function (success, results) {
                
                // console.log('created triples: ' + results.length);
                var tripleCount = "created triples" + results.length.toString() + "\n";
                var triples = "";

                for (let i = 0; i < results.length; i++) {
                    // console.log("<" + results[i].s.value + "> <" + results[i].p.value + "> <" + results[i].o.value + ">");
                    triples += "<"  + results[i].s.value + "> <" + results[i].p.value + "> <" + results[i].o.value + ">\n";
                }

                res.send(tripleCount + triples);
                console.log(tripleCount + triples);
                
            });
            
        });
    });
});

module.exports = router;

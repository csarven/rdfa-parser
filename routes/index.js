const express = require('express');
const rdfa_parser = require('./rdfa_parser');
const rdfStore = require('rdfstore');

// var prefixes = require('./rdfa_core.json');
const router = express.Router();

// const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    let text = req.body.text;

    rdfStore.create(function (err, store) {

        rdfa_parser.parseRDFa(text, store, "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/", store => {
            // if (DEBUG) console.log(output);

            store.execute("SELECT * { ?s ?p ?o }", function (success, results) {

                let tripleCount = "created triples" + results.length.toString() + "\n";
                let triple = "";
                let triplesList = [];
                let sub, prä, obj, sub_id;

                // while(results.length > 0) {

                for(let i = 0; i < results.length; i++) {
                    sub = results[i].s.value.toString();
                    prä = results[i].p.value.toString();
                    obj = results[i].o.value.toString();
                    triple = "<" + sub + "> <" + prä + "> <" + obj + ">\n";
                    triplesList.push(triple);
                }

                // triplesList = triplesList.sort()
                
                triple = "";

                for(let i = 0; i < triplesList.length; i++) {
                    triple += triplesList[i];
                }

                res.send(triple);
                // console.log(tripleCount + triples);
                console.log(triple);
                
            });
        });
    });
});

module.exports = router;

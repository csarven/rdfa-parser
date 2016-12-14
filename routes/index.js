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

            store.execute("SELECT * { ?s ?p ?o }", function (success, results) {

                // let tripleCount = "created triples" + results.length.toString() + "\n";
                let triple;
                let tmp = [];
                let double;
                let sub, prä, obj;

                // for(let i = 0; i < results.length; i++) {
                //     sub = results[i].s.value.toString();
                //     prä = results[i].p.value.toString();
                //     obj = results[i].o.value.toString();
                //     triple = "<" + sub + "> <" + prä + "> <" + obj + ">\n";
                //     triplesList.push(triple);
                //     console.log(triple);
                // }

                // new structured output: TODO : just for presentation ...
                while(results.length > 0) {
                    sub = results[0].s.value.toString();
                    tmp.push("<" + sub + ">\n");

                    for(let j = 0; j < results.length; j++) {
                        let subtmp = results[j].s.value.toString();
                        if(subtmp === sub) {
                            prä = results[j].p.value.toString();
                            obj = results[j].o.value.toString();
                            double = "\t<" + prä + "> <" + obj + ">\n";
                            tmp.push(double);
                            results.splice(j, 1);
                            j--;
                        }
                    }
                }

                triple = "";
                for(let i = 0; i < tmp.length; i++) {
                    triple += tmp[i];
                }

                res.send(triple);
            });
        });
    });
});

module.exports = router;

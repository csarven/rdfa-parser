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

        rdfa_parser.parseRDFa(
            false,
            text,
            store,
            "http://webPage.at/", // TODO
            results => {
                let triple;
                let tmp = [];
                let double;
                let sub, prä, obj;

                // new structured output: TODO : just for presentation ...
                while(results.length > 0) {
                    sub = results[0].subject.nominalValue.toString();
                    tmp.push("<" + sub + ">\n");

                    for(let j = 0; j < results.length; j++) {
                        let subtmp = results[j].subject.nominalValue.toString();
                        if(subtmp === sub) {
                            prä = results[j].predicate.nominalValue.toString();
                            obj = results[j].object.nominalValue.toString();
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

module.exports = router;

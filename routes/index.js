const express = require('express');
const rdfaParser = require('../routes/rdfa_parser.js');
const parser_helper = require('../routes/parser_helper.js');

// var prefixes = require('./rdfa_core.json');

const router = express.Router();

// const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    let text = req.body.text;

    parser_helper.emptyDB()
        .then(function () {
            let html = parser_helper.getHTML(text);
            let base = "http://test/.html";
            let triples = rdfaParser.parseRDFa(html, base);

            parser_helper.insertTriples(triples)
                .then(function () {

                    parser_helper.getAllTriples()
                        .then(function (results) {
                            res.send(results);
                        })
                        .catch(function () {
                            res.send('could not recieve triples');
                        });
                })
                .catch(function () {
                    res.send('could not insert triples');
                });

        })
        .catch(function (err) {
            res.send('could not empty db');
        });
});

module.exports = router;

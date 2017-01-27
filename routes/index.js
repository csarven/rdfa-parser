const express = require('express');
const rdfaParser = require('../routes/rdfa_parser.js');
const parser_helper = require('../routes/parser_helper.js');
const crawler = require('../routes/crawler.js');

parser_helper.setLogger(true);

const router = express.Router();

// const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    let text = req.body.text;
    let depth = req.body.depth;

    parser_helper.emptyDB()
        .then(function () {

            text = text.trim();

            if(text.startsWith('http')) {

                depth = 2;

                crawler.myCrawler(text, depth, function (buffer, base) {
                    parser_helper.getHTML(buffer, function(buf) {
                        doParse(buf, base, function(out) {
                            res.send(out);
                        })
                    });

                });
            } else {
                parser_helper.getHTML(text, function(buf) {
                    doParse(buf, 'http://parser/this.html', function(out) {
                        res.send(out);
                    })
                });
            }

        })
        .catch(function (err) {
            if(err == parser_helper.dbError)
                res.send('Forgot to start the database?');
            else
                res.send(err.message);
        });
});


const doParse = function(html, base, callback) {

    let triples = rdfaParser.parseRDFa(html, base);

    parser_helper.insertTriples(triples)
        .then(function () {

            parser_helper.getAllTriples()
                .then(function (results) {
                    callback(results);
                })
                .catch(function () {
                    callback('could not recieve triples');
                });
        })
        .catch(function () {
            callback('could not insert triples');
        });
};



module.exports = router;

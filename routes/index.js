const express = require('express');
const rdfaParser = require('rdfa-parser');
const parser_helper = require('./parser_helper.js');

parser_helper.setLogger(true);

const router = express.Router();

const io = require('socket.io').listen(8008);

// const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.get('/visu', function (req, res) {
    res.render('visu', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    let database = req.body.database;
    let text = req.body.text;
    let depth = req.body.depth;

    // parser_helper.emptyDB()
    //     .then(function () {

    text = text.trim();

    if (text.startsWith('http')) {

        rdfaParser.crawler(text, depth, function (base) {
            parser_helper.getHTML(base, function (buf) {
                doParse(buf, base, database, function (out) {
                    let string = (out.length > 0 ? '#######\n# ' + base + '\n' : '');
                    for (let i = 0; i < out.length; i++) {
                        string += out[i].toString() + '\n';
                    }
                    io.emit('for_client', {data: string});
                });
            });
        }, function () {
            // on finished
            io.emit('for_client', {finished: true});
        });
    } else {
        parser_helper.getHTML(text, function (buf) {
            doParse(buf, 'http://parser/this.html', function (out) {
                res.send(out);
            })
        });
    }

    // })
    // .catch(function (err) {
    //     if(err == parser_helper.dbError)
    //         res.send('Forgot to start the database?');
    //     else
    //         res.send(err.message);
    // });
});


const doParse = function (html, base, database, callback) {

    let triples = rdfaParser.parseRDFa(html, base);

    parser_helper.insertTriples(triples, database)
        .then(function () {
            callback(triples);
        })
        .catch(function () {
            callback('could not insert triples');
        });
};

module.exports = router;

const express = require('express');
const rdfaParser = require('../routes/rdfa_parser.js');
const parser_helper = require('../routes/parser_helper.js');
const crawler = require('../routes/crawler.js');

parser_helper.setLogger(true);

const router = express.Router();

// const server = app.listen(3000, () => {
//   console.log('listening on *:3000');
// });

// const io = require('socket.io')(server);
const io = require('socket.io').listen(8008);

// io.sockets.on('connection', function (socket) {
//     socket.emit('for_client', {someData: 'if necessary'});
//     socket.on('for_server', function (data) {
//         doSomethingServerSide(data);
//     });
// });

// function doSomethingServerSide(data) {
//     console.log(data);
// }

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

                crawler.myCrawler(text, depth, function (buffer, base) {
                    parser_helper.getHTML(buffer, function(buf) {
                        doParse(buf, base, function (out) {
                            io.emit('for_client', {data: out});
                        });
                        // io.sockets.on('connection', function (socket) {
                        //     io.emit('for_client', {data: buf});
                        // });
                    });
                }, function () {
                    // on finished
                    io.emit('for_client', {finished: true});
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
                    callback('could not receive triples');
                });
        })
        .catch(function () {
            callback('could not insert triples');
        });
};

module.exports = router;

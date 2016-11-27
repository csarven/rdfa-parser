const express = require('express');
const rdfa_parser = require('./rdfa_parser');

// var prefixes = require('./rdfa_core.json');
const router = express.Router();

const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    let text = req.body.text;

    rdfa_parser.parseRDFa(text, function (output) {
        if (DEBUG) console.log(output);
        res.send(output);
    });

});

module.exports = router;

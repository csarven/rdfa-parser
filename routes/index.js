var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    var text = req.body.text;

    res.send(checkInput(text));

    parseRDFa(text);

});

var parseRDFa = function (source) {

    //
    // <<< do some magic here >>>
    //

};

var checkInput = function (source) {

    if (source.startsWith('http')) {
        return 'you entered a URL \nplease hold the line while parsing..';
    } else if (source.startsWith('file')) {
        return 'you entered a path \nplease hold the line while parsing..';
    } else if (source.startsWith('<html') || source.startsWith('<HTML')) {
        return 'you entered HTML Text \nplease hold the line while parsing..';
    } else {
        return 'could not detect input format..';
    }

};

module.exports = router;

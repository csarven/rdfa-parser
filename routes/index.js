var express = require('express');
var cheerio = require('cheerio');
var request = require('request');		// get html from url
var os = require('os');

var output = '';

var rdflib = require('rdflib');

var router = express.Router();

const spacer = ' <> '

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    var text = req.body.text;

    // res.send(checkInput(text));

    var x = parseRDFa(text);
    res.send(x);

});

var parseRDFa = function (source) {


    // request(url, function(error, response, html) {

    var $ = cheerio.load(source);

    var vocabulary;

    // only check first vocab tag for now
    $('[vocab]').first().each(function () {
        vocabulary = $(this).prop('vocab')
        console.log('Vocabulary: ' + vocabulary)
    });

    $('[typeof]').each(function () {
        var type = $(this).prop('typeof');
        var resource = '';

        // find resource
        if ($(this).prop('resource')) {
            resource = $(this).prop('resource');
        } else {
            resource = '#' + Math.random(); //TODO
        }

        var line =
            resource + spacer +
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' + spacer +
            vocabulary + type;

        // type line
        console.log(line);
        output += line + os.EOL;

        // for each sub element with a property tag
        $(this).find('[property]').each(function () {

            // get the property
            var property = $(this).prop('property');

            // get the value
            var value = '';
            if ($(this).prop('tagName') == 'A') {   // <a>
                value = $(this).prop('href');
            } else {                                // <xy> .. </xy>
                value = $(this).text().replace(/\r?\n|\r/g, "");
            }

            var line = resource + spacer + vocabulary + property + spacer + value;

            console.log(line);
            output += line + os.EOL;

        });

    });

    return output;

    // });


};

var checkInput = function (source) {

    source = source.trim();

    if (source.startsWith('http')) {
        return 'you entered a URL \nplease hold the line while parsing..';
    } else if (source.startsWith('file')) {
        return 'you entered a path \nplease hold the line while parsing..';
    } else if (source.startsWith('<') || source.startsWith('<')) {
        return 'you entered HTML Text \nplease hold the line while parsing..';
    } else {
        return 'could not detect input format..';
    }

};

module.exports = router;

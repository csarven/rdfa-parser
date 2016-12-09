var express = require('express');
var cheerio = require('cheerio');
var fs = require('fs');

var request = require('request');
var os = require('os');

var prefixes = require('./prefixes.json');
var $;

var router = express.Router();

const tripleSpacer = '>\t<';
const tripleStart = '<';
const tripleEnd = '>';

const DEBUG = typeof v8debug === 'object';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', {output: 'RDFa-parser'});
});

router.post('/', function (req, res) {

    var text = req.body.text;

    parseRDFa(text, function (output) {
        if (DEBUG) console.log(output);
        res.send(output);
    });

});

/**
 * NOTES:
 * ! vocab, resource should always be taken from closest parent
 * ! typeof has to be parsed separately as it can appear w/o property
 *
 * . prefixes needs more work -> remove vocab when prefix used...
 *
 * ? how to handle missing subject? TODO: add url to subject
 * ?    object to subject - on children - oda wie?
 * ? do we have to implement rdfa:copy -> https://www.w3.org/TR/rdfa-primer/#repeated-patterns
 */

/**
 * returns html content from file, web or plain html text
 * @param source can be URL starting with 'http' or file starting with 'file://' or plain html text
 * @param callback
 * @returns {string} html content
 */
var getHTML = function (source, callback) {

    source = source.trim();

    if (source.startsWith('http')) {						// Hier crawler einbauen
        request(source, function (error, response, html) {
            if (!error && response.statusCode == 200) {
                callback(html);
            }
        });

    } else if (source.startsWith('file://')) {
        fs.readFile(source.substr(7), 'utf-8', function (err, data) {
            if (err) throw err;
            callback(data);
        })

    } else if (source.startsWith('<') || source.startsWith('<')) {		// Wieso 2x '<' (opening tag)?
        callback(source);

    } else {
        throw new Error('could not detect input format');

    }


};

var processPrefixes = function (output, callback) {

    $('[prefix]').each(function () {
        var multiPrefixString = $(this).prop('prefix');

        multiPrefixString = multiPrefixString.replace(/:\s+/g, ':');

        var prefixStrings = multiPrefixString.split(/\s+/);

        // for (var prefixString in prefixStrings) {
        for (var i = 0; i < prefixStrings.length; i++) {

            var key = prefixStrings[i].split(':')[0];
            var value = prefixStrings[i].substr(key.length + 1);

            if (prefixes[key] != undefined && prefixes[key] != value) {
                console.log('Warning: prefix ' + key + ':' + value + ' is supposed to be ' + prefixes[key])
            }
            prefixes[key] = value;
        }
    });

    for (var prefix in prefixes) {
        if (prefixes.hasOwnProperty(prefix)) {
            if (output.contains(prefix + '\:'))
                output = output.replaceAll(prefix + '\:', prefixes[prefix]);
        }
    }

    callback(output);
};

/**
 * parses RDFa from source (may be URL, file:// or a plain html string) to triples
 * @param source
 * @param callback
 */
var parseRDFa = function (source, callback) {


    getHTML(source, function (html) {

        var output = '';
        $ = cheerio.load(html);

        var vocabulary = '';

        // only check first vocab tag for now
        // $('[vocab]').first().each(function () {
        //     vocabulary = $(this).prop('vocab')
        //     console.log('Vocabulary: ' + vocabulary)
        // });

        $('[typeof]').each(function () {
            var type = $(this).prop('typeof');
            var resource = '';

            // get the vocabulary
            vocabulary = $(this).closest('[vocab]').prop('vocab')

            // find resource
            if ($(this).prop('resource')) {
                resource = $(this).prop('resource');
            } else {
                resource = '#' + Math.random(); //TODO
            }

            var line =
                tripleStart + resource + tripleSpacer +
                'rdf:type' + tripleSpacer +
                vocabulary + type + tripleEnd;

            // type line
            output += line + os.EOL;

            // for each sub element with a property tag
            $(this).find('[property]').each(function () {

                // get the vocabulary
                if ($(this).is('[vocab]')) {
                    vocabulary = $(this).prop('vocab');
                } else {
                    var x = $(this).closest('[vocab]');
                    vocabulary = x.prop('vocab');
                }

                // get the property
                var property = $(this).prop('property');

                // get the value
                // -> if href or src exists use them instead of tag content
                var value = '';
                if ($(this).is('[href]')) {
                    value = $(this).prop('href');
                } else if ($(this).is('[src]')) {
                    value = $(this).prop('src');
                } else {
                    value = $(this).text().replace(/\r?\n|\r/g, "");
                }

                var line =
                    tripleStart + resource + tripleSpacer +
                    vocabulary + property + tripleSpacer +
                    value + tripleEnd;

                output += line + os.EOL;

            });
        });

        processPrefixes(output, function (output) {
            callback(output);
        });

    });

};

module.exports = router;

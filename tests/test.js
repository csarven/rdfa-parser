/**
 *
 * Created by roland on 11/26/16.
 */

const fs = require('fs');
const rdfstore = require('rdfstore');
const path = './cache/html5/';

const rdfaparser = require('../routes/rdfa_parser.js');

function getFiles(filter, callback) {
    let tests = [];

    fs.readdir(path, (err, files) => {
        files.forEach(file => {
            if (file.indexOf(filter) >= 0)
                tests.push(path + file);
        });
        callback(tests);
    });

}

rdfstore.create(function (err, store) {

    getFiles('.html', function (tests) {
        tests.forEach(test => {

            // console.log('parsing: ' + test);

            rdfaparser.parseRDFa('file://' + test, graph => {
                store.insert(graph);

                let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';

                let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                store.execute(sparqlQuery, (err, graph) => {
                    if (err) {
                        console.log(err);
                        throw err;
                    }
                    console.log(graph);

                });

            });


        })
    });


    // store.insert
});




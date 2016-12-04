/**
 *
 * Created by roland on 11/26/16.
 */

const fs = require('fs');
const rdfStore = require('rdfstore');
const path = './cache/html5/';

const rdfaParser = require('../routes/rdfa_parser.js');

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

// fill in the test numbers you want to run -> leave empty to run all
const testToRun = ['0001'];
// const testToRun = [];

getFiles('.html', function (tests) {
    tests.forEach(test => {

        if (testToRun.indexOf(test.split('/').slice(-1)[0].split('.')[0]) >= 0 || testToRun.length == 0) {

            rdfStore.create(function (err, store) {

                rdfaParser.parseRDFa(
                    'file://' + test,
                    store,
                    base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/",
                    store => {
                        console.log('##########################################\n' + 'running test ' + test);
                        // count triples
                        store.execute("SELECT * { ?s ?p ?o }", function (success, results) {
                            console.log('created triples: ' + results.length);
                        });

                        let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';

                        let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                        // execute query
                        store.execute(sparqlQuery, (err, passed) => {
                            if (!err) {
                                console.log('test passed: ' + passed);
                            } else {
                                console.log(err);
                                throw err;
                            }

                        });

                        store.clear();
                    }
                );

            });

        }
    });
});




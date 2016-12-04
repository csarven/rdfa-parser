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
const testToRun = ['0001', '0006'];
// const testToRun = [];

getFiles('.html', function (tests) {
    tests.forEach(test => {

        if (testToRun.indexOf(test.split('/').slice(-1)[0].split('.')[0]) >= 0 || testToRun.length == 0) {

            rdfStore.create(function (err, store) {


                rdfaParser.dummy_parseRDFa(
                    'file://' + test,
                    store,
                    base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/",
                    store => {

                        store.execute(
                            'SELECT (COUNT(*) as ?count)' +
                            'WHERE { ?s ?p ?o . }',
                            function (err, tripleCount) {

                                let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';

                                let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                                store.execute(sparqlQuery, (err, graph) => {
                                    if (err) {
                                        console.log(err);
                                        throw err;
                                    }
                                    console.log('sparql returned: ' + graph);


                                });
                            });
                    });

            });

        }
    });
});




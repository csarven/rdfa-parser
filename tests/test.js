/**
 *
 * Created by roland on 11/26/16.
 */

const fs = require('fs');
const rdfStore = require('rdfstore');
const path = './cache/html5/';

// var deasync = require('deasync');
// var cp = require('child_process');
// var exec = deasync(cp.exec);

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

            // let store1, store2;
            // let done1 = false, done2 = false;

            // rdfStore.create(function (err, store) {
            //
            //     rdfaParser.dummy_parseRDFa(
            //         'file://' + test,
            //         store,
            //         base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/",
            //         store => {
            //             console.log('##########################################\n' + 'running test ' + test);
            //             // count triples
            //             store.execute("SELECT * { ?s ?p ?o }", function (success, results) {
            //                 console.log('created triples: ' + results.length);
            //
            //                 for (let i = 0; i < results.length; i++) {
            //                     console.log("<" + results[i].s.value + "> <" + results[i].p.value + "> <" + results[i].o.value + ">");
            //                 }
            //             });
            //
            //
            //             let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';
            //
            //             let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');
            //
            //             // execute query
            //             store.execute(sparqlQuery, (err, passed) => {
            //                 if (!err) {
            //                     console.log('test passed: ' + passed);
            //                 } else {
            //                     console.log(err);
            //                     throw err;
            //                 }
            //
            //             });
            //             store1 = store;
            //             done1 = true;
            //         }
            //     );
            // });


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

                            for (let i = 0; i < results.length; i++) {
                                console.log("<" + results[i].s.value + "> <" + results[i].p.value + "> <" + results[i].o.value + ">");
                            }
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

            // deasync.loopWhile(function () { return !done1; })
            // deasync.loopWhile(function () { return !done2; })


            // let p;


        }
    });


});




/**
 *
 * Created by roland on 11/26/16.
 *
 * TODO: somehow, store or graph is safed during more tests ... (clean every time)
 * TODO: program is not stoping ...
 *
 *
 */

const fs = require('fs');
const rdfStore = require('rdfstore');
const rdfaParser = require('../routes/rdfa_parser.js');

// var deasync = require('deasync');
// var cp = require('child_process');
// var exec = deasync(cp.exec);

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// DO NOT EDIT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
let logger = false;

let totalTestCount = 170;
let passedArr = [];
let failedArr = [];
let skippedArr = [];
let testCount = 0;
let testNumber = '';

let testMaxToRun = ['9999'];
let testToRun = [];
let testNotToRun = [];

let path = './tests/cache/html5/';
let ownTest = false;
//////////////////////////////////////////////////////////////////////////////////////////////////////
// only edit here if you want to .........

// fill in the test numbers you want to run
// testToRun = ['0008'];

// run all tests, but not these from testNotToRun
// testNotToRun = ['0014', '0017', '0033', '0048', '0050'];
// testNotToRun = ['0099'];

// run all tests < testMaxToRun
testMaxToRun = ['0092'];

// define special test directory and set ownTest = true
// path = './own/';
// ownTest = true;

// activate logger for tests
logger = true;
//////////////////////////////////////////////////////////////////////////////////////////////////////


function getTestNumber(test) {
    "use strict";
    return test.split('/').slice(-1)[0].split('.')[0];
}

function getFiles(filter, callback) {
    let tests = [];

    fs.readdir(path, (err, files) => {

        if (err) {
            console.error("Could not find files! Maybe you forgot to download the test-files?");
            console.error(">>> run download-html5.sh");
        } else {
            files.forEach(file => {
                if (file.indexOf(filter) >= 0)
                    tests.push(path + file);
            });
            callback(tests);
            totalTestCount = tests.length;
        }
    });
}


getFiles('.html', function (tests) {
// function runAll(tests) {
//     tests.forEach(test => {
    for (let i = 0; i < tests.length; i++) {
        let test = tests[i];
        let testNumber = getTestNumber(test);
        if (ownTest ||
            ((testToRun.indexOf(testNumber) >= 0 || testToRun.length == 0) &&
            testNotToRun.indexOf(testNumber) < 0 &&
            testNumber <= testMaxToRun)) {

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
                    "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/",
                    store => {

                        if (logger) console.log('##########################################\n' + 'running test ' + testNumber);

                        // count triples
                        store.execute("SELECT * { ?s ?p ?o }", function (success, results) {
                            if (logger) {
                                console.log('created triples: ' + results.length);

                                for (let i = 0; i < results.length; i++) {
                                    if (results[i].o.token == "literal") {
                                        console.log("\t<" + results[i].s.value + "> <" + results[i].p.value + "> \"" + results[i].o.value + "\" .");
                                    } else {

                                        console.log("\t<" + results[i].s.value + "> <" + results[i].p.value + "> <" + results[i].o.value + "> .");
                                    }
                                }
                            }

                            if (ownTest)
                                return;

                            let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';

                            let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                            if (logger) console.log("Query: " + sparqlQuery);

                            // execute query
                            try {
                                store.execute(sparqlQuery, (err, passed) => {
                                    if (!err) {
                                        if (logger) console.log('test passed: ' + passed);

                                        if (passed)
                                            passedArr.push(testNumber);
                                        else
                                            failedArr.push(testNumber);

                                        testCount++;

                                    } else {
                                        console.log(err);
                                        // throw err;
                                    }

                                    printResult();
                                    store.clear();
                                });
                            } catch (err) {
                                testCount++;
                                failedArr.push(testNumber);
                                console.error("Query-error:" + err);
                            }

                        });

                    }
                );

            });

        } else {
            skippedArr.push(getTestNumber(test));
            testCount++;
        }

    }

});


function printResult() {
    "use strict";
    if (testCount == totalTestCount) {
        let done = passedArr.length + failedArr.length;
        let skipped = testCount - done;

        console.log("=====================================================================");
        console.log("Tryed " + done + " tests (passed:" + passedArr.length + " || failed:" + failedArr.length + ") skipped: " + skipped + " of total: " + testCount);
        if (failedArr.length > 0) console.log("\n>>> failed: " + failedArr);
        if (skippedArr.length > 0) console.log("\n>>> skipped: " + skippedArr);
        if (skipped != skippedArr.length) console.log("oha");
        console.log("=====================================================================");
    }
}
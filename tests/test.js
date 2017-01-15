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
const $rdf = require('rdflib');
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

let testMaxToRun = ['9999'];
let testToRun = [];
let testNotToRun = [];

let path = './tests/cache/html5/';
let ownTest = false;
//////////////////////////////////////////////////////////////////////////////////////////////////////
// only edit here if you want to .........

// fill in the test numbers you want to run
testToRun = ['0001'];

// run all tests, but not these from testNotToRun
// testNotToRun = ['0014', '0017', '0033', '0048', '0050'];
// testNotToRun = ['0099'];

// run all tests < testMaxToRun
testMaxToRun = ['0050'];

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

            // rdfStore.create(function (err, store) {

            let store = $rdf.graph();

            rdfaParser.parseRDFa(
                'file://' + test,
                store,
                "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/" + testNumber + ".html",
                store => {

                    if (logger) console.log('##########################################\n' + 'running test ' + testNumber);

                    // count triples
                    // store.execute("SELECT * { ?s ?p ?o }", function (success, results) {

                    let triples = store.statementsMatching(undefined, undefined, undefined)

                    if (logger) {
                        console.log('created triples: ' + triples.length);

                        for (let i = 0; i < triples.length; i++) {

                            let s, p, o;

                            if (triples[i].subject.termType == 'BlankNode')
                                s = triples[i].subject.value;
                            else
                                s = '<' + triples[i].subject.value + '>';

                            p = '<' + triples[i].predicate.value + '>';

                            if (triples[i].object.termType == 'Literal') {
                                o = '"' + triples[i].object.value + '"';
                                if (triples[i].object.type)
                                    o += '^^<' + triples[i].object.type + '>';

                            } else if (triples[i].object.termType == 'BlankNode') {
                                o = triples[i].object.value;

                            } else {
                                o = '<' + triples[i].object.value + '>';
                            }
                            o += ' .';

                            console.log('\t' + s + ' ' + p + ' ' + o);
                        }
                    }

                    if (ownTest)
                        return;

                    let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';

                    let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                    if (logger) console.log('Query: ' + sparqlQuery);

                    // execute query
                    try {
                        let query = $rdf.SPARQLToQuery(sparqlQuery, false, store);

                        if (query instanceof Error) {
                            throw query;
                        }

                        let something = false;

                        store.query(query, function(result) {
                            console.log(result);
                            something = true;
                        }, undefined, function () {
                            console.log('result: ' + something);
                        });


                        // store.execute(sparqlQuery, (err, passed) => {
                        //     if (!err) {
                        //         if (logger) console.log('test passed: ' + passed);
                        //
                        //         if (passed)
                        //             passedArr.push(testNumber);
                        //         else
                        //             failedArr.push(testNumber);
                        //
                        //         testCount++;
                        //
                        //     } else {
                        //         console.log(err);
                        //         // throw err;
                        //     }
                        //
                        //     printResult();
                        //     store.clear();
                        // });
                    } catch (err) {
                        testCount++;
                        failedArr.push(testNumber);
                        console.error('Query-error:' + err);
                    }


                    // });

                }
            );

            // });

        } else {
            skippedArr.push(getTestNumber(test));
            testCount++;
        }

    }

})
;


function printResult() {
    "use strict";
    if (testCount == totalTestCount) {
        let done = passedArr.length + failedArr.length;
        let skipped = testCount - done;

        console.log("=====================================================================");
        console.log("-- ignored FILTER statements");
        console.log("Tried " + done + " tests (passed:" + passedArr.length + " || failed:" + failedArr.length + ") skipped: " + skipped + " of total: " + testCount);
        if (failedArr.length > 0) console.log("\n>>> failed: " + failedArr);
        if (skippedArr.length > 0) console.log("\n>>> skipped: " + skippedArr);
        if (skipped != skippedArr.length) console.log("oha");
        console.log("=====================================================================");
    }
}
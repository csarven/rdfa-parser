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
const rdf = require('rdf');
const stardog = require('stardog');
const rdfaParser = require('../routes/rdfa_parser.js');

rdf.setBuiltins();

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// DO NOT EDIT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
let logger = false;

let totalTestCount = 170;
let passedArr = [];
let failedArr = [];
let skippedArr = [];
let testCount = 0;

let testMaxToRun = ['9999'];
let testMinToRun = ['0000'];
let testToRun = [];
let testNotToRun = [];

let path = './cache/html5/';
let ownTest = false;

const db_name = 'test_db';
const db = new stardog.Connection();
db.setEndpoint('http://localhost:5820/');
db.setCredentials('admin', 'admin');
//////////////////////////////////////////////////////////////////////////////////////////////////////
// only edit here if you want to .........

// fill in the test numbers you want to run
// testToRun = ['0063'];

// run all tests, but not these from testNotToRun
// testNotToRun = ['0014', '0017', '0033', '0048', '0050'];
// testNotToRun = ['0099'];

// run all tests < testMaxToRun
// testMinToRun = ['0000'];
// testMaxToRun = ['0300'];

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

function getTests(filter, callback) {
    let tests = [];

    fs.readdir(path, (err, files) => {

        if (err) {
            console.error("Could not find files! Maybe you forgot to download the test-files?");
            console.error(">>> run download-html5.sh");
        } else {
            files.forEach(file => {
                if (file.indexOf(filter) >= 0) {

                    let testNumber = getTestNumber(file);
                    if (ownTest ||
                        ((testToRun.indexOf(testNumber) >= 0 || testToRun.length == 0) &&
                        testNotToRun.indexOf(testNumber) < 0 &&
                        testNumber <= testMaxToRun &&
                        testNumber >= testMinToRun)) {

                        tests.push(path + file);
                    } else {
                        skippedArr.push(getTestNumber(file));
                    }

                }
            });
            callback(tests);
            totalTestCount = tests.length;
        }
    });
}

/**
 * returns html content from file, web or plain html text
 * @param source can be URL starting with 'http' or file starting with 'file://' or plain html text
 * @returns {string} html content
 */
const getHTML = function (source) {

    source = source.trim();

    if (source.startsWith('http')) {
        /*
         request(source, function (error, response, html) {
         if (!error && response.statusCode == 200) {
         callback(html);
         }
         });
         */
        crawler(source, 2, callback);

    } else if (source.startsWith('./')) {
        //noinspection JSUnresolvedFunction
        return fs.readFileSync(source, 'utf-8');

    } else if (source.startsWith('<') && source.endsWith('>')) {
        // throw new Error('plain html not possible atm..');
        return source;

    } else {
        throw new Error('could not detect input format');

    }


};

function doTest(tests, i) {

    // for (let i = 0; i < tests.length; i++) {
    let test = tests[i];

    emptyDB(db)
        .then(function () {

            let testNumber = getTestNumber(test);
            let html = getHTML(test);
            let base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/" + testNumber + ".html";

            let triples = rdfaParser.parseRDFa(
                html,
                base);

            if (ownTest)
                return;

            insertTriples(triples)
                .then(function () {


                        let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';
                        let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                    if (logger) {
                        console.log('##########################################\n' + 'running test ' + testNumber);
                        console.log("created " + triples.length + " triples:");
                    }
                    // console.log(triplesToString(triples));
                    getAllTriples(db)
                        .then(function (data) {
                            if (logger) {
                                for (let i = 0; i < data.length; i++) {
                                    console.log(data[i].s.value.toNT() + " " + data[i].s.value.toNT() + " " + data[i].s.value.toNT());
                                }
                                console.log('Query: ' + sparqlQuery);
                            }

                            executeQuery(db, sparqlQuery)
                                .then(function () {
                                    passedArr.push(testNumber);
                                    if (logger) console.log('passed test: ' + testNumber);
                                    printResult();
                                    if (++i < tests.length) doTest(tests, i);

                                })
                                .catch(function (e) {
                                    console.log(e);
                                    failedArr.push(testNumber);
                                    printResult();
                                    if (++i < tests.length) doTest(tests, i);
                                });
                        })


                })

                .catch(function (e) {
                    console.log(e);
                    failedArr.push(testNumber);
                    printResult();
                    if (++i < tests.length) doTest(tests, i);
                });

        })
        .catch(function () {
            console.log('Error: could not empty db');
            failedArr.push(getTestNumber(test));
            printResult();
            if (i++ < tests.length) doTest(tests, i);
        });


// }

}

function triplesToString(triples) {
    let retVal = '';

    for (let i = 0; i < triples.length; i++) {
        retVal += triples[i].toString() + '\n';
    }
    return retVal
}

let i = 0;
// main...
getTests('.html', function (tests) {
    doTest(tests, i)

});

function executeQuery(db, sparqlQuery) {
    return new Promise(function (resolve, reject) {
        // execute query
        db.query(
            {
                database: db_name,
                query: sparqlQuery
            }, (data) => {
                let passed = data.boolean;

                if (passed)
                    resolve();
                else
                    reject();

            }
        );
    });
}

function insertTriples(triples) {
    return new Promise(function (resolve, reject) {

        let q = 'INSERT DATA { ' + triplesToString(triples) + ' }';

        db.query(
            {
                database: db_name,
                query: q,
                limit: 100
            }, function (data, response) {
                if (!response || response.statusCode != 200) {
                    reject('ERROR could not insert triples: \n\t' + data);
                } else {
                    resolve();
                }
            }
        );
    });
}

function getAllTriples(db) {
    return new Promise(function (resolve, reject) {
        db.query(
            {
                database: db_name,
                query: 'SELECT * { ?s ?p ?o }',
                limit: 100
            }, function (data, response) {
                if (response.statusCode == 200) {
                    resolve(data.results.bindings);
                } else {
                    reject();
                }
            });
    });
}

function emptyDB(db) {
    return new Promise(function (resolve, reject) {

        db.query(
            {
                database: db_name,
                query: 'DELETE {?s ?p ?o} WHERE {?s ?p ?o}'
            },
            function (data, response) {
                if (data.boolean) {
                    resolve();
                } else {
                    reject();
                }
            }
        );

    });
}


function printResult() {
    "use strict";
    // if (testCount == totalTestCount) {
        let done = passedArr.length + failedArr.length;
        let skipped = testCount - done;

        console.log("=====================================================================");
    console.log("Tried " + done + " tests (passed:" + passedArr.length + " || failed:" + failedArr.length); //+ ") skipped: " + skipped + " of total: " + testCount);
        if (passedArr.length > 0) console.log("\n>>> passed: " + passedArr);
        if (failedArr.length > 0) console.log(">>> failed: " + failedArr);
        if (skippedArr.length > 0) console.log(">>> skipped: " + skippedArr);
        if (skipped != skippedArr.length) console.log("oha");
        console.log("=====================================================================");
    // }
}
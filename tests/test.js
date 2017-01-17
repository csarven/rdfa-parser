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
const stardog = require('stardog');
const rdfaParser = require('../routes/rdfa_parser.js');

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

let path = './cache/html5/';
let ownTest = false;

const db_name = 'test_db';
const db = new stardog.Connection();
db.setEndpoint('http://localhost:5820/');
db.setCredentials('tester', 'tester');
//////////////////////////////////////////////////////////////////////////////////////////////////////
// only edit here if you want to .........

// fill in the test numbers you want to run
// testToRun = ['0033'];

// run all tests, but not these from testNotToRun
// testNotToRun = ['0014', '0017', '0033', '0048', '0050'];
// testNotToRun = ['0099'];

// run all tests < testMaxToRun
testMaxToRun = ['0053'];

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


// main...
getFiles('.html', function (tests) {
    for (let i = 0; i < tests.length; i++) {
        let test = tests[i];
        let testNumber = getTestNumber(test);
        if (ownTest ||
            ((testToRun.indexOf(testNumber) >= 0 || testToRun.length == 0) &&
            testNotToRun.indexOf(testNumber) < 0 &&
            testNumber <= testMaxToRun)) {

            emptyDB(db);

            let html = getHTML(test);
            let base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/" + testNumber + ".html";

            rdfaParser.parseRDFa(
                html,
                base,
                function (triples) {

                    console.log("created " + triples.length + " triples:");
                    if (logger) console.log(triplesToString(triples));

                    console.log('insert into db');
                    insertTriples(triples, function () {

                        if (logger) console.log('##########################################\n' + 'running test ' + testNumber);

                        if (ownTest)
                            return;

                        let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';

                        let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                        if (logger) console.log('Query: ' + sparqlQuery);

                        // execute query
                        try {
                            db.query(
                                {
                                    database: db_name,
                                    query: sparqlQuery
                                }, (data) => {

                                    let passed = data.boolean;

                                    if (logger) console.log('test passed: ' + passed);

                                    if (passed)
                                        passedArr.push(testNumber);
                                    else
                                        failedArr.push(testNumber);

                                    testCount++;

                                    printResult();
                                });
                        } catch (err) {
                            testCount++;
                            failedArr.push(testNumber);
                            console.error('Query-error:' + err);
                        }
                    });
                }
            );

        } else {
            skippedArr.push(getTestNumber(test));
            testCount++;
        }

    }

});

function triplesToString(triples) {
    let retVal = '';

    for (let i = 0; i < triples.length; i++) {
        retVal += triples[i].toString() + '\n';
    }
    return retVal
}

function insertTriples(triples, callback) {

    let q = 'INSERT DATA { ' + triplesToString(triples) + ' }';

    db.query(
        {
            database: db_name,
            query: q,
            limit: 100
        }, function (data, response) {
            if (response.statusCode != 200) {
                console.log('ERROR could not insert triples: \n\t' + data);
            } else {
                console.log('inserted triples');
                callback();
            }
        }
    );
}

// function getAllTriples(db) {
//
//     db.query(
//         {
//             database: db_name,
//             query: 'SELECT * { ?s ?p ?o }',
//             limit: 100
//         }, function (data) {
//             if (logger) {
//                 console.log('created triples: ' + results.length);
//
//
//             }
//         });
// }

function emptyDB(db) {
    db.query(
        {
            database: db_name,
            query: 'DELETE {?s ?p ?o} WHERE {?s ?p ?o}'
        },
        function (data) {
            if (!data.boolean) {
                console.log('ERROR: could not empty db');
            }
        }
    );
}


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
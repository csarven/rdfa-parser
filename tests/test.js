/**
 *
 * Created by roland on 11/26/16.
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
let dbError = 'DB-ERROR';

let totalTestCount = 170;
let passedArr = [];
let failedArr = [];
let skippedArr = [];
let testCount = 0;

let testMaxToRun = ['9999'];
let negativeTests = ['0107', '0122', '0140', '0311'];
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
// testToRun = ['0065'];

// run all tests, but not these from testNotToRun
testNotToRun = [
    '0065', '0176' // js
    ,'0218', '0219', '0220', '0221', '0224', '0225' // inlist
    ,'0266', '0267', '0268' // reflexivity
];


// run all tests < testMaxToRun
// testMinToRun = ['0200'];
// testMaxToRun = ['0000'];

// define special test directory and set ownTest = true
// path = './own/';
// ownTest = true;

// activate logger for tests
logger = false;

// activate logger for parser
rdfaParser.setLogger(false);
//////////////////////////////////////////////////////////////////////////////////////////////////////

function doTest(tests, i) {

    let test = tests[i];

    if (!test) {
        console.log('no test to run');
        return;
    }

    emptyDB(db)
        .then(function () {

            let testNumber = getTestNumber(test);
            let html = getHTML(test);
            let base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/" + testNumber + ".html";

            if(logger) console.log('########################################################### ' + 'Test ' + testNumber + ' ###########################################################');

            let triples = rdfaParser.parseRDFa(html, base);

            if (ownTest)
                return;

            if(logger) console.log('#################################################################################################################################');

            insertTriples(triples)
                .then(function () {

                    let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';
                    let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                    getAllTriples(db)
                        .then(function () {

                            executeQuery(db, sparqlQuery)
                                .then(function () {
                                    passedArr.push(testNumber);
                                    if (logger) console.log('>>> passed test: ' + testNumber);
                                    next(tests, i);

                                })
                                .catch(function () {
                                    if (negativeTests.indexOf(testNumber) >= 0) {
                                        if (logger) console.log('>>> passed negative test: ' + testNumber);
                                        passedArr.push(testNumber);
                                    } else {
                                        if(logger) console.log('>>> failed test: ' + testNumber);
                                        failedArr.push(testNumber);
                                    }
                                    next(tests, i);
                                });
                        })
                        .catch(function () {
                            failedArr.push(getTestNumber(tests[i]));
                            next(tests, i);
                        });
                })
                .catch(function () {
                    failedArr.push(getTestNumber(tests[i]));
                    next(tests, i);
                });

        })
        .catch(function (err) {
            if(!err.equals(dbError)) {
                failedArr.push(getTestNumber(tests[i]));
                console.error(err);
                next(tests, i);
            }
        })
}

function next(tests, i) {
    "use strict";
    if (++i < tests.length) doTest(tests, i);
    else printResult();
}

function getTestNumber(test) {
    "use strict";
    return test.split('/').slice(-1)[0].split('.')[0];
}

function getTests(filter, callback) {
    let tests = [];

    fs.readdir(path, (err, files) => {

        if (err) {
            console.error('Could not find files! Maybe you forgot to download the test-files?');
            console.error('>>> run download-html5.sh');
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

function triplesToString(triples) {
    let retVal = '';

    for (let i = 0; i < triples.length; i++) {
        retVal += triples[i].toString() + '\n';
    }
    return retVal
}

function executeQuery(db, sparqlQuery) {
    if(logger) console.log(sparqlQuery);

    return new Promise(function (resolve, reject) {
        // execute query
        db.query(
            {
                database: db_name,
                query: sparqlQuery
            }, (data) => {
                let result = data.boolean;

                if (result)
                    resolve();
                else
                    reject();
            }
        );
    });
}

function insertTriples(triples) {
    return new Promise(function (resolve, reject) {

        let q = 'INSERT DATA {\n\t' + triplesToString(triples) + ' }';

        db.query(
            {
                database: db_name,
                query: q,
                limit: 100
            }, function (data, response) {
                if (!response || response.statusCode != 200) {
                    reject('ERROR could not insert triples: \n\t' + data);
                } else {
                    if(logger) {
                        console.log(q + '\n');
                        console.log('>>> Created ' + triples.length + ' triple(s)');
                    }
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
                query: 'SELECT * { ?s ?p ?o}',
                limit: 100
            }, function (data, response) {
                if (response.statusCode == 200) {
                    if (logger) printDbResponse(data.results.bindings);
                    resolve();
                } else {
                    if(logger) console.error('Could not read triples');
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
            function (data) {
                if (data.boolean) {
                    resolve();
                } else {
                    console.error('Could not empty db!');
                    console.error('Maybe you forgot to start the database?');
                    console.error('>>> run run_server.sh');
                    reject(dbError);
                }
            }
        );
    });
}

function printResult() {
    "use strict";
    let done = passedArr.length + failedArr.length;
    let skipped = testCount - done;

    console.log('=====================================================================');
    console.log('Tried ' + done + ' tests (passed:' + passedArr.length + ' || failed:' + failedArr.length + ' || skipped: ' + skippedArr.length + ')');

    process.stdout.write('\n>>> passed:\t\t');
    for(let i = 0; i < passedArr.length - 1; i++) {
        if((i % 20) == 0 && i != 0) process.stdout.write('\n\t\t\t\t');
        process.stdout.write(passedArr[i] + ',');
    }

    process.stdout.write(passedArr[passedArr.length-1] + '\n');
    
    if (failedArr.length > 0) console.log('\n>>> failed:\t\t' + failedArr);
    if (skippedArr.length > 0) console.log('\n>>> skipped:\t' + skippedArr);
    console.log('=====================================================================');
}

function printDbResponse(results) {

    console.log('>>> Database-state: ');

    for (let i = 0; i < results.length; i++) {

        let s, p, o;

        if (results[i].s.type == 'bnode')
            s = '_:' + results[i].s.value;
        else
            s = '<' + results[i].s.value + '>';

        p = '<' + results[i].p.value + '>';

        if (results[i].o.type == 'literal') {
            o = '"' + results[i].o.value + '"';
            if (results[i].o.datatype) {
                o += '^^<' + results[i].o.datatype + '>';
            }
            if (results[i].o['xml:lang']) {
                o += '@' + results[i].o['xml:lang'];
             }

        } else if (results[i].o.type == 'bnode') {
            o = '_:' + results[i].o.value;

        } else {
            o = '<' + results[i].o.value + '>';
        }
        o += ' .';

        console.log('\t' + s + ' ' + p + ' ' + o);
    }

    console.log("\n");
}

// main...
let i = 0;
getTests('.html', function (tests) {
    doTest(tests, i)

});

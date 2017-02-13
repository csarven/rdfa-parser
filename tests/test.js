/**
 *
 * Created by roland on 11/26/16.
 *
 */

const fs = require('fs');
const rdf = require('rdf');
const rdfaParser = require('rdfa-parser');
const parser_helper = require('../routes/parser_helper.js');

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
let negativeTests = ['0107', '0122', '0140', '0311'];
let testMinToRun = ['0000'];
let testToRun = [];
let testNotToRun = [];

let path = './tests/cache/';
let database = 'test_db';

//////////////////////////////////////////////////////////////////////////////////////////////////////
// only edit here if you want to .........
let hostLanguage = 'html5';

// fill in the test numbers you want to run
testToRun = ['0001'];

// run all tests, but not these from testNotToRun
testNotToRun = [
    '0065', '0176' // js
    , '0218', '0219', '0220', '0221', '0224', '0225' // inlist
    , '0266', '0267', '0268' // reflexivity
];

// run all tests < testMaxToRun
// testMinToRun = ['0325'];
// testMaxToRun = ['0100'];

// activate logger for tests
logger = true;
parser_helper.setLogger(logger);

// activate logger for parser
//////////////////////////////////////////////////////////////////////////////////////////////////////

function doTest(tests, i) {

    let test = tests[i];

    if (!test) {
        console.log('no test to run');
        return;
    }

    parser_helper.emptyDB(database)
        .then(function () {

            let testNumber = getTestNumber(test);
            parser_helper.getHTML(test, function (html) {
                let base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/" + hostLanguage + "/" + testNumber + ".html";

                if (logger) console.log('########################################################### ' + 'Test ' + testNumber + ' ###########################################################');

                let triples = rdfaParser.parseRDFa(html, base, logger);

                if (logger) console.log('#################################################################################################################################');

                parser_helper.insertTriples(triples, database)
                    .then(function () {

                        let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';
                        let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                        parser_helper.getAllTriples(database)
                            .then(function () {

                                parser_helper.executeQuery(sparqlQuery, database)
                                    .then(function () {
                                        if (negativeTests.indexOf(testNumber) >= 0) {
                                            if (logger) console.log('>>> failed negative test: ' + testNumber);
                                            failedArr.push(testNumber);
                                        } else {
                                            if (logger) console.log('>>> passed test: ' + testNumber);
                                            passedArr.push(testNumber);
                                        }
                                        next(tests, i);

                                    })
                                    .catch(function () {
                                        if (negativeTests.indexOf(testNumber) >= 0) {
                                            if (logger) console.log('>>> passed negative test: ' + testNumber);
                                            passedArr.push(testNumber);
                                        } else {
                                            if (logger) console.log('>>> failed test: ' + testNumber);
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
            });

        })
        .catch(function (err) {
            if (!err.equals(parser_helper.dbError)) {
                failedArr.push(getTestNumber(tests[i]));
                console.error(err);
                next(tests, i);
            }
        })
}

function next(tests, i) {
    if (++i < tests.length) doTest(tests, i);
    else printResult();
}

function getTestNumber(test) {
    return test.split('/').slice(-1)[0].split('.')[0];
}

function getTests(filter, callback) {
    let tests = [];

    let fullpath = path + hostLanguage + '/';
    fs.readdir(fullpath, (err, files) => {

        if (err) {
            console.error(err.message);
            console.error('Maybe you forgot to download the test-files?');
            console.error('>>> run download-html5.sh');
        } else {
            files.forEach(file => {
                if (file.indexOf(filter) >= 0) {

                    let testNumber = getTestNumber(file);
                    if ((testToRun.indexOf(testNumber) >= 0 || testToRun.length == 0) &&
                        testNotToRun.indexOf(testNumber) < 0 &&
                        testNumber <= testMaxToRun &&
                        testNumber >= testMinToRun) {
                        tests.push(fullpath + file);
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


function printResult() {
    let done = passedArr.length + failedArr.length;
    let skipped = testCount - done;

    console.log('===================================================================================================================================');
    console.log('>>> Tried ' + done + ' tests (passed:' + passedArr.length + ' || failed:' + failedArr.length + ' || skipped: ' + skippedArr.length + ')');
    printArray('passed', passedArr);
    printArray('failed', failedArr);
    printArray('skipped', skippedArr);
    console.log('\n===================================================================================================================================');
}

function printArray(info, arr) {
    "use strict";
    process.stdout.write('\n>>> ' + info + ':\t');
    if(info.length <= 6) process.stdout.write('\t');

    if(arr.length == 0) return 'EMPTY';

    for (let i = 0; i < arr.length - 1; i++) {
        if ((i % 20) == 0 && i != 0) process.stdout.write('\n\t\t\t\t');
        process.stdout.write(arr[i] + ',');
    }

    process.stdout.write(arr[arr.length - 1]);
}

// main...
let i = 0;
getTests('.html', function (tests) {
    doTest(tests, i)

});

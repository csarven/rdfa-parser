/**
 *
 * Created by roland on 11/26/16.
 *
 */

const fs = require('fs');
const rdf = require('rdf');
const rdfaParser = require('../routes/rdfa_parser.js');
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

let path = './cache/html5/';

//////////////////////////////////////////////////////////////////////////////////////////////////////
// only edit here if you want to .........

// fill in the test numbers you want to run
// testToRun = ['0301'];

// run all tests, but not these from testNotToRun
testNotToRun = [
    '0065', '0176' // js
    ,'0218', '0219', '0220', '0221', '0224', '0225' // inlist
    ,'0266', '0267', '0268' // reflexivity
];

// run all tests < testMaxToRun
// testMinToRun = ['0200'];
// testMaxToRun = ['0100'];

// activate logger for tests
logger = true;
parser_helper.setLogger(logger);

// activate logger for parser
rdfaParser.setLogger(false);
//////////////////////////////////////////////////////////////////////////////////////////////////////

function doTest(tests, i) {

    let test = tests[i];

    if (!test) {
        console.log('no test to run');
        return;
    }

    parser_helper.emptyDB()
        .then(function () {

            let testNumber = getTestNumber(test);
            parser_helper.getHTML(test, function(html) {
                let base = "http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/" + testNumber + ".html";

                if (logger) console.log('########################################################### ' + 'Test ' + testNumber + ' ###########################################################');

                let triples = rdfaParser.parseRDFa(html, base);

                if (logger) console.log('#################################################################################################################################');

                parser_helper.insertTriples(triples)
                    .then(function () {

                        let sparqlFilename = test.substring(0, test.length - 5) + '.sparql';
                        let sparqlQuery = fs.readFileSync(sparqlFilename, 'utf-8');

                        parser_helper.getAllTriples()
                            .then(function () {

                                parser_helper.executeQuery(sparqlQuery)
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
            if(!err.equals(parser_helper.dbError)) {
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

    fs.readdir(path, (err, files) => {

        if (err) {
            console.error('Could not find files! Maybe you forgot to download the test-files?');
            console.error('>>> run download-html5.sh');
        } else {
            files.forEach(file => {
                if (file.indexOf(filter) >= 0) {

                    let testNumber = getTestNumber(file);
                    if ((testToRun.indexOf(testNumber) >= 0 || testToRun.length == 0) &&
                        testNotToRun.indexOf(testNumber) < 0 &&
                        testNumber <= testMaxToRun &&
                        testNumber >= testMinToRun) {
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


function printResult() {
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

// main...
let i = 0;
getTests('.html', function (tests) {
    doTest(tests, i)

});

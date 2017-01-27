/**
 * Created by stefa on 27.01.2017.
 */

const fs = require('fs');
const stardog = require('stardog');
const request = require('request');

let dbError = 'DB-ERROR'
const db_name = 'test_db';
const db = new stardog.Connection();
db.setEndpoint('http://localhost:5820/');
db.setCredentials('admin', 'admin');

let logger = false;
function setLogger(value) {
    "use strict";
    logger = value;
}

/**
 * returns html content from file, web or plain html text
 * @param source can be URL starting with 'http' or file starting with 'file://' or plain html text
 * @returns {string} html content
 */
const getHTML = function (source, callback) {

    source = source.trim();

    if (source.startsWith('http')) {
         request(source, function (error, response, html) {
            if (!error && response.statusCode == 200) {
                callback(html);
            }
         });
    } else if (source.startsWith('file:')) {
        //noinspection JSUnresolvedFunction
        source = source.substring(5, source.length);
        callback(fs.readFileSync(source, 'utf-8'));
    } else if (source.startsWith('./')) {
        callback(fs.readFileSync(source, 'utf-8'));
    } else if (source.startsWith('<') && source.endsWith('>')) {
        // throw new Error('plain html not possible atm..');
        callback(source);

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

function executeQuery(sparqlQuery) {
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

function getAllTriples() {
    return new Promise(function (resolve, reject) {
        db.query(
            {
                database: db_name,
                query: 'SELECT * { ?s ?p ?o}',
                limit: 100
            }, function (data, response) {
                if (response.statusCode == 200) {
                    let retVal = getDbResponse(data.results.bindings);
                    if (logger) console.log(retVal);
                    resolve(retVal);
                } else {
                    if(logger) console.error('Could not read triples');
                    reject();
                }
            });
    });
}

function emptyDB() {
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


function getDbResponse(results) {

    if(logger) console.log('>>> Database-state: ');

    let retVal = '';
    let tmp = '';

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

        tmp = s + ' ' + p + ' ' + o;

        retVal += tmp + '\n';

        if(logger) console.log('\t' + tmp);
    }

    if(logger) console.log("\n");

    return retVal;
}


exports.getHTML = getHTML;
exports.emptyDB = emptyDB;
exports.getAllTriples = getAllTriples;
exports.insertTriples = insertTriples;
exports.executeQuery = executeQuery;
exports.setLogger = setLogger;
exports.dbError = dbError;
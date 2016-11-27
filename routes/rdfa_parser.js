/**
 * NOTES:
 * initial context not processed -> https://www.w3.org/TR/rdfa-core/#s_initialcontexts
 *
 * @about and @resource support the datatype SafeCURIEorCURIEorIRI - allowing a SafeCURIE, a CURIE, or an IRI.
 * @href and @src are as defined in the Host Language (e.g., XHTML), and support only an IRI.
 * @vocab supports an IRI.
 * @datatype supports the datatype TERMorCURIEorAbsIRI - allowing a single Term, CURIE, or Absolute IRI.
 * @property, @typeof, @rel, and @rev support the datatype TERMorCURIEorAbsIRIs - allowing one or more Terms, CURIEs, or Absolute IRIs.
 *
 * old:::
 * ! vocab, resource should always be taken from closest parent
 * ! typeof has to be parsed separately as it can appear w/o property
 *
 * . prefixes needs more work -> remove vocab when prefix used...
 *
 * ? how to handle missing subject? TODO: add url to subject
 * ?    object to subject - on children - oda wie?
 * ? do we have to implement rdfa:copy -> https://www.w3.org/TR/rdfa-primer/#repeated-patterns
 */

'use strict';

const cheerio = require('cheerio');
const fs = require('fs');
const uriJs = require('uri-js');
const xnv = require('xml-name-validator');
const rdf = require('rdf');

const request = require('request');
const os = require('os');


let baseURL = "";

require('./classes.js');

Object.prototype.hasOwnPropertyCI = function (prop) {
    return Object.keys(this)
            .filter(function (v) {
                return v.toLowerCase() === prop.toLowerCase();
            }).length > 0;
};

Array.defineProperty(Array.prototype, "getCI", {
    value: function (prop) {
        let key, self = this;
        for (key in self) {
            if (key.toLowerCase() == prop.toLowerCase()) {
                return self[key];
            }
        }
    },
    //this keeps jquery happy
    enumerable: false
});

/**
 * parses RDFa from source (may be URL, file:// or a plain html string) to triples
 * @param source
 * @param callback
 */

    let add_local_iriMaps = function (prefixString) {
        let multiPrefixString = prefixString.replace(/:\s+/g, ':');
        let prefixStrings = multiPrefixString.split(/\s+/);

        for (let i = 0; i < prefixStrings.length; i++) {

            let key = prefixStrings[i].split(':')[0];
            let value = prefixStrings[i].substr(key.length + 1);

            if (local_iriMappings[key] != undefined && local_iriMappings[key] != value) {
                console.log('Warning: prefix ' + key + ':' + value + ' is supposed to be ' + prefixes[key])
            }
            local_iriMappings[key] = value;
        }

    };

    function getIRI(string) {
        let uri = uriJs.parse(string);
        return uriJs.serialize(uri, {iri: true, absolutePath: true});
    }


    function getSafeCURIE(prop) {

        let prefix;
        if (!prop.contains(':') || prop.split(':')[0] == "") {
            prefix = 'xhr'; // standard for rdfa
        } else if (prop.split(':')[0] == '_') {
            return undefined;
        } else {
            prefix = prop.split(':')[0];
        }

        // verify xml name
        if (!xnv.name(prefix).success) {
            return undefined;
        }

        let reference = prop.substr(prefix.length + 1);

        if (local_iriMappings.hasOwnProperty(prefix)) {
            return getIRI(local_iriMappings[prefix] + reference);
        } else {
            return undefined;
        }

        // let path = reference.split('?')[0];
        // let iqery = reference.split('?')[1].split('#')[0];
        // let ifragment = reference.split('#')[1];
        //
        // if (!path.startsWith('/') || path.startsWith('//')) {
        //     return undefined;
        // }


    }

    function getCURIE(prop) {
        let curie = getSafeCURIE(prop);
        if (curie == undefined) {
            return getIRI(prop);
        } else {
            return curie;
        }

    }

    function getSafeCURIEorCURIEorIRI(prop) {
        let braces = /\[(.*?)\]/g;

        if (braces.test(prop)) {
            return getSafeCURIE(prop);
        } else {
            return getCURIE(prop);
        }
    }

    function getTERM(string) {
        if (local_defaultVocabulary != null) {
            return local_defaultVocabulary + string;
        } else if (local_termMappings.hasOwnProperty(string)) {
            return local_termMappings[string];
        } else if (local_termMappings.hasOwnPropertyCI(string)) {
            return local_termMappings.getCI(string);
        }
        return undefined;
    }

    // function getCI(array, type, val) {
    //     return array.filter(function (el) {
    //         return el[type].toLowerCase() === val.toLowerCase();
    //     });
    // }

    function getTERMorCURIEorAbsIRIs(string) {
        let multiString = string.replace(/:\s+/g, ':');
        let Strings = multiString.split(/\s+/);

        let result = [];

        for (let i = 0; i < Strings.length; i++) {
            let term = getTERM(Strings[i]);
            if (term != undefined) {
                result.push(getTERM(Strings[i]));

            } else if (getSafeCURIE(Strings[i]) != undefined) {
                result.push(getSafeCURIE(Strings[i]));

            } else if (getIRI(Strings[i]) != undefined) { // TODO: gib des a undefined zruck?
                result.push(getIRI(Strings[i]));

            } else {
                return undefined;
            }
        }


    }

    function processElement(ts, context, callback) {

        //seq 1
        let local_skip = false;
        let local_newSubject = null;
        let local_currentObjectRessource = null;
        let local_typedRessource = null;
        let local_iriMappings = context.iriMappings;
        let local_incompleteTriples = null;
        let local_listMappings = context.listMappings;
        let local_language = context.language;
        let local_termMappings = context.termMappings;
        let local_defaultVocabulary = context.defaultVocabulary;

        //seq 2
        if (ts.is('[vocab]')) {
            let voc = ts.prop('vocab');
            local_defaultVocabulary = getIRI(voc);
            graph.add(new rdf.Triple(context.base, 'http://www.w3.org/ns/rdfa#usesVocabulary', voc));
        }

        // seq 3
        add_local_iriMaps(ts.prop('pefix'));

        // seq 4
        // TODO: current language

        // seq 5
        if (ts.not('[rel]') || ts.not('[rev]')) {
            // seq 5.1
            if (ts.is('[property]') && ts.not('[content]') && ts.not('[datatype]')) {

                if (ts.is('[about]')) {
                    local_newSubject = getSafeCURIEorCURIEorIRI(ts.prop('about'))
                } else if (ts[0] == document.firstChild) {
                    local_newSubject = getSafeCURIEorCURIEorIRI(''); // TODO: direkt?
                } else if (context.parentObject != null) {
                    local_newSubject = context.parentObject;
                }

                if (ts.is('[typeof]')) {
                    if (local_newSubject != null || ts[0] == document.firstChild) {
                        local_typedRessource = local_newSubject;
                    } else {
                        if (ts.is('[resource]')) {
                            local_typedRessource = getSafeCURIEorCURIEorIRI(ts.prop('resource'));
                        } else if (ts.is('[href]')) {
                            local_typedRessource = getIRI(ts.prop('href'));
                        } else if (ts.is('[src]')) {
                            local_typedRessource = getIRI(ts.prop('src'));
                        } else {
                            local_typedRessource = new rdf.BlankNode()
                        }
                        local_currentObjectRessource = local_typedRessource;
                    }

                }

                // seq 5.2
            } else {
                if (ts.is('[about]')) {
                    local_newSubject = getSafeCURIEorCURIEorIRI(ts.prop('about'))
                } else if (ts.is('[resource]')) {
                    local_newSubject = getSafeCURIEorCURIEorIRI(ts.prop('resource'));
                } else if (ts.is('[href]')) {
                    local_newSubject = getIRI(ts.prop('href'));
                } else if (ts.is('[src]')) {
                    local_newSubject = getIRI(ts.prop('src'));
                } else {
                    if (ts[0] == document.firstChild) {
                        local_newSubject = getSafeCURIEorCURIEorIRI('');
                    } else if (ts.is('[typeof]')) {
                        local_newSubject = new rdf.BlankNode()
                    } else if (context.parentObject != null) {
                        local_newSubject = context.parentObject;
                        if (ts.is('[property]')) {
                            local_skip = true;
                        }
                    }
                }

                if (ts.is('[typeof]')) {
                    local_typedRessource = local_newSubject;
                }
            }
            // seq 6
        } else {
            // TODO: seq 6 core
            console.log('Warning: rel / rev not yet implemented..');
        }

        // seq 7
        if (local_typedRessource != null) {
            let values = getTERMorCURIEorAbsIRIs(ts.prop('typeof'));
            for (let i = 0; i < values.length; i++) {
                graph.add(local_typedRessource, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', values[i])
            }
        }

        // seq 8
        if (local_newSubject != null) {
            local_listMappings = [];
        }

        if (local_currentObjectRessource != null) {
            // TODO: seq 9 core
            console.log('Warning: rel / inlist not yet implemented..');
        }

        // seq 10 TODO
        if (ts.is('[rel]')) {
            console.log('Warning: rel not yet implemented..');
        }
        if (ts.is('[rev]')) {
            console.log('Warning: rev not yet implemented..');
        }

        // seq 11
        if (ts.is('[property]')) {
            // TODO: typed literal...

            if (ts.is('[ressource]')) {
                local_currentObjectRessource = getSafeCURIEorCURIEorIRI(ts.prop('ressource'));
            } else if (ts.is('[href]')) {
                local_currentObjectRessource = getSafeCURIEorCURIEorIRI(ts.prop('href'));
            } else if (ts.is('[src]')) {
                local_currentObjectRessource = getSafeCURIEorCURIEorIRI(ts.prop('src'));
            }
        }

        if (ts.is('[typeof]') && ts.not('[abaout]')) {
            local_currentObjectRessource = local_typedRessource;
        }

        // seq 12
        if (!local_skip && local_newSubject != null) {
            for (let i = 0; i < context.incompleteTriples; i++) {
                let icT = context.incompleteTriples[i];
                if (icT == 'none') {
                    // TODO: wtf?!?
                    // context.incompleteTriples.push(new incompleteTriples(local_newSubject, null, null, "WTF"))
                } else if (icT == 'forward') {
                    graph.add(new Triple(context.parentSubject, icT.predicate, local_newSubject));
                } else if (icT == 'reverse') {
                    graph.add(new Triple(local_newSubject, icT.predicate, context.parentSubject));
                }
            }
        }

        // seq 13
        ts.children('*').each(function () {
            let ts = $(this);
            let ctx;

            if (local_skip) {
                ctx = $.extend({}, context);
                ctx.language = local_language;
                ctx.iriMappings = local_iriMappings;
            } else {

            }
            //// DO TODO..
            processElement(ts, ctx, graph);
        });

        callback(graph);

    }

const parseRDFa = function (source, callback) {

    getHTML(source, function (html) {

        let $ = cheerio.load(html);
        let graph = new rdf.Graph();

        $(':root').each(function () {
            let ts = $(this);
            let ctx = getInitialContext($);

            processElement(ts, ctx, graph);

        });

        callback(graph);
    });

};

/**
 * returns html content from file, web or plain html text
 * @param source can be URL starting with 'http' or file starting with 'file://' or plain html text
 * @param callback
 * @returns {string} html content
 */
const getHTML = function (source, callback) {

    source = source.trim();

    if (source.startsWith('http')) {
        baseURL = source;
        request(source, function (error, response, html) {
            if (!error && response.statusCode == 200) {
                callback(html);
            }
        });

    } else if (source.startsWith('file://')) {
        baseURL = source;
        fs.readFile(source.substr(7), 'utf-8', function (err, data) {
            if (err) throw err;
            callback(data);
        })

    } else if (source.startsWith('<') || source.startsWith('<')) {
        throw new Error('plain html not possible atm..');
        // callback(source);

    } else {
        throw new Error('could not detect input format');

    }


};

// const processPrefixes = function (output, callback) {
//
//     $('[prefix]').each(function () {
//         let multiPrefixString = $(this).prop('prefix');
//
//         multiPrefixString = multiPrefixString.replace(/:\s+/g, ':');
//
//         let prefixStrings = multiPrefixString.split(/\s+/);
//
//         // for (var prefixString in prefixStrings) {
//         for (let i = 0; i < prefixStrings.length; i++) {
//
//             let key = prefixStrings[i].split(':')[0];
//             let value = prefixStrings[i].substr(key.length + 1);
//
//             if (prefixes[key] != undefined && prefixes[key] != value) {
//                 console.log('Warning: prefix ' + key + ':' + value + ' is supposed to be ' + prefixes[key])
//             }
//             prefixes[key] = value;
//         }
//     });
//
//     for (let prefix in prefixes) {
//         if (prefixes.hasOwnProperty(prefix)) {
//             if (output.contains(prefix + '\:'))
//                 output = output.replaceAll(prefix + '\:', prefixes[prefix]);
//         }
//     }
//
//     callback(output);
// };

function getInitialContext($) {
    let init = require("./rdfa_core.json");

    let base = $('[xml\\:base]').prop('xml:base');
    if (base == undefined)
        base = baseURL;

    let lang = $('[xml\\:lang]').prop('xml:lang');
    if (base == undefined)
        lang = null;

    return new Context(
        base,
        base,
        null,
        [],
        [],
        lang,
        init.context,
        init.terms,
        null
    );
}


// test exports
// exports.getIRI = getIRI;

exports.parseRDFa = parseRDFa;
// let local_currentPropertyValue = "";

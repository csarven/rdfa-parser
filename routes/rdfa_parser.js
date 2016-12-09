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

const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');

require('./classes.js');
const rdfaCore = require('./rdfa_core.json');

const PlainLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
const typeURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const usesVocab = 'http://www.w3.org/ns/rdfa#usesVocabulary';
const XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
const objectURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

global.store = null;
const logger = true;

const dummy_parseRDFa = function (source, store, base = null, callback) {

    let graph = store.rdf.createGraph();


    global.store = store;

    graph.add(global.store.rdf.createTriple(
        global.store.rdf.createNamedNode('http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/photo1.jpg'),
        global.store.rdf.createNamedNode('http://purl.org/dc/elements/1.1/creator'),
        global.store.rdf.createLiteral('Mark Birbeck'))
    );
    store.insert(graph, (err, inserted) => {
        if (!err && inserted) {
            callback(store);
        }
    });

};

/**
 * parses RDFa from source (may be URL, file:// or a plain html string) to triples
 * @param source
 * @param store rdfstore instance to insert triples
 * @param base optional set base to a specific value
 * @param callback
 */
const parseRDFa = function (source, store, base = null, callback) {

    global.store = store;

    getHTML(source, function (html) {

        let $ = cheerio.load(html);

        let graph = global.store.rdf.createGraph();

        $(':root').each(function () {
            let ts = $(this);
            let ctx = getInitialContext($, base);

            processElement($, ts, ctx, graph);

        });

        global.store.insert(graph, (err, inserted) => {
            if (!err && inserted) {
                callback(global.store);
            }
        });

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
        request(source, function (error, response, html) {
            if (!error && response.statusCode == 200) {
                callback(html);
            }
        });

    } else if (source.startsWith('file://')) {
        //noinspection JSUnresolvedFunction
        fs.readFile(source.substr(7), 'utf-8', function (err, data) {
            if (err) throw err;
            callback(data);
        })

    } else if (source.startsWith('<') && source.endsWith('>')) {
        throw new Error('plain html not possible atm..');
        // callback(source);

    } else {
        throw new Error('could not detect input format');

    }


};

function getInitialContext($, base) {

    if (base == null) {
        base = $('[xml\\:base]').prop('xml:base');
        if (base == undefined)
            base = $('base').prop('href');
        if (base == undefined)
            base = source;
    }

    let lang = $('[xml\\:lang]').prop('xml:lang');
    if (lang == undefined)
        lang = $('lang').prop('href');
    if (lang == undefined)
        lang = null;

    return new Context(
        base,
        base,
        null,
        [],
        [],
        lang,
        rdfaCore.context,
        rdfaCore.terms,
        null
    );
}


let add_local_iriMaps = function (l_iriMaps, prefixString) {
    let multiPrefixString = prefixString.replace(/:\s+/g, ':');
    let prefixStrings = multiPrefixString.split(/\s+/);

    for (let i = 0; i < prefixStrings.length; i++) {

        let key = prefixStrings[i].split(':')[0];
        let value = prefixStrings[i].substr(key.length + 1);

        if (l_iriMaps[key] != undefined && l_iriMaps[key] != value) {
            console.log('Warning: prefix ' + key + ':' + value + ' is supposed to be ' + l_iriMaps[key])
        }
        l_iriMaps[key] = value;
    }

};

function processElement($, ts, context, graph) {

    if(logger) {
        console.log("\n**********************************************************************************");
        console.log(" /--------------------\\");
        console.log("|  Processing element  |");
        console.log(" \\--------------------/");
        console.log("\n" + ts + " \n");
        console.log("**********************************************************************************");
    }

    // reference: https://www.w3.org/TR/rdfa-core/#s_sequence
    //seq 1
    let local_skip = false;
    let local_newSubject = null;
    let local_currentObjectResource = null;
    let local_currentPropertyValue = null;
    let local_typedResource = null;
    let local_iriMappings = context.iriMappings;
    let local_incompleteTriples = [];
    let local_listMappings = context.listMappings;
    let local_listMappingDifferent = context.parentSubject ? false : true;
    let local_termMappings = context.termMappings;
    let local_defaultVocabulary = context.defaultVocabulary;


    // let relAttPredicates = [];
    // if (ts.is('[rel]')) {
    //     let values = Context.tokenize(ts.prop('rel'));
    //     for (let i = 0; i < values.length; i++) {
    //         let predicate = this.parsePredicate(values[i], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt != null);
    //         if (predicate) {
    //             relAttPredicates.push(predicate);
    //         }
    //     }
    // }
    // let revAttPredicates = [];
    // if (ts.is('[rev]')) {
    //     let values = this.tokenize(ts.prop('rev'));
    //     for (let i = 0; i < values.length; i++) {
    //         let predicate = this.parsePredicate(values[i], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt != null);
    //         if (predicate) {
    //             revAttPredicates.push(predicate);
    //         }
    //     }
    // }


    //seq 2
    if (ts.is('[vocab]')) {
        local_defaultVocabulary = context.getURI(ts, 'vocab');
        graph.add(global.store.rdf.createTriple(
            global.store.rdf.createNamedNode(context.base),
            global.store.rdf.createNamedNode(usesVocab),
            global.store.rdf.createLiteral(local_defaultVocabulary))
        );
    }
    else if(logger) {
        console.log("seq2 is skipped");
    }
    // TODO: else statement

    // seq 3
    if (ts.is('[prefix]')) {
        add_local_iriMaps(local_iriMappings, ts.prop('prefix'));
    }
    else if(logger) {
        console.log("seq3 is skipped");
    }

    // seq 4
    let local_language = $('[xml\\:lang]').prop('xml:lang');
    if (local_language == undefined)
        local_language = $('lang').prop('href');
    if (local_language == undefined)
        local_language = context.language;

    // seq 5
    if (ts.not('[rel]') && ts.not('[rev]')) {
        // seq 5.1
        if (ts.is('[property]') && ts.not('[content]') && ts.not('[datatype]')) {

            if(logger) {
                console.log("seq5.1 is processing ...");
            }

            if (ts.is('[about]')) {
                local_newSubject = context.getURI(ts, 'about');
            } else if (ts.is(':root')) {
                local_newSubject = context.parseTermOrCURIEOrAbsURI('');
            } else if (context.parentObject != null) {
                local_newSubject = context.parentObject;
            }

            if (ts.is('[typeof]')) {
                if (local_newSubject != null || ts.is(':root')) {
                    local_typedResource = local_newSubject;
                } else {
                    if (ts.is('[resource]')) {
                        local_typedResource = context.getURI(ts, 'resource');
                    } else if (ts.is('[href]')) {
                        local_typedResource = context.getURI(ts, 'href');
                    } else if (ts.is('[src]')) {
                        local_typedResource = context.getURI(ts, 'src');
                    } else {
                        local_typedResource = store.rdf.createBlankNode();
                    }
                    local_currentObjectResource = local_typedResource;
                }

            }

            // seq 5.2
        } else {

            if(logger) {
                console.log("seq5.2 is processing ...");
            }

            if (ts.is('[about]')) {
                local_newSubject = context.getURI(ts, 'about');
            } else if (ts.is('[resource]')) {
                local_newSubject = context.getURI(ts, 'resource');
            } else if (ts.is('[href]')) {
                local_newSubject = context.getURI(ts, 'href');
            } else if (ts.is('[src]')) {
                local_newSubject = context.getURI(ts, 'src');
            } else {
                if (ts.is(':root')) {
                    local_newSubject = context.parseTermOrCURIEOrAbsURI('');
                } else if (ts.is('[typeof]')) {
                    local_newSubject = store.rdf.createBlankNode();
                } else if (context.parentObject != null) {
                    local_newSubject = context.parentObject;
                    if (ts.is('[property]')) { // TODO: seq says, ts.not()
                        local_skip = true;
                    }
                }
            }

            if (ts.is('[typeof]')) {
                local_typedResource = local_newSubject;
            }
        }

        // seq 6
    } else {

        if(logger) {
            console.log("seq6 is processing ...");
        }

        if (ts.is('[about]')) {
            local_newSubject = context.getURI(ts, 'about');
            if (ts.is('[typeof]')) {
                local_typedResource = local_newSubject;
            }
        } else if (ts.is(':root')) {
            local_newSubject = context.parseTermOrCURIEOrAbsURI('');
        } else if (context.parentObject != null) {
            local_newSubject = context.parentObject;
        }

        if (ts.is('[resource]')) {
            local_currentObjectResource = context.getURI(ts, 'resource');
        } else if (ts.is('[href]')) {
            local_currentObjectResource = context.getURI(ts, 'href');
        } else if (ts.is('[src]')) {
            local_currentObjectResource = context.getURI(ts, 'src');
        } else if (ts.is('[typeof]') && ts.not('[about]')) {
            local_currentObjectResource = store.rdf.createBlankNode();
            local_typedResource = local_currentObjectResource;
        }
    }

    // seq 7
    if (local_typedResource != null) {
        let values = context.getURI(ts, 'typeof');

        if (values) {
            for (let i = 0; i < values.length; i++) {
                graph.add(global.store.rdf.createTriple(
                    global.store.rdf.createNamedNode(local_typedResource),
                    global.store.rdf.createNamedNode(typeURI),
                    global.store.rdf.createLiteral(values[i])));
            }
        }
    }
    else if(logger) {
        console.log("seq7 is skipped");
    }

    // seq 8
    if (local_newSubject && local_newSubject != context.parentObject) {
        local_listMappings = [];
        local_listMappingDifferent = true;
    }
    else if(logger) {
        console.log("seq8 is skipped");
    }

// seq 9 TODO
    if (local_currentObjectResource) {
        console.log('Warning: rel / inlist not yet implemented..');
    } else {
        if (local_newSubject && !local_currentObjectResource && (ts.is('[rel]') || ts.is('[rev]'))) {
            local_currentObjectResource = store.rdf.createBlankNode();
            //alert(current.tagName+": generated blank node, newSubject="+newSubject+" currentObjectResource="+currentObjectResource);
        }

        if (ts.is('[rel]') && ts.is('[inlist]')) {
            console.log('Warning: inlist not yet implemented..');

        } else if (ts.is('[rel]')) {
            let relAtt = context.getURI(ts, 'rel');
            for (let i = 0; i < relAtt.length; i++) {
                // incomplete.push({predicate: relAttPredicates[i], forward: true});
                local_incompleteTriples.push(new incompleteTriples(null, relAtt[i], null, 'forward'))
            }

        } else if (ts.is('[rev]')) {
            let revAtt = context.getURI(ts, 'rev');
            for (let i = 0; i < revAtt.length; i++) {
                // incomplete.push({predicate: relAttPredicates[i], forward: true});
                local_incompleteTriples.push(new incompleteTriples(null, revAtt[i], null, 'reverse'))
            }
        }

    }



// seq 11
    if (ts.is('[property]')) {

        let datatype, content = null;

        if (ts.is('[datatype]')) {
            datatype = ts.prop('datatype') == '' ? PlainLiteralURI : context.getURI(ts, 'datatype');

            // green-turtle does some datetime stuff here..??
            // if (ts.is('[datetime]') && ts.not('[content]')) {
            //     content = ts.prop('datetime');
            // } else {
            content =
                datatype == XMLLiteralURI || datatype == HTMLLiteralURI
                    ? null
                    : (ts.is('[content]')
                        ? ts.prop('content')
                        : ts.textContent
                );
            // }
        } else if (ts.is('[content]')) {
            datatype = PlainLiteralURI;
            content = ts.prop('content')

        } else if (ts.not('[rev]') && ts.not('[rev]')) {
            if (ts.is('[resource]')) {
                content = context.getURI(ts, 'resource');
            } else if (ts.is('[href]')) {
                content = context.getURI(ts, 'href');
            } else if (ts.is('[src]')) {
                content = context.getURI(ts, 'src');
            }

            if (content) {
                datatype = objectURI;
            }

        }
        if (ts.is('[typeof]') && ts.not('[about]')) {
            datatype = objectURI;
            content = local_typedResource;
        } else {
            content = ts.text();
            if (!datatype) {
                datatype = PlainLiteralURI;
            }
        }

        let values = context.getURI(ts, 'property');

        for (let i = 0; i < values.length; i++) {
            let predicate = context.parsePredicate(ts.prop('property'));

            if (predicate) {
                if (ts.is('[inlist]')) {
                    // TODO: inlist
                    console.log('Warning: inlist not yet implemented..');
                } else {
                    if (datatype == XMLLiteralURI || datatype == HTMLLiteralURI) {
                        graph.add(global.store.rdf.createTriple(
                            global.store.rdf.createNamedNode(local_newSubject),
                            global.store.rdf.createNamedNode(predicate),
                            global.store.rdf.createLiteral(ts.childNodes, null, datatype) // TODO: lang?
                        ));
                    } else {
                        graph.add(global.store.rdf.createTriple(
                            global.store.rdf.createNamedNode(local_newSubject),
                            global.store.rdf.createNamedNode(predicate),
                            global.store.rdf.createLiteral(content) //, local_language, datatype) // TODO: lang
                        ));
                    }
                }
            }

        }
    }

// seq 12
    if (!local_skip && local_newSubject != null) {
        for (let i = 0; i < context.incompleteTriples; i++) {
            let icT = context.incompleteTriples[i];
            if (icT.direction() == 'none') {
                // TODO: wtf?!?
                // context.incompleteTriples.push(new incompleteTriples(local_newSubject, null, null, 'WTF'))
            } else if (icT.direction == 'forward') {
                graph.add(global.store.rdf.createTriple(
                    global.store.rdf.createNamedNode(context.parentSubject),
                    global.store.rdf.createNamedNode(icT.predicate),
                    global.store.rdf.createLiteral(local_newSubject)));
            } else if (icT.direction == 'reverse') {
                graph.add(global.rdf.createTriple(
                    global.store.rdf.createNamedNode(local_newSubject),
                    global.store.rdf.createNamedNode(icT.predicate),
                    global.store.rdf.createLiteral(context.parentSubject)));
            }
        }
    }

// seq 13
    ts.children('*').each(function () {
        let ths = $(this);
        let ctx;

        if (local_skip) {
            ctx = $.extend({}, context);
            ctx.language = local_language;
            ctx.iriMappings = local_iriMappings;
        } else {
            ctx = new Context(
                context.base,
                (local_newSubject != null) ? local_newSubject : context.parentSubject,
                (local_currentObjectResource != null)
                    ? local_currentObjectResource
                    : (local_newSubject != null)
                    ? local_newSubject
                    : context.parentSubject,
                local_incompleteTriples,
                local_listMappings,
                local_language, //TODO: current language -> https://www.w3.org/TR/rdfa-core/#T-current-language
                local_iriMappings,
                local_termMappings,
                local_defaultVocabulary
            );

        }
        processElement($, ths, ctx, graph);
    });

}

Object.defineProperty(Object.prototype, 'hasOwnPropertyCI', {
    value: function (prop) {
        return Object.keys(this)
                .filter(function (v) {
                    return v.toLowerCase() === prop.toLowerCase();
                }).length > 0;
    },
    enumerable: false
});


Object.defineProperty(Object.prototype, 'getCI', {
    value: function (prop) {
        let key, self = this;
        for (key in self) {
            if (self.hasOwnProperty(key)) {
                if (key.toLowerCase() == prop.toLowerCase()) {
                    return self[key];
                }
            }
        }
    },
    //this keeps jquery happy
    enumerable: false
});


exports.getHTML = getHTML;
exports.parseRDFa = parseRDFa;
exports.dummy_parseRDFa = dummy_parseRDFa;

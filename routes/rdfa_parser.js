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
const rdf = require('rdf');

require('./classes.js');
const rdfaCore = require('./rdfa_core.json');
const crawler = require('./crawler.js');

const PlainLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
const typeURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const usesVocab = 'http://www.w3.org/ns/rdfa#usesVocabulary';
const XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
const objectURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

const logger = true;

let triples = [];


/**
 * adds a Triple to the Graph
 * @param sub
 * @param pre
 * @param obj
 */
function addTriple(sub, pre, obj) {

    if (sub.nodeType() != 'BlankNode')
        sub = rdf.environment.createNamedNode(sub);

    pre = rdf.environment.createNamedNode(pre);

    if (obj.nodeType() != 'BlankNode' && !(obj instanceof rdf.Literal))
        obj = rdf.environment.createNamedNode(obj);

    let triple = rdf.environment.createTriple(sub, pre, obj);

    triples.push(triple);
}

/**
 * parses RDFa from html
 * @param html
 * @param base optional set base to a specific value
 * @param callback
 */
const parseRDFa = function (html, base = null, callback) {

    rdf.setBuiltins();

    let $ = cheerio.load(html);

    $(':root').each(function () {
        let ts = $(this);
        let ctx = getInitialContext($, base);

        processElement($, ts, ctx);

    });

    if (!callback) {
        return triples;
    } else {
        callback(triples);
    }

};


function getInitialContext($, base) {

    if ($('[xml\\:base]').length > 0)
        base = $('[xml\\:base]').prop('xml:base');
    if ($('base').prop('href') != '' && $('base').prop('href') != undefined)
        base = $('base').prop('href');

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

function processElement($, ts, context) {

    // try {

    if (logger) {
        console.log("\n**********************************************************************************");
        console.log(" /--------------------\\");
        console.log("|  Processing element  |");
        console.log(" \\--------------------/\n");
        console.log(ts + "");
        console.log("\n**********************************************************************************");
    }

    let vocabAtt = ts.prop('vocab');
    let prefixAtt = ts.prop('prefix');
    let relAtt = ts.prop('rel');
    let revAtt = ts.prop('rev');
    let typeofAtt = ts.prop('typeof');
    let propertyAtt = ts.prop('property');
    let datatypeAtt = ts.prop('datatype');
    // let datetimeAtt = this.inHTMLMode ? ts.prop('datetime') : null;
    let datetimeAtt = ts.prop('datetime');
    let contentAtt = ts.prop('content');
    let aboutAtt = ts.prop('about');
    let srcAtt = ts.prop('src');
    let resourceAtt = ts.prop('resource');
    let hrefAtt = ts.prop('href');
    let inlistAtt = ts.prop('inlist');

    let inHTMLMode = true;


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

    // let local_prefixes = context.prefixes;

    let relAttPredicates = [];
    if (relAtt) {
        let values = Context.tokenize(ts.prop('rel'));
        for (let i = 0; i < values.length; i++) {
            // let predicate = context.parsePredicate(values[i], local_defaultVocabulary, context.terms, local_prefixes, base, this.inHTMLMode && propertyAtt != null);
            let predicate = context.parsePredicate(values[i]);
            if (predicate) {
                relAttPredicates.push(predicate);
            }
        }
    }
    let revAttPredicates = [];
    if (revAtt) {
        let values = Context.tokenize(ts.prop('rev'));
        for (let i = 0; i < values.length; i++) {
            // let predicate = context.parsePredicate(values[i], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt != null);
            let predicate = context.parsePredicate(values[i]);
            if (predicate) {
                revAttPredicates.push(predicate);
            }
        }
    }


    //seq 2
    if (vocabAtt) {
        local_defaultVocabulary = context.getURI(ts, 'vocab');
        addTriple(context.base, usesVocab, local_defaultVocabulary);
    }
    else if (logger) {
        console.log("seq2 is skipped");
    }
    // TODO: else statement

    // seq 3
    if (prefixAtt) {
        add_local_iriMaps(local_iriMappings, prefixAtt);
    }
    else if (logger) {
        console.log("seq3 is skipped");
    }

    // seq 4
    let local_language = $('[xml\\:lang]').prop('xml:lang');
    if (local_language == undefined)
        local_language = $('lang').prop('href');
    if (local_language == undefined)
        local_language = context.language;

    // seq 5
    // console.log("rel = " + rel + "/ rev = " + rev);

    if (!relAtt && !revAtt) {
        // seq 5.1
        if (propertyAtt && !contentAtt && !datatypeAtt) {

            if (logger) {
                console.log("seq5.1 is processing ...");
            }

            if (aboutAtt) {
                local_newSubject = context.getURI(ts, 'about');
            } else if (ts.is(':root')) {
                local_newSubject = context.parseTermOrCURIEOrAbsURI('');
            } else if (context.parentObject != null) {
                local_newSubject = context.parentObject;
            }

            if (typeofAtt) {
                if (local_newSubject != null || ts.is(':root')) {
                    local_typedResource = local_newSubject;
                } else {
                    if (resourceAtt) {
                        local_typedResource = context.getURI(ts, 'resource');
                    } else if (hrefAtt) {
                        local_typedResource = context.getURI(ts, 'href');
                    } else if (srcAtt) {
                        local_typedResource = context.getURI(ts, 'src');
                    } else {
                        local_typedResource = rdf.environment.createBlankNode();
                    }
                    local_currentObjectResource = local_typedResource;
                }

            }

            // seq 5.2
        } else {

            if (logger) {
                console.log("seq5.2 is processing ...");
            }

            if (aboutAtt) {
                local_newSubject = context.getURI(ts, 'about');
            } else if (resourceAtt) {
                local_newSubject = context.getURI(ts, 'resource');
            } else if (hrefAtt) {
                local_newSubject = context.getURI(ts, 'href');
            } else if (srcAtt) {
                local_newSubject = context.getURI(ts, 'src');
            } else {
                if (ts.is(':root')) {
                    local_newSubject = context.parseTermOrCURIEOrAbsURI('');
                } else if ((inHTMLMode) && (ts.is("head") || ts.is("body"))) {
                    local_newSubject = context.base;
                } else if (typeofAtt) {
                    local_newSubject = rdf.environment.createBlankNode();
                } else if (context.parentObject) {
                    local_newSubject = context.parentObject;

                    if (!propertyAtt) { // TODO: seq says, ts.not()
                        local_skip = true;
                    }
                }
            }

            if (typeofAtt) {
                local_typedResource = local_newSubject;
            }
        }

        // seq 6
    } else {

        if (logger) {
            console.log("seq6 is processing ...");
        }

        if (aboutAtt) {
            local_newSubject = context.getURI(ts, 'about');
        }
        if (typeofAtt) {
            local_typedResource = local_newSubject;
        }
        if (!local_newSubject) {
            if (ts.is(':root')) {
                local_newSubject = context.parseSafeCURIEOrCURIEOrURI(context.base);
            } else if (context.parentObject) {
                local_newSubject = context.parentObject;
            }
        }

        if (resourceAtt) {
            local_currentObjectResource = context.getURI(ts, 'resource');
        }

        if (!local_currentObjectResource) {
            if (hrefAtt) {
                local_currentObjectResource = context.getURI(ts, 'href');
            } else if (srcAtt) {
                local_currentObjectResource = context.getURI(ts, 'src');
            } else if (typeofAtt && !aboutAtt && !(inHTMLMode && (ts.is('head') || ts.is('body')))) {
                local_currentObjectResource = rdf.environment.createBlankNode();
                // local_typedResource = local_currentObjectResource;
            }
        }

        if (typeofAtt && !aboutAtt && inHTMLMode && (ts.is('head') || ts.is('body'))) {
            local_typedResource = local_newSubject;
        } else if (typeofAtt && !aboutAtt) {
            local_typedResource = local_currentObjectResource;
        }

    }

    if (local_newSubject) {
        if (aboutAtt || resourceAtt || local_typedResource) {
            let id = local_newSubject;
            if (typeofAtt && !aboutAtt && !resourceAtt && local_currentObjectResource) {
                id = local_currentObjectResource;
            }
            console.log("TODO - setting new subject origin ...");
        }
    }

    // seq 7
    if (local_typedResource != null) {
        // let values = context.getURI(ts, 'typeof');
        let values = Context.tokenize(typeofAtt);
        if (values) {
            for (let i = 0; i < values.length; i++) {
                let object = context.parseTermOrCURIEOrAbsURI(values[i]);
                if (object) {
                    addTriple(local_typedResource, typeURI, object);
                }
            }
        }
    }
    else if (logger) {
        console.log("seq7 is skipped");
    }

    // seq 8
    if (local_newSubject && local_newSubject != context.parentObject) {
        local_listMappings = [];
        local_listMappingDifferent = true;
    }
    else if (logger) {
        console.log("seq8 is skipped");
    }

// seq 9 TODO
    if (local_currentObjectResource) {
        if (relAtt && inlistAtt) {
            for (let i = 0; i < relAttPredicates.length; i++) {
                let list = local_listMappings[relAttPredicates[i]];
                if (!list) {
                    list = [];
                    local_listMappings[relAttPredicates[i]] = list;
                }
                list.push({type: objectURI, value: local_currentObjectResource});
            }
        } else if (relAtt) {
            for (let i = 0; i < relAttPredicates.length; i++) {
                addTriple(local_newSubject, relAttPredicates[i], local_currentObjectResource);
            }
        }
        if (revAtt) {
            for (let i = 0; i < revAttPredicates.length; i++) {
                addTriple(local_currentObjectResource, revAttPredicates[i], local_newSubject);
            }
        }


// seq 10
    } else {
        if (local_newSubject && !local_currentObjectResource && (relAtt || revAtt)) {
            local_currentObjectResource = rdf.environment.createBlankNode();
            //alert(current.tagName+": generated blank node, newSubject="+newSubject+" currentObjectResource="+currentObjectResource);
        }

        if (relAtt && inlistAtt) {
            console.log('Warning: inlist not yet implemented..');

        } else if (relAtt) {
            let relAtt = context.getURI(ts, 'rel');
            for (let i = 0; i < relAtt.length; i++) {
                // incomplete.push({predicate: relAttPredicates[i], forward: true});
                local_incompleteTriples.push(new incompleteTriples(null, relAtt[i], null, 'forward'))
            }

        }

        if (revAtt) {
            let revAtt = context.getURI(ts, 'rev');
            for (let i = 0; i < revAtt.length; i++) {
                // incomplete.push({predicate: relAttPredicates[i], forward: true});
                local_incompleteTriples.push(new incompleteTriples(null, revAtt[i], null, 'reverse'))
            }
        }

    }


// seq 11
    if (propertyAtt) {

        let datatype = null;
        let content = null;

        if (datatypeAtt) {
            datatype = datatypeAtt == '' ? PlainLiteralURI : context.getURI(ts, 'datatype');

            // TODO green-turtle does some datetime stuff here..??
            if (datetimeAtt && !contentAtt) {
                content = ts.prop('datetime');
            } else {
                content =
                    datatype == XMLLiteralURI || datatype == HTMLLiteralURI
                        ? null
                        : (ts.is('[content]')
                                ? ts.prop('content')
                                : ts.text().trim()
                        );
            }
        } else if (contentAtt) {
            datatype = PlainLiteralURI;
            content = ts.prop('content')
        } else if (datetimeAtt) { // TODO
            console.log("TODO - seq11 - datetime");
            content = context.getURI(ts, 'datetime');
            // datatype = deriveDateTimeType(content);
            if (!datatype) {
                datatype = PlainLiteralURI;
            }
        } else if (!relAtt && !revAtt) {
            if (resourceAtt) {
                content = context.getURI(ts, 'resource');
            }
            if (!contentAtt && hrefAtt) {
                content = context.getURI(ts, 'href');
            } else if (!contentAtt && srcAtt) {
                content = context.getURI(ts, 'src');
            }
            if (content) {
                datatype = objectURI;
            }

        }
        if (!datatype) {
            if (typeofAtt && aboutAtt != '') {
                datatype = objectURI;
                content = local_typedResource;
            } else {
                content = ts.text().trim();
                console.log("TODO - seq11 - HTML-Mode");
                if (!datatype) {
                    datatype = PlainLiteralURI;
                }
            }
        }

        let values = context.getURI(ts, 'property');
        for (let i = 0; i < values.length; i++) {
            let predicate = context.parsePredicate(values[i]);

            if (predicate) {
                if (inlistAtt) {
                    // TODO: inlist
                    console.log('Warning: inlist not yet implemented..');
                } else {
                    if (datatype == XMLLiteralURI || datatype == HTMLLiteralURI) {
                        console.log("TODO - seq11 - check");
                        addTriple(local_newSubject, predicate, rdf.environment.createLiteral(ts.childNodes, local_language, datatype));
                    } else {
                        if (datatype && datatype != PlainLiteralURI)
                            addTriple(local_newSubject, predicate, rdf.environment.createLiteral(content, local_language, datatype));
                        else
                            addTriple(local_newSubject, predicate, rdf.environment.createLiteral(content));
                    }
                }
            }

        }
    }

// seq 12
//     if (!local_skip && local_newSubject != null) {
    if (!local_skip && local_newSubject) {
        for (let i = 0; i < context.incompleteTriples.length; i++) {
            let icT = context.incompleteTriples[i];
            if (icT.direction == 'none') {
                console.log("TODO - seq12 - direction = none");
                // TODO: wtf?!?
                // context.incompleteTriples.push(new incompleteTriples(local_newSubject, null, null, 'WTF'))
            } else if (icT.direction == 'forward') {
                addTriple(context.parentSubject, icT.predicate, local_newSubject);
            } else if (icT.direction == 'reverse') {
                addTriple(local_newSubject, icT.predicate, context.parentSubject);
            }
        }
    }

// seq 13
    ts.children('*').each(function () {
        let ths = $(this);
        let ctx;

        if (local_skip) {
            // ctx = $.extend({}, context);
            // ctx = JSON.parse(JSON.stringify(context));
            // ctx = jQuery.extend({}, context);
            // ctx.language = local_language;
            // ctx.iriMappings = local_iriMappings;

            ctx = new Context(
                context.base,
                context.parentSubject,
                context.parentObject,
                context.incompleteTriples,
                local_iriMappings,
                local_language,
                context.iriMappings,
                context.termMappings,
                context.defaultVocabulary
            )


        } else {
            ctx = new Context(
                context._base,
                local_newSubject ? local_newSubject : context.parentSubject,
                local_currentObjectResource
                    ? local_currentObjectResource
                    : local_newSubject
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

        if (ctx._base === undefined) {
            console.error("auweia ...");
        }


        processElement($, ths, ctx);
    });
    // } catch (err) {
    //     console.error("ERROR: " + err);
    // }
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


exports.parseRDFa = parseRDFa;

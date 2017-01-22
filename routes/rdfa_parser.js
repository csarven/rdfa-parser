/**
 *
 * @about and @resource support the datatype SafeCURIEorCURIEorIRI - allowing a SafeCURIE, a CURIE, or an IRI.
 * @href and @src are as defined in the Host Language (e.g., XHTML), and support only an IRI.
 * @vocab supports an IRI.
 * @datatype supports the datatype TERMorCURIEorAbsIRI - allowing a single Term, CURIE, or Absolute IRI.
 * @property, @typeof, @rel, and @rev support the datatype TERMorCURIEorAbsIRIs - allowing one or more Terms, CURIEs, or Absolute IRIs.
 *
 */

'use strict';


const logger = true;

let triples = [];


const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const rdf = require('rdf');

require('./classes.js');
const crawler = require('./crawler.js');

const PlainLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
const typeURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const usesVocab = 'http://www.w3.org/ns/rdfa#usesVocabulary';
const XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
const objectURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

const dateTimeTypes = [
    {
        pattern: /-?P(?:[0-9]+Y)?(?:[0-9]+M)?(?:[0-9]+D)?(?:T(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+(?:\.[0-9]+)?S)?)?/,
        type: "http://www.w3.org/2001/XMLSchema#duration"
    },
    {
        pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9]T(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
        type: "http://www.w3.org/2001/XMLSchema#dateTime"
    },
    {
        pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9](?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
        type: "http://www.w3.org/2001/XMLSchema#date"
    },
    {
        pattern: /(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
        type: "http://www.w3.org/2001/XMLSchema#time"
    },
    {
        pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]/,
        type: "http://www.w3.org/2001/XMLSchema#gYearMonth"
    },
    {
        pattern: /-?[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9]/,
        type: "http://www.w3.org/2001/XMLSchema#gYear"
    }
];

function deriveDateTimeType(value) {
    for (let i = 0; i < dateTimeTypes.length; i++) {
        //console.log("Checking "+value+" against "+RDFaProcessor.dateTimeTypes[i].type);
        let matched = dateTimeTypes[i].pattern.exec(value);
        if (matched && matched[0].length == value.length) {
            //console.log("Matched!");
            return dateTimeTypes[i].type;
        }
    }
    return null;
}

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

    triples = [];

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

    let xmlBase = $('[xml\\:base]');
    let baseTag = $('base');

    if (xmlBase.length > 0)
        base = xmlBase.prop('xml:base');
    if (baseTag.prop('href') != '' && baseTag.prop('href') != undefined)
        base = baseTag.prop('href');

    let lang = $('[xml\\:lang]').prop('xml:lang');
    if (lang == undefined)
        lang = $('lang').prop('href');
    if (lang == undefined)
        lang = null;

    delete require.cache[require.resolve('./rdfa_core.json')];
    let rdfaCore = require('./rdfa_core.json');
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
        let value = context.getURI(ts, 'vocab');
        if (value.length > 0) {
            local_defaultVocabulary = value;
            addTriple(context.base, usesVocab, local_defaultVocabulary);
        } else {
            local_defaultVocabulary = context.defaultVocabulary;
        }

    }
    else if (logger) {
        console.log("seq2 is skipped");
    }

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
        local_language = ts.prop('lang');
    if (local_language == undefined)
        local_language = context.language;

    // seq 6
    if (relAtt == '' || relAtt || revAtt == '' || revAtt) {

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

    } else {
        // seq 5
        if (propertyAtt && !contentAtt && !datatypeAtt) {
            // seq 5.1

            if (logger) {
                console.log("seq5.1 is processing ...");
            }

            if (aboutAtt || aboutAtt == '') {
                local_newSubject = context.getURI(ts, 'about');
            } else if (ts.is(':root')) {
                local_newSubject = context.parseTermOrCURIEOrAbsURI(context.base);
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

        } else {
            // seq 5.2

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
                    local_newSubject = context.parseTermOrCURIEOrAbsURI(context.base);
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

    }

    if (local_newSubject) {
        if (aboutAtt || resourceAtt || local_typedResource) {
            let id = local_newSubject;
            if (typeofAtt && !aboutAtt && !resourceAtt && local_currentObjectResource) {
                id = local_currentObjectResource;
            }
            // TODO
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

// seq 9
    if (local_currentObjectResource) {
        if (relAtt && inlistAtt) {
            console.log('Warning: inlist not yet implemented..');
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
                        : (contentAtt
                                ? contentAtt
                                : ts.text().trim()
                        );
            }
        } else if (contentAtt) {
            datatype = PlainLiteralURI;
            content = ts.prop('content')
        } else if (datetimeAtt) {
            console.log("TODO - seq11 - datetime");
            content = ts.prop('datetime');
            datatype = deriveDateTimeType(content);
            if (!datatype) {
                datatype = PlainLiteralURI;
            }
        } else if (!relAtt && !revAtt) {
            if (resourceAtt) {
                content = context.getURI(ts, 'resource');
            }
            if (!content && hrefAtt) {
                content = context.getURI(ts, 'href');
            } else if (!contentAtt && srcAtt) {
                content = context.getURI(ts, 'src');
            }
            if (content) {
                datatype = objectURI;
            }

        }
        if (!datatype) {
            if (typeofAtt && (!aboutAtt && aboutAtt != '')) {
                datatype = objectURI;
                content = local_typedResource;
            } else {
                content = ts.text();
                if (inHTMLMode && ts.is('time')) {
                    datatype = deriveDateTimeType(content);
                }
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
                        addTriple(local_newSubject, predicate, rdf.environment.createLiteral(ts.text(), local_language, datatype));
                    } else {
                        if (datatype && datatype == objectURI)
                            addTriple(local_newSubject, predicate, content);
                        else if (datatype && datatype != PlainLiteralURI)
                            addTriple(local_newSubject, predicate, rdf.environment.createLiteral(content, local_language, datatype));
                        else
                            addTriple(local_newSubject, predicate, rdf.environment.createLiteral(content, local_language, null));
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
                // TODO: unclear what to do here
                // context.incompleteTriples.push(new incompleteTriples(rdf.environment.createLiteral(local_newSubject, local_language, objectURI), icT.predicate, null, 'WTF'))
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
            ctx = new Context(
                context.base,
                context.parentSubject,
                context.parentObject,
                context.incompleteTriples,
                local_iriMappings,
                local_language,
                context.iriMappings,
                context.termMappings,
                local_defaultVocabulary
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
                local_language,
                local_iriMappings,
                local_termMappings,
                local_defaultVocabulary
            );

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

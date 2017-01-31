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

const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const rdf = require('rdf');

require('./classes.js');
const crawler = require('./crawler.js');

const INHTMLMODE = true;

let logger = false;
function setLogger(value) {
    logger = value;
}

let triples = [];
function myPredicate () {
    this.predicate;
    this.objects = [];

    this.toString = function () {
        let ret = this.predicate.toNT() + " ";

        for(let i = 0;i < this.objects.length - 1; i++) {
            ret += this.objects[i].toNT() + ", ";
        }

        ret += this.objects[this.objects.length - 1].toNT();

        return ret;
    }
}

function myTriple () {
    this.subject;
    this.predicates = [];

    this.toString = function () {
        let ret = this.subject.toNT();

        for (let i = 0; i < this.predicates.length - 1; i++) {
            ret += "\t" + this.predicates[i].toString() + ";\n";
        }

        ret += "\t" + this.predicates[this.predicates.length - 1].toString() + "."

        return ret;
    }
}

const PlainLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
const typeURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const usesVocab = 'http://www.w3.org/ns/rdfa#usesVocabulary';
const XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
const objectURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

const rdfaCopyPredicate = "http://www.w3.org/ns/rdfa#copy";
const rdfaPatternType = "http://www.w3.org/ns/rdfa#Pattern";

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
        let matched = dateTimeTypes[i].pattern.exec(value);
        if (matched && matched[0].length == value.length) {
            return dateTimeTypes[i].type;
        }
    }
    return null;
}

function copyProperties () {
    let copySubjects = [];
    let patternSubjects = {};

    for (let j = 0; j < triples.length; j++) {
        let snode = triples[j];
        let pnode = null;

        // if predicate is NOT copy-predicate, continue
        for (let k = 0; k < snode.predicates.length; k++) {
            if (snode.predicates[k].predicate.valueOf() == rdfaCopyPredicate)
                pnode = snode.predicates[k];
        }
        if (!pnode)
            continue;

        copySubjects.push(snode.subject);

        // go threw all objects of the actual predicate
        for (let i = 0; i < pnode.objects.length; i++) {
            if(pnode.objects[i].nodeType() == 'NamedNode')
                continue;

            // search all subjects to copy
            let target = pnode.objects[i].valueOf();
            let patternSubjectNode = null;
            for (let k = 0; k < triples.length; k++) {
                if (triples[k].subject.valueOf() == target)
                    patternSubjectNode = triples[k];
            }
            if (!patternSubjectNode) {
                continue;
            }

            let patternTypes = null;
            for (let k = 0; k < patternSubjectNode.predicates.length; k++) {
                if (patternSubjectNode.predicates[k].predicate.valueOf() == typeURI)
                    patternTypes = patternSubjectNode.predicates[k];
            }
            if (!patternTypes) {
                continue;
            }

            // checking if it is a pattern
            let isPattern = false;
            for (let l = 0; l < patternTypes.objects.length && !isPattern; l++) {
                if (patternTypes.objects[l].valueOf() == rdfaPatternType) {
                    isPattern = true;
                }
            }
            if (!isPattern) {
                continue;
            }

            patternSubjects[target] = true;
            for (let k = 0; k < patternSubjectNode.predicates.length; k++) {
                let targetPNode = patternSubjectNode.predicates[k];

                if (targetPNode.predicate.valueOf() == typeURI) {
                    if (targetPNode.objects.length==1) {
                        continue;
                    }
                    else {
                        print("Warning: at copy Properties, this is not implemented yet");
                        return;
                        // for (let l = 0; l < targetPNode.objects.length; l++) {
                        //     if (targetPNode.objects[l].value != rdfaPatternType) {
                        //         let subjectPNode = snode.predicates[predicate];
                        //         if (!subjectPNode) {
                        //             subjectPNode = new myPredicate();
                        //             snode.predicates.push(subjectPNode);
                        //         }
                        //         subjectPNode.objects.push(targetPNode.objects[l]);
                        //     }
                        // }
                    }
                } else {
                    let subjectPNode = null;
                    for(let l = 0; l < snode.predicates.length; l++) {
                        if(snode.predicates[l].predicate.equals(targetPNode))
                            subjectPNode = snode.predicates[l].predicate;
                    }
                    if (!subjectPNode) {
                        subjectPNode = targetPNode;
                        addTriple(snode.subject, subjectPNode, null)
                    }
                }
            }
        }
    }

    // delete copy and pattern triples
    for (let i = 0; i < copySubjects.length; i++) {
        for(let k = 0; k < triples.length; k++) {
            if(triples[k].subject.equals(copySubjects[i]))
            {
                let snode = triples[k];
                for(let l = 0; l < snode.predicates.length; l++) {
                    if(snode.predicates[l].predicate.valueOf() == rdfaCopyPredicate)
                        snode.predicates.splice(l, 1);
                }
            }
        }
    }

    for (let subject in patternSubjects) {
        for(let i = 0; i < triples.length; i++) {
            if(subject.equals(triples[i].subject))
                triples.splice(i, 1);
        }
    }
}

/**
 * adds a Triple to the Graph
 * @param sub
 * @param pre
 * @param obj
 */
function addTriple(sub, pre, obj) {

    if(sub == null) {
        print('Warning: sub == null, cannot create triple!');
        return;
    }

    if (sub.nodeType() != 'BlankNode')
        sub = rdf.environment.createNamedNode(sub);

    let triple = new myTriple();
    let predicate = new myPredicate();

    let newTriple = true;
    for(let i = 0; i < triples.length; i++) {
        if(triples[i].subject.equals(sub)) {
            triple = triples[i];
            newTriple = false;
            break;
        }
    }

    triple.subject = sub;

    if(pre instanceof myPredicate) {
        triple.predicates.push(pre);
    } else {
        pre = rdf.environment.createNamedNode(pre);

        let newPredicate = true;
        for (let i = 0; i < triple.predicates.length; i++) {
            if (triple.predicates[i].predicate.equals(pre)) {
                predicate = triple.predicates[i];
                newPredicate = false;
                break;
            }
        }

        if (newPredicate) {
            predicate.predicate = pre;
            triple.predicates.push(predicate);
        }

        if (obj) {
            if (obj.nodeType() != 'BlankNode' && !(obj instanceof rdf.Literal))
                obj = rdf.environment.createNamedNode(obj);
            predicate.objects.push(obj);
        }
    }


    if(newTriple)
        triples.push(triple);
}

/**
 * parses RDFa from html
 * @param html
 * @param base optional set base to a specific value
 * @param callback
 */
const parseRDFa = function (html, base = null) {

    triples = [];

    rdf.setBuiltins();

    if(base == null) base = 'http://localhost/index.html';

    let $ = cheerio.load(html);

    $(':root').each(function () {
        let ts = $(this);
        let ctx = getInitialContext($, base);

        processElement($, ts, ctx);

    });

    if(INHTMLMODE) {
        copyProperties();
    }

    return triples;
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
            print('Warning: prefix ' + key + ':' + value + ' is supposed to be ' + l_iriMaps[key]);
        }
        l_iriMaps[key] = value;
    }

};

// reference: https://www.w3.org/TR/rdfa-core/#s_sequence
function processElement($, ts, context) {

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

    let inHTMLMode = INHTMLMODE;

    //seq 1
    print('seq 1 is processing');

    let local_skip = false;
    let local_newSubject = null;
    let local_currentObjectResource = null;
    let local_typedResource = null;
    let local_iriMappings = context.iriMappings;
    let local_incompleteTriples = [];
    let local_listMappings = context.listMappings;
    let local_termMappings = context.termMappings;
    let local_defaultVocabulary = context.defaultVocabulary;

    let relAttPredicates = [];
    if (relAtt) {
        let values = Context.tokenize(ts.prop('rel'));
        for (let i = 0; i < values.length; i++) {
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
            let predicate = context.parsePredicate(values[i]);
            if (predicate) {
                revAttPredicates.push(predicate);
            }
        }
    }


    //seq 2
    if (vocabAtt) {
        print('seq 2 is processing');

        let value = context.getURI(ts, 'vocab');
        if (value.length > 0) {
            local_defaultVocabulary = value;
            addTriple(context.base, usesVocab, local_defaultVocabulary);
            context.defaultVocabulary = local_defaultVocabulary;
        } else {
            local_defaultVocabulary = context.defaultVocabulary;
        }

    }

    // seq 3
    if (prefixAtt) {
        print('seq 3 is processing');

        add_local_iriMaps(local_iriMappings, prefixAtt);
    }

    // seq 4
    print('seq 4 is processing');

    let local_language = $('[xml\\:lang]').prop('xml:lang');
    if (local_language == undefined)
        local_language = ts.prop('lang');
    if (local_language == undefined)
        local_language = context.language;

    // seq 6
    if (relAtt == '' || relAtt || revAtt == '' || revAtt) {
        print("seq6 is processing");

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
            print("seq5.1 is processing");

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
            print("seq5.2 is processing");

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

                    if (!propertyAtt) {
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
                print('Warning: set id = local_currentObjectResource');
            }
        }
    }

    // seq 7
    if (local_typedResource != null) {
        print('seq 7 is processing');

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

    // seq 8
    if (local_newSubject && local_newSubject != context.parentObject) {
        print('seq 8 is processing (Warning: TODO)');
    }

// seq 9
    if (local_currentObjectResource) {
        print('seq 9 is processing');

        if (relAtt && inlistAtt) {
            print('Warning: inlist not yet implemented');
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
        print('seq 10 is processing');

        if (local_newSubject && !local_currentObjectResource && (relAtt || revAtt)) {
            local_currentObjectResource = rdf.environment.createBlankNode();
        }

        if (relAtt && inlistAtt) {
            print('Warning: inlist not yet implemented');

        } else if (relAtt) {
            let relAtt = context.getURI(ts, 'rel');
            for (let i = 0; i < relAtt.length; i++) {
                local_incompleteTriples.push(new incompleteTriples(null, relAtt[i], null, 'forward'))
            }
        }

        if (revAtt) {
            let revAtt = context.getURI(ts, 'rev');
            for (let i = 0; i < revAtt.length; i++) {
                local_incompleteTriples.push(new incompleteTriples(null, revAtt[i], null, 'reverse'))
            }
        }

    }


// seq 11
    if (propertyAtt) {
        print('seq 11 is processing');

        let datatype = null;
        let content = null;

        if (datatypeAtt) {
            datatype = datatypeAtt == '' ? PlainLiteralURI : context.getURI(ts, 'datatype');

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
                    print('Warning: inlist not yet implemented');
                } else {
                    if (datatype == XMLLiteralURI || datatype == HTMLLiteralURI) {
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
    if (!local_skip && local_newSubject) {
        print('seq 12 is processing');

        for (let i = 0; i < context.incompleteTriples.length; i++) {
            let icT = context.incompleteTriples[i];
            if (icT.direction == 'none') {
                print('Warning: direction = none');
            } else if (icT.direction == 'forward') {
                addTriple(context.parentSubject, icT.predicate, local_newSubject);
            } else if (icT.direction == 'reverse') {
                addTriple(local_newSubject, icT.predicate, context.parentSubject);
            }
        }
    }

// seq 13
    print('seq 13 is processing');

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

function print(info) {
    if(logger) console.log(info);
}

exports.parseRDFa = parseRDFa;
exports.setLogger = setLogger;
'use strict';
const rdf = require('rdf');

const SCHEME = /^[A-Za-z][A-Za-z0-9\+\-\.]*\:/;

const nameChar = '[-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF\.0-9\u00B7\u0300-\u036F\u203F-\u2040]';
const nameStartChar = '[\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3\u4E00-\u9FA5\u3007\u3021-\u3029_]';
const NCNAME = new RegExp('^' + nameStartChar + nameChar + '*$');
const absURIRE = /[\w\_\-]+:\S+/;

const list_types = ["rel", "rev", "property", "typeof", "role"];

const type_of = {
    "href": "uri",
    "src": "uri",
    "vocab": "uri",

    "about": "CURIEorURI",
    "resource": "CURIEorURI",

    "rel": "TERMorCURIEorAbsURI",
    "rev": "TERMorCURIEorAbsURI",
    "datatype": "TERMorCURIEorAbsURI",
    "typeof": "TERMorCURIEorAbsURI",
    "property": "TERMorCURIEorAbsURI",
    "role": "TERMorCURIEorAbsURI"
};

class incompleteTriples extends rdf.Triple {
    constructor(s, p, o, direction) {
        super(s, p, o);
        this._direction = direction;
    }

    get direction() {
        return this._direction;
    }
}

class Context {

    constructor(base,
                parentSubject,
                parentObject,
                incompleteTriples,
                listMappings,
                language,
                iriMappings,
                termMappings,
                defaultVocabulary) {

        if (typeof base == 'string')
            this.base = base;
        else
            this._base = base;

        if (typeof parentSubject == 'string')
            this.parentSubject = parentSubject;
        else
            this._base = base;

        this._parentObject = parentObject;
        this._incompleteTriples = incompleteTriples;
        this._listMappings = listMappings;
        this._language = language;
        this._iriMappings = iriMappings;
        this._termMappings = termMappings;
        this._defaultVocabulary = defaultVocabulary;
    }

    set base(value) {
        this._base = this.parseURI(value);
    }

    get base() {
        return this._base;
    }

    get defaultVocabulary() {
        return this._defaultVocabulary;
    }

    set parentSubject(value) {
        this._parentSubject = this.parseURI(value);
    }

    get parentSubject() {
        return this._parentSubject;
    }

    get incompleteTriples() {
        return this._incompleteTriples;
    }

    get parentObject() {
        return this._parentObject;
    }

    get termMappings() {
        return this._termMappings;
    }

    get iriMappings() {
        return this._iriMappings;
    }

    get listMappings() {
        return this._listMappings;
    }

    get language() {
        return this._language;
    }

    static trim(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    static tokenize(str) {
        return Context.trim(str).split(/\s+/);
    }


    parseTermOrCURIEOrAbsURI(value) {
        //alert("Parsing "+value+" with default vocab "+defaultVocabulary);
        value = Context.trim(value);
        let curie = this.parseCURIE(value);
        if (curie) {
            return curie;
        } else if (this._termMappings) {
            if (this.defaultVocabulary && !absURIRE.exec(value)) {
                return this.defaultVocabulary + value
            }
            let term = this._termMappings[value];
            if (term) {
                return term;
            }
            let lcvalue = value.toLowerCase();
            term = this._termMappings[lcvalue];
            if (term) {
                return term;
            }
        }
        if (absURIRE.exec(value)) {
            return this.resolveAndNormalize(base, value);
        }
        return null;
    }

    static parseGeneric(parsed) {
        if (parsed.schemeSpecificPart.charAt(0) != '/' || parsed.schemeSpecificPart.charAt(1) != '/') {
            throw "Generic URI values should start with '//':" + parsed.spec;
        }

        let work = parsed.schemeSpecificPart.substring(2);
        let pathStart = work.indexOf("/");
        parsed.authority = pathStart < 0 ? work : work.substring(0, pathStart);
        parsed.path = pathStart < 0 ? "" : work.substring(pathStart);
        let hash = parsed.path.indexOf('#');
        if (hash >= 0) {
            parsed.fragment = parsed.path.substring(hash + 1);
            parsed.path = parsed.path.substring(0, hash);
        }
        let questionMark = parsed.path.indexOf('?');
        if (questionMark >= 0) {
            parsed.query = parsed.path.substring(questionMark + 1);
            parsed.path = parsed.path.substring(0, questionMark);
        }
        if (parsed.path == "/" || parsed.path == "") {
            parsed.segments = [];
        } else {
            parsed.segments = parsed.path.split(/\//);
            if (parsed.segments.length > 0 && parsed.segments[0] == '' && parsed.path.length > 1 && parsed.path.charAt(1) != '/') {
                // empty segment at the start, remove it
                parsed.segments.shift();
            }
            if (parsed.segments.length > 0 && parsed.path.length > 0 && parsed.path.charAt(parsed.path.length - 1) == '/' && parsed.segments[parsed.segments.length - 1] == '') {
                // we may have an empty the end
                // check to see if it is legimate
                if (parsed.path.length > 1 && parsed.path.charAt(parsed.path.length - 2) != '/') {
                    parsed.segments.pop();
                }
            }
            // check for non-escaped characters
            for (let i = 0; i < parsed.segments.length; i++) {
                let check = parsed.segments[i].split(/%[A-Za-z0-9][A-Za-z0-9]|[\ud800-\udfff][\ud800-\udfff]|[A-Za-z0-9\-\._~!$&'()*+,;=@:\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+/);

                for (let j = 0; j < check.length; j++) {
                    if (check[j].length > 0) {
                        throw "Unecaped character " + check[j].charAt(0) + " (" + check[j].charCodeAt(0) + ") in URI " + parsed.spec;
                    }
                }
            }
        }
        parsed.isGeneric = true;
    };

    parseURI(uri) {
        let match = SCHEME.exec(uri);
        if (!match) {
            throw "Bad URI value, no scheme: " + uri;
        }
        let parsed = {spec: uri};
        parsed.scheme = match[0].substring(0, match[0].length - 1);
        parsed.schemeSpecificPart = parsed.spec.substring(match[0].length);
        if (parsed.schemeSpecificPart.charAt(0) == '/' && parsed.schemeSpecificPart.charAt(1) == '/') {
            Context.parseGeneric(parsed);
        } else {
            parsed.isGeneric = false;
        }
        parsed.normalize = function () {
            if (!this.isGeneric) {
                return;
            }
            if (this.segments.length == 0) {
                return;
            }
            // edge case of ending in "/."
            if (this.path.length > 1 && this.path.substring(this.path.length - 2) == "/.") {
                this.path = this.path.substring(0, this.path.length - 1);
                this.segments.splice(this.segments.length - 1, 1);
                this.schemeSpecificPart = "//" + this.authority + this.path;
                if (typeof this.query != "undefined") {
                    this.schemeSpecificPart += "?" + this.query;
                }
                if (typeof this.fragment != "undefined") {
                    this.schemeSpecificPart += "#" + this.fragment;
                }
                this.spec = this.scheme + ":" + this.schemeSpecificPart;
                return;
            }
            let end = this.path.charAt(this.path.length - 1);
            if (end != "/") {
                end = "";
            }
            for (let i = 0; i < this.segments.length; i++) {
                if (i > 0 && this.segments[i] == "..") {
                    this.segments.splice(i - 1, 2);
                    i -= 2;
                }
                if (this.segments[i] == ".") {
                    this.segments.splice(i, 1);
                    i--;
                }
            }
            this.path = this.segments.length == 0 ? "/" : "/" + this.segments.join("/") + end;
            this.schemeSpecificPart = "//" + this.authority + this.path;
            if (typeof this.query != "undefined") {
                this.schemeSpecificPart += "?" + this.query;
            }
            if (typeof this.fragment != "undefined") {
                this.schemeSpecificPart += "#" + this.fragment;
            }
            this.spec = this.scheme + ":" + this.schemeSpecificPart;
        };
        parsed.resolve = function (href) {
            if (!href) {
                return this.spec;
            }
            if (href.charAt(0) == '#') {
                let lastHash = this.spec.lastIndexOf('#');
                return lastHash < 0 ? this.spec + href : this.spec.substring(0, lastHash) + href;
            }
            if (!this.isGeneric) {
                throw "Cannot resolve uri against non-generic URI: " + this.spec;
            }
            // let colon = href.indexOf(':');
            if (href.charAt(0) == '/') {
                return this.scheme + "://" + this.authority + href;
            } else if (href.charAt(0) == '.' && href.charAt(1) == '/') {
                if (this.path.charAt(this.path.length - 1) == '/') {
                    return this.scheme + "://" + this.authority + this.path + href.substring(2);
                } else {
                    let last = this.path.lastIndexOf('/');
                    return this.scheme + "://" + this.authority + this.path.substring(0, last) + href.substring(1);
                }
            } else if (SCHEME.test(href)) {
                return href;
            } else if (href.charAt(0) == "?") {
                return this.scheme + "://" + this.authority + this.path + href;
            } else {
                if (this.path.charAt(this.path.length - 1) == '/') {
                    return this.scheme + "://" + this.authority + this.path + href;
                } else {
                    let last = this.path.lastIndexOf('/');
                    return this.scheme + "://" + this.authority + this.path.substring(0, last + 1) + href;
                }
            }
        };
        parsed.relativeTo = function (otherURI) {
            if (otherURI.scheme != this.scheme) {
                return this.spec;
            }
            if (!this.isGeneric) {
                throw "A non generic URI cannot be made relative: " + this.spec;
            }
            if (!otherURI.isGeneric) {
                throw "Cannot make a relative URI against a non-generic URI: " + otherURI.spec;
            }
            if (otherURI.authority != this.authority) {
                return this.spec;
            }
            let i = 0;
            for (; i < this.segments.length && i < otherURI.segments.length; i++) {
                if (this.segments[i] != otherURI.segments[i]) {
                    //alert(this.path+" different from "+otherURI.path+" at '"+this.segments[i]+"' vs '"+otherURI.segments[i]+"'");
                    let offset = otherURI.path.charAt(otherURI.path.length - 1) == '/' ? 0 : -1;
                    let relative = "";
                    for (let j = i; j < otherURI.segments.length + offset; j++) {
                        relative += "../";
                    }
                    for (let j = i; j < this.segments.length; j++) {
                        relative += this.segments[j];
                        if ((j + 1) < this.segments.length) {
                            relative += "/";
                        }
                    }
                    if (this.path.charAt(this.path.length - 1) == '/') {
                        relative += "/";
                    }
                    return relative;
                }
            }
            if (this.segments.length == otherURI.segments.length) {
                return this.hash ? this.hash : (this.query ? this.query : "");
            } else if (i < this.segments.length) {
                let relative = "";
                for (let j = i; j < this.segments.length; j++) {
                    relative += this.segments[j];
                    if ((j + 1) < this.segments.length) {
                        relative += "/";
                    }
                }
                if (this.path.charAt(this.path.length - 1) == '/') {
                    relative += "/";
                }
                return relative;
            } else {
                throw "Cannot calculate a relative URI for " + this.spec + " against " + otherURI.spec;
            }
        };
        return parsed;
    }

    resolveAndNormalize(href) {
        let u = this.base.resolve(href);
        let parsed = this.parseURI(u);
        parsed.normalize();
        return parsed.spec;
    }

    parsePredicate(value) {
        if (value == "") {
            return null;
        }
        var predicate = this.parseTermOrCURIEOrAbsURI(value);
        if (predicate && predicate.indexOf("_:") == 0) {
            return null;
        }
        return predicate;
    };

    parseSafeCURIEOrCURIEOrURI(value) {
        value = Context.trim(value);
        if (value.charAt(0) == '[' && value.charAt(value.length - 1) == ']') {
            value = value.substring(1, value.length - 1);
            value = value.trim(value);
            if (value.length == 0) {
                return null;
            }
            if (value == "_:") {
                // the one node
                return this.theOne;
            }
            return this.parseCURIE(value);
        } else {
            return this.parseCURIEOrURI(value);
        }
    }

    parseCURIE(value) {
        let uri;
        let colon = value.indexOf(":");
        if (colon >= 0) {
            let prefix = value.substring(0, colon);
            if (prefix == "") {
                // default prefix
                uri = prefixes[""];
                return uri ? uri + value.substring(colon + 1) : null;
            } else if (prefix == "_") {
                // blank node
                return "_:" + value.substring(colon + 1);
            } else if (NCNAME.test(prefix)) {
                uri = prefixes[prefix];
                if (uri) {
                    return uri + value.substring(colon + 1);
                }
            }
        }
        return null;
    };

    parseCURIEOrURI(value) {
        let curie = this.parseCURIE(value);
        if (curie) {
            return curie;
        }
        return this.resolveAndNormalize(value);
    };

    getURI(element, property) {

        let value = element.prop(property);

        if (list_types.indexOf(property) >= 0) {

            let values = Context.tokenize(value);
            let list = [];
            for (let i = 0; i < values.length; i++) {
                let object = this.parseTermOrCURIEOrAbsURI(values[i], vocabulary, context.terms, prefixes, base);
                list.push(object);
            }

            if (list.length == 1) {
                return list[0];
            } else {
                return list;
            }


        } else {
            if (type_of[property] == "uri") {
                return this.resolveAndNormalize(value);

            } else if (type_of[property] == "CURIEorURI") {
                return this.parseCURIEOrURI(value);

            } else if (type_of[property] == "TERMorCURIEorAbsURI") {
                return this.parseTermOrCURIEOrAbsURI(value)

            }

        }

    }


}

global.Context = Context;
global.incompleteTriples = incompleteTriples;

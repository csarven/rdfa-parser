'use strict';
const rdf = require('rdf');

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
    // base = null;
    // parentSubject = null;
    // parentObject = null;
    // iriMappings = null;
    // incompleteTriples = null;
    // listMappings = null;
    // language = null;
    // termMappings = null;
    // defaultVocabulary = null;

    constructor(base,
                parentSubject,
                parentObject,
                incompleteTriples,
                listMappings,
                language,
                iriMappings,
                termMappings,
                defaultVocabulary) {
        this._base = base;
        this._parentSubject = parentSubject;
        this._parentObject = parentObject;
        this._incompleteTriples = incompleteTriples;
        this._listMappings = listMappings;
        this._language = language;
        this._iriMappings = iriMappings;
        this._termMappings = termMappings;
        this._defaultVocabulary = defaultVocabulary;
    }

    get base() { return this._base; }
    // set base(base) { this._base = base; }
    get defaultVocabulary() { return this._defaultVocabulary; }
    get parentSubject() { return this._parentSubject; }
    get incompleteTriples() { return this._incompleteTriples; }
    get parentObject() { return this._parentObject; }
    get termMappings() { return this._termMappings; }
    get iriMappings() { return this._iriMappings; }
    get listMappings() { return this._listMappings; }
    get language() { return this._language; }

}

global.Context = Context;
global.incompleteTriples = incompleteTriples;

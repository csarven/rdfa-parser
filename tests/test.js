/**
 * Created by roland on 11/26/16.
 */

let rdfa = require('../routes/rdfa_parser.js');

let rdf = rdfa.getIRI('http://iricelino.org/rdfa/sample-annotated-page.html');

console.log(rdf);



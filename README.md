# RDFa-parser

link zur Präsentation für den Statusreport am 14.12.2016:
https://docs.google.com/presentation/d/1CJmV5xhEf7Nbu7XPuQb4Kb2ZhCCbTpilCIdOeqPygdQ/edit?usp=sharing

RDF-Core-Sequence: https://www.w3.org/TR/rdfa-syntax/#s_sequence

RDF-Interface: https://www.w3.org/TR/rdf-interfaces/#idl-def-RDFNode

# Known Issues:

###  Negativ tests:
0140, 0311 -> no triples are generated

### Strange:
0214 -> sometimes it works, sometimes it doesn't

### Real Issues:
0263 and 0264 -> tripple is added incorrectly (error must be in 'addTriple')

0301 -> new Subject origin

0321 -> copy ???





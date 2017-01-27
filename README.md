# RDFa-parser

link zur Präsentation für den Statusreport am 14.12.2016:
https://docs.google.com/presentation/d/1CJmV5xhEf7Nbu7XPuQb4Kb2ZhCCbTpilCIdOeqPygdQ/edit?usp=sharing

RDF-Core-Sequence: https://www.w3.org/TR/rdfa-syntax/#s_sequence

RDF-Interface: https://www.w3.org/TR/rdf-interfaces/#idl-def-RDFNode

# TO-DO

Parser - soweit fertig (evtl. bug fixes)

Crawler - soweit fertig (evtl. console.log() )

Frontend - Append triples from >1 Website

Fertiges Packet - welche Funktionen enthalten (zB Frontend nicht?) und wie erstellen

Readme - fertig stellen

Präsentation fertigstellen (selber Link wie für Statusreport) //
Dokumentation erstellen (4-6 Seiten, Inhalt siehe Kursunterlagen)

# Known Issues:

### Containing JavaScript:
cheerio can't execute js from parsed files. tests:
0065, 0176

### inlist:
inlist not yet implemented. tests: 0218

### Real Issues:
0266 0267 0268 -> ?a sameAs ?b <=> ?b sameAs ?a is not true with our test db





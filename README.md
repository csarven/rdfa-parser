# RDFa-parser

JavaScript (Node) based program to crawl WWW and parse RDFa annotated information. HTML Contents of acessable URLs are downloaded, and than RDFa information is extracted by applying RDF Core Sequence. Output is a list of RDFa Triples. Following methods are provided:

RDF-Core-Sequence: https://www.w3.org/TR/rdfa-syntax/#s_sequence

RDF-Interface: https://www.w3.org/TR/rdf-interfaces/#idl-def-RDFNode

npm module: https://www.npmjs.com/package/rdfa-parser

### parseRDFa(html, base)

Parameter | Datatype | Description
--- | --- | ---
html | String | HTML content
base | String | URL which provides the HTML document

### crawler(start, depth, callback, whitelist, blacklist)

Parameter | Datatype | Description
--- | --- | ---
start | String | URL which provides the initial HTML document
depth | int | Depth of crawler (URL linkage)
callback | function | Function implementing HTML parsing and RDFa Triple usage
whitelist | String Array | Optional list, containing URLs (Subdomains) allowed to be accessed
blacklist | String Array | Optional list, containing URLs (Subdomains) not allowed to be accessed

### Use 

Parse single HTML document
```javascript
var rdfaParser = require("rdfa-parser");
var request = require("request");
let base = "http://booking.com";

request(base, function (error, response, html) {
    let triples = rdfaParser.parseRDFa(html, base);
    for (let i = 0; i < triples.length; i++) {
        console.log(triples[i].toString());
    }
});
```

WWW crawl from start URL, linking depth of 2, no black-/whitelisting
```javascript
var rdfaParser = require("rdfa-parser");
var request = require("request");
let start = "http://booking.com";
let depth = 2;
 
rdfaParser.crawler(start, depth, function (base) {
    request(base, function (error, response, html) {
        let triples = rdfaParser.parseRDFa(html, base);
        for (let i = 0; i < triples.length; i++) {
            console.log(triples[i].toString());
        }
    });
});
```

# TO-DO

Bugfixes

Extend Funtionality

# Known Issues:

### Containing JavaScript:
cheerio can't execute js from parsed files. tests:
0065, 0176

### inlist:
inlist not yet implemented. tests: 0218

### Real Issues:
0266 0267 0268 -> ?a sameAs ?b <=> ?b sameAs ?a is not true with our test db





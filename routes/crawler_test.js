/**
 * Test for crawler
 * 
 * use module "crawler.js"
 * 
 */
var crawler = require('./crawler.js');
var u1 = 'http://www.booking.com/hotel/at/gasthof-zur-traube-pettneu-am-arlberg1.de.html';
var u2 = 'http://uibk.ac.at';
var crawlerDepth1 = 1;
var crawlerDepth2 = 2;

/** 
 * Pretty much same function as getHTML() -> new Param: "cd" (depth to crawl)
 */
function parseHTML(s, cd, cb){
	
	if(s.startsWith('http')){
		crawler(s, cd, cb);
	}
}


/** 
 * Pretty much same function as parseRDFa() -> skipped Param: "base", "store"; new Param: "cd" (depth to crawl)
 */
function parseR(source, cd, callback) {
	
	parseHTML(source, cd, function(par){
		console.log('here new: ', par);
		
		callback();
	});
}


/** 
 * callback function for "callback(global.store)" in parseRDFa function
 */
function tempCallback(){
	console.log('Finished parsing this HTML - last callback function');
}

/**
 * call parseRDFa function (here skipping parameter: store, base; new parameter: cd)
 */
parseR(u1, crawlerDepth1, tempCallback);
setTimeout(parseR, 5000, u2, crawlerDepth2, tempCallback);

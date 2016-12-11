/**
 * Crawler for rdfa_parser.js
 * 
 * Only use this function if URL is used for parsing rdfa triples 
 * 
 * @Dependency simplecrawler	API: https://docs.omniref.com/js/npm/simplecrawler/0.0.9
 * 								Example: https://docs.omniref.com/js/npm/simplecrawler/0.2.0/symbols/Crawler#tab=Docs
 * 
 */
var Crawler = require("simplecrawler");
var cheerio = require('cheerio');			// In finaler version nicht benötigt?


/** 
 * Configuration of crawler
 * 
 * mConcur	Amount of concurrent (simultaneous) requests (DEFAULT: 5)
 * interv	time between request (interval in milli seconds - DEFAULT: 250)
 * subd		True if sudbomains should be scanned as well (DEFAULT: false)
 * wl		Whitelist (domains, that are to be crawled)
 * bl		Blacklist
 */
var mConcur = 5;
var interv = 250;
var subD = false;						// evtl. als Parameter übergeben? 
var wl = ['community.uibk.ac.at'];		// evtl. als Parameter übergeben? 
var bl = ['lfuonline.uibk.ac.at'];		// evtl. als Parameter übergeben? 


/**
 * store visited urls from start page
 */
var urls = [];	// In finaler version nicht benötigt?


/** 
 * Crawl the web from a given start page - only stay on same domain
 * @param 	url_n	URL to start crawling
 * @param	cDepth	Depth of crawler (1 - only given url; 2 - all links in same domain of url; 3 - all links from links in same domain of url; etc.
 * @param 	cb		Callback function: parse RDFa from current html document
 * @return	none
 */
function myCrawler(url, cDepth, cb){
	
	// Set time measure and initialize 'simplecrawler' instance
	console.time('crawler needed');	
	var crawler = new Crawler(url);
	
	
	// Set crawler configuration
	crawler.interval = interv; 			
	crawler.maxConcurrency = mConcur;	
	crawler.maxDepth = cDepth;				

	
	// Black- and Whitelisting of (Sub-)Domains
	crawler.scanSubdomains = subD;		// if "true" -> no blacklisting of subdomains possible
	crawler.domainWhitelist = wl;	
	crawler.domainBlacklist = bl; 
	
	
	// Fetch conditions for crawler (do not load resources with endings: .xsl, .pdf, etc.) 
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
		return !queueItem.path.match(/\.xsl$/i);	
	});
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
    	return !queueItem.path.match(/\.pdf$/i);	
	});
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
    	return !queueItem.path.match(/\.css$/i);	
	});
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
    	return !queueItem.path.match(/\.js$/i);	
	});
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
    	return !queueItem.path.match(/\.jpg$/i);	
	});
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
    	return !queueItem.path.match(/\.png$/i);	
	});
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {
    	return !queueItem.path.match(/\.php$/i);	
	});
	
	// Funkt nicht: wenn Dateiendung .html fehlt (vgl. http://www.uibk.ac.at)
	/*	
	crawler.addFetchCondition(function(queueItem, referrerQueueItem) {		
    	return queueItem.path.match(/\.html$/i);	
	});
	*/
	
	
	// When crawler is started, print out starting URL
	crawler.on('crawlstart', function(){
		console.log('########################################################################\n');
		console.log('Start from page: ', url, '\n');	// In finaler version nicht benötigt?
		urls = [];
	});
	
	
	// In finaler version nicht benötigt (When crawler is finished)?
	crawler.on('complete', function(){
		console.log();
		console.timeEnd('crawler needed');
		console.log('Number of pages visited: ', urls.length);
		console.log('crawler.maxDepth = ', cDepth);
		console.log('\nURLs: ');
		for(var u in urls){
			console.log( urls[u] );
		}
		
		// Plan B: rdf parsing erst starten, wenn crawler beendet ist
		 
	});
	
	
	// For each completed download of url content ('fetchcomplete')
	crawler.on('fetchcomplete', function(queueItem, responseBuffer, response){
	
		// for each queued item 
		if(queueItem){	
			
			// In finaler version nicht benötigt?
			var $ = cheerio.load(responseBuffer);				// load current html with cheerio
			var resType = response.headers['content-type'];		// type of resource (text/html, script/javascript, etc.)
			var title = $('head').find('title').text();			// title of current html document (muss nicht unbedingt vorhanden sein)
		
			// In finaler version nicht benötigt (Nur html pages mit Titel parsen)?
			if( title !== '' ){		
				
				// Nur für Variante 1 benötigt
				urls.push(queueItem.url);	// add current URL to array
				
				/** TODO: rdf parsing starten, bei jeder page (In "rdfa_parser.js" bei methode "getHTML")
				 * 
				 * ...
				 * 
				 * if (source.startsWith('http')) {
				 * 		myCrawler(source, crawlDepth, callback); 
				 * }
				 * 
				 * ...
				 * 
				 */
				cb( title );	// In finaler Version: "responseBuffer" (current html to load with cheerio module (in RDFa_parser)) anstatt "title"
				//cb( responseBuffer );
			}
		}
	
	});
	
	
	// Start web crawler
	crawler.start();
	
}


/**
 * Export myCrawler function
 */
module.exports = myCrawler;

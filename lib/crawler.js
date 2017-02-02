/**
 * Crawler for rdfa_parser.js
 *
 * Only use this function if URL is used for parsing rdfa triples
 *
 * @Dependency simplecrawler    API: https://docs.omniref.com/js/npm/simplecrawler/0.0.9
 *                                Example: https://docs.omniref.com/js/npm/simplecrawler/0.2.0/symbols/Crawler#tab=Docs
 *
 */
const simplecrawler = require("simplecrawler");
let urls = [];

/**
 * Crawl the web from a given start page and apply RDFa parser on each url/html found
 *
 * Obligatory parameters (all subdomains are allowed to crawl)
 * @param url       URL to start crawling
 * @param depth     Depth of crawler (1 - only given url; 2 - all links from url; 3 - all links from all links from url; etc.
 * @param callback  Callback function: parse RDFa from current html document
 *
 * Optional parameters (configure allowed subdomains: white- and black listing
 * @param callback_finished
 * @param whitelist Subdomain names, that are allowed to crawl
 * @param blacklist Subdomain names, that are not allowed to crawl
 *
 * @return none Applies callback function to the RDFa triple set of each html
 */
function myCrawler(url, depth, callback, callback_finished, whitelist = null, blacklist = null) {

    // Set time measure and initialize 'simplecrawler' instance
    console.time('crawler needed');
    let crawler = new simplecrawler(url);

    // Set crawler configuration
    crawler.interval = 250;
    crawler.maxConcurrency = 5;
    crawler.maxDepth = depth;


    if (blacklist === null) {
        // callback = whitelist;
        crawler.scanSubdomains = true;
    } else {
        crawler.scanSubdomains = false;
        crawler.domainWhitelist = whitelist;
        crawler.domainBlacklist = blacklist;
    }
    crawler.respectRobotsTxt = true;

    // Fetch conditions for crawler (do not load resources with endings: .xsl, .pdf, etc.)
    // Allowing only .html* is not working propperly, if title of html does not include suffix.
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.xsl$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.doc$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.ppt$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.odt$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.ods$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.pdf$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.css$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.js$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.jpg$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.png$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.php$/i);
    });
    crawler.addFetchCondition(function (queueItem) {
        return !queueItem.path.match(/\.ttl$/i);
    });

    // crawler starts
    crawler.on('crawlstart', function () {
        console.log('########################################################################\n');
        console.log('Start from page: ', url, '\n');
        urls = [];
    });

    // crawler ends
    crawler.on('complete', function () {
        console.log();
        console.timeEnd('crawler needed');
        console.log('Number of pages visited: ', urls.length);
        console.log('crawler.maxDepth = ', depth);
        console.log('\nURLs: ');
        for (let u in urls) {
            if (u !== null) {
                console.log(urls[u]);
            }
        }
        console.log('########################################################################\n\n');
        callback_finished();
    });


    // Each successfully completed URL fetch
    crawler.on('fetchcomplete', function (queueItem) {
        if (queueItem) {
            urls.push(queueItem.url);           // add current URL to array
            callback(queueItem.url, url);
        }
    });

    // Start web crawler
    crawler.start();

}

/**
 * Export myCrawler function
 */
exports.myCrawler = myCrawler;
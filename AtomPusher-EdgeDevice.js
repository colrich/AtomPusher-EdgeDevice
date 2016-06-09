

const deviceModule = require('aws-iot-device-sdk').device;
const cmdLineProcess = require('./lib/cmdline');

//begin module
// moment is a date handling library that we use to determine the proper ordering of feed items
var moment = require('moment');

// there is no persistence between runs, so the complete feed is published when run starts; subsequent
// monitoring publishes only new items
var latest = moment(0);

function monitorFeed(args, device) {
    console.log('------------------------------------------------------------------------------------');
    console.log('AWS IoT AtomPusher');
    console.log('- starting the monitor loop for: ' + args.Url);

    // determines whether an item should be published or not by comparing its date to the latest date of
    // all items published so far, returning true only if greater than or equal
    function shouldpublish(item) {
	if (moment(item.date).isAfter(latest) || moment(item.date).isSame(latest)) {
	    latest = moment(item.date);
	    return true;
	}
	else return false;
    };


    // feedparser is what we use to parse the atom feeds
    var FeedParser = require('feedparser');

    // request is a library for making http requests; we use to fetch the feeds
    var request = require('request');

    // request the feed passed as an argument
    var req = request(args.Url, {timeout: 10000, pool: false});
    var feedparser = new FeedParser();

    req.on('error', function (error) {
	console.log('req error!')
    });

    req.on('response', function (res) {
	var stream = this;
	if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
	stream.pipe(feedparser);
    });

    feedparser.on('error', function(error) {
	console.log('parsing error!');
	console.log(error);
    });

    // this array will hold the items returned by the feed parser. the parsing is stream-oriented and
    // the entries are not sorted by date, so we need to collect them for sorting. NOTE: very large
    // feeds may cause out-of-memory!
    var items = [];

    // the 'readable' event is where you should handle items from the feedparser if you want to treat
    // them as a stream. here we simply add them to the items array for sorting later on.
    feedparser.on('readable', function() {
	var stream = this;
	var meta = this.meta;
	var item;

	while (item = stream.read()) {
	    items.push(item);
	}
    });

    // the 'end' event is triggered when the processing is complete. as we collected them into the items
    // array, here is where we do the real processing.
    feedparser.on('end', function() {
	console.log('- There were ' + items.length + ' items in the feed');

	// sort the entries by date, ascending. this way, each item occurred later than (or at the 
	// same time as) the entry before. by sorting this way we produce a system based on publishing 
	// entries only if their datestamps are later than all previously published entries.
	items.sort(function(a,b) {
	    if (moment(b.date).isAfter(moment(a.date))) return -1;
	    else if (moment(a.date).isAfter(moment(b.date))) return 1;
	    else return 0;
	});

	// here we test the datestamp for laterness and publish to the appropriate AWS IoT topic
	var pubcount = 0;
	for (i = 0; i < items.length; i++) {
	    if (shouldpublish(items[i])) {
		// increment the pubcount, used for reporting only
		pubcount++;
		
		// tag the item with our feedtag, which future users of the data can use for categorization
		// or attribution
		items[i].feedtag = args.Tag;

		// publish the item; this sends the entry to the AWS IoT queue
		//		device.publish('feeds', JSON.stringify(items[i]));
	    }
	}

	// we increment latest here by 1 milli; this ensures that the latest entry in the
	// collection isn't republished every time the monitor runs and there are no new
	// items. without this adjustment, that is the expected behavior.
	latest += 1;

	console.log('- published ' + pubcount + ' new items');
	console.log('- new latest: ' + latest);
	console.log('------------------------------------------------------------------------------------');
    });
};

function processTest(args) {
    //
    // The device module exports an MQTT instance, which will attempt
    // to connect to the AWS IoT endpoint configured in the arguments.
    // Once connected, it will emit events which our application can
    // handle.
    //
    const device = deviceModule({
	    keyPath: args.privateKey,
	    certPath: args.clientCert,
	    caPath: args.caCert,
	    clientId: args.clientId,
	    region: args.region,
	    baseReconnectTimeMs: args.baseReconnectTimeMs,
	    keepalive: args.keepAlive,
	    protocol: args.Protocol,
	    port: args.Port,
	    host: args.Host,
	    debug: args.Debug
    });

    var timeout;
    var count = 0;

    // these events are all concerned with the "device" connection to the AWS IoT cloud.
    device.on('connect', function() {
        console.log('+ AtomPusher connected to AWS IoT');
    });
    device.on('close', function() {
	console.log('+ AtomPusher connection to AWS IoT closed');
    });
    device.on('reconnect', function() {
	console.log('+ AtomPusher reconnected to AWS IoT');
    });
    device.on('offline', function() {
	console.log('+ AtomPusher offline from AWS IoT');
    });
    device.on('error', function(error) {
	console.log('+ AtomPusher connection error to AWS IoT', error);
    }); 
    device.on('message', function(topic, payload) {
	console.log('+ AtomPusher received message on topic (unusual activity)', topic, payload.toString());
    });


    // this invokes the monitor every 'interval' millis
    function makeinterval(callback, args, device, interval) {
	return setInterval(function() { callback(args, device); }, interval);
    }
    
    // we call it once to run the loop immediately on startup
    monitorFeed(args, device);
    
    // then run every minute forever
    makeinterval(monitorFeed, args, device, 60*1000);

    // finally, we set up a web server here and listen for requests. we don't handle any at this time
    // but this means we can run inside PCF's elastic runtime without disabling the health monitor
    var http = require('http');
    var server = http.createServer(function(request, response) {
	response.end('nothing here');
    });
}

module.exports = cmdLineProcess;

if (require.main === module) {
    cmdLineProcess('connect to the AWS IoT service and push feed data through the system',
		   process.argv.slice(2), processTest);
}

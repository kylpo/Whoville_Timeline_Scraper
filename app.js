//for flatiron
var flatiron = require('flatiron'),
    path = require('path'),
    request = require('request'),
    app = flatiron.app;
//for mongo
var mongodb = require('mongodb'),
    mongoServer = new mongodb.Server("127.0.0.1", 27017, {}),
    util = require('util');
    async = require('async');

//------------- Flatiron Setup ----------------//

app.config.file({ file: path.join(__dirname, 'config', 'config.json') });

app.use(flatiron.plugins.cli, {
  source: path.join(__dirname, 'lib', 'commands'),
  usage: ['',
    'whoville_scraper - Scrape profiles from Whoville and store in DB',
    '',
    'whoville_scraper "whoville.com" all - scrape all users',
    'whoville-scraper "whoville.com" 2   - scrape userId=2',
    '',
    'author: Kyle Poole'
  ]
});

//--------------- Custom Methods -------------//

app.persist_profile = function (url, ids) {
  //setup Mongo connection
  var connection = new mongodb.Db('test', mongoServer, {});

  connection.open( function (error, client) {
    if (error) throw error;
    var collection = new mongodb.Collection(client, 'whoville_timeline');

    async.forEach( ids, function( id, callback ) {
      app.scrape_id( url, id, function(profile_text) {

        // generate object from json return
        // and add an ID and Date field for the web's use
        var profile = JSON.parse( profile_text);
        profile.id = id;
        profile.date = Date();

        app.log.info("storing profile:\n" + util.inspect(profile));

        collection.insert( profile );

        callback(); //for end of async.forEach
      });
    }, function(err){
      connection.close();
    });

  });
};

app.scrape_id = function (url, id, callback) {
  // prepend w/ http and add the /users/ because
  // command line doesn't like /'s in an argument
  var route = "http://" + url + "/users/" + id;

  app.log.info( "scraping " + route );

  request( route, function (error, response, body ) {
    if (!error && response.statusCode == 200) {
      if (body !== 'null'){
        callback( body );
      } else {
        app.log.error("Null response using route: " + route);
      }
    } else {
      app.log.error("Error using route: " + route);
    }
  });
};

//-----------CLI Commands------------------//

app.cmd(':url all', function(url, id) {
  var route = "http://" + url + "/users/";

  app.log.info( "scraping " + route );

  // send request to route. body is content of response.
  request( route, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      app.log.info("server response: " + body);

      // remove ending ',' and delemit by ','
      var ids = body.substring(0, body.length-1).split(',');

      app.persist_profile( url, ids );
    } else {
      app.log.error("Error using route: " + route);
    }
  });
});

app.cmd(':url :id', function(url, id) {
  var ids = [];
  ids.push( id );

  app.persist_profile( url, ids );
});

//-----------------------------------------//

app.start();

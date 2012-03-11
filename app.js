var flatiron = require('flatiron'),
    path = require('path'),
    request = require('request'),
    app = flatiron.app;

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

app.scrape_id = function (url, id) {

  // prepend w/ http and add the /users/ because
  // command line doesn't like /'s in an argument
  var route = "http://" + url + "/users/" + id;

  app.log.info( "scraping " + route );

  request( route, function (error, response, body ) {
    if (!error && response.statusCode == 200) {
      if (body !== 'null'){
        console.log(body);
      } else {
        app.log.error("Null response using route: " + route);
      }
    } else {
      app.log.error("Error using route: " + route);
    }
  });
};

app.cmd(':url all', function(url, id) {
  var route = "http://" + url + "/users/";

  app.log.info( "scraping " + route );

  request( route, function (error, response, body ) {
    if (!error && response.statusCode == 200) {
      app.log.info("server response: " + body);

      //remove ending ',' and delemit by ','
      var ids = body.substring(0, body.length-1).split(',');
      for(i in ids){
        app.scrape_id( url, ids[i] );
      }
    } else {
      app.log.error("Error using route: " + route);
    }
  });
});

app.cmd(':url :id', function(url, id) {
  app.scrape_id( url, id );
});

app.start();

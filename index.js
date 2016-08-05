var express = require('express');
var app = express();
var KwsSdk = require('sa-kws-node-sdk');
var bodyParser = require('body-parser');
var geoip = require('geoip-lite');


var endpoints = [
    'app.user.create',
    'app.user.authenticate'
];

// KWS will provide all the necessary info for your account
var kwsSdk = new KwsSdk({
    clientId: 'sa-mobile-app-sdk-client-0',
    apiKey: '_apikey_5cofe4ppp9xav2t9',
    kwsApiHost: 'https://kwsapi.demo.superawesome.tv',
    allowedDomains: ['http://localhost:3003'],
    debug: true,
    logger: console.warn,
    endpoints: endpoints
});

app.set('port', (process.env.PORT || 80));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(extractCountry);
app.use(kwsSdk.router);

app.get('/', function(req, res) {
  res.sendFile('index.html', {
    root : './public'
  });
});

// create endpoints
app.post('/create', function(req, res) {

    // asume these exist for demo
    var username = req.body.username;
    var password = req.body.password;
    var dateOfBirth = req.body.dateOfBirth;
    var country = req.body.country;

    kwsSdk.app.user.create({
        username: username,
        password: password,
        dateOfBirth: dateOfBirth,
        authenticate: true,
        country: country || req.country || 'GB'
    }).then(function(result){
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            "status": 1,
            "userId": result.id,
            "token": result.token
        }));
    }).catch(function(err){
        // set header content type
        res.setHeader('Content-Type', 'application/json');

        var error = err.error;
        var isDuplicate = error.code == 5 && error.invalid.username.code == 10 ? true : false;
        if (isDuplicate) {
            res.send(JSON.stringify({
                "status": 0,
                "error": "duplicate"
            }));
        } else {
            res.send(JSON.stringify({
                "status": -1,
                "error": "invalid"
            }));
        }
    });
});

app.post('/auth', function(req, res) {

    // user id
    var userId = req.body.userId;

    kwsSdk.app.user.authenticate({
        userId: userId
    }).then(function(result){
        console.log('SUCCESS');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            "status": 1,
            "token": result.token
        }));
    }).catch(function(err){
        console.log('ERROR');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            "status": 0,
            "error": "not_found"
        }));
    });
});

// start app
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


function extractCountry(req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (!ip) {
        next();
    }

    if (ip.indexOf(',') !== -1) {
        var temp = ip.split(',');
        ip = temp[0];
    }

    var geo = geoip.lookup(ip);
    if (geo){
        req.country = geo.country;
    }

    next();
}

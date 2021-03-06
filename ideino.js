// requires
var express = require('express');
app = express();
var server = require('http').createServer(app),
  io = require('socket.io').listen(server,{log:false}),
  fs = require('fs'),
  path = require('path'),
  ejs = require('ejs-locals'),
  childprocs = require('./lib/childprocs'),
  os = require('os');
  
io.set('log level',3);

// ideino config
//ST find ip addresses
var interfaces = os.networkInterfaces();
var addresses = [];
for (k in interfaces) {
    for (k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family == 'IPv4' && !address.internal) {
            addresses.push(address.address)
        }
    }
}
if(addresses.length == 0){
	addresses.push("localhost");
}
//ST find ip addresses


var ideinoConfig = {};
if (fs.existsSync('./ideino.json')) {
  ideinoConfig = require('./ideino.json');
}
// set up default prj dir - used in the absence of a 'path' query string
if (!ideinoConfig.projectsDir) ideinoConfig.projectsDir = path.join(__dirname, 'ideino/projects/user');
if (!ideinoConfig.templatesDir) ideinoConfig.templatesDir = path.join(__dirname, 'ideino/templates')
//ST: changing loopback or localhost to real ip address
if (!ideinoConfig.framesUrl1) ideinoConfig.framesUrl1 = "http://"+addresses[0]+":3000";
if (!ideinoConfig.framesUrl2) ideinoConfig.framesUrl2 = "http://"+addresses[0]+":8080/debug?port=5858";
//ST: changing loopback or localhost to real ip address

app.set('ideinoConfig', ideinoConfig);
// initialize locals
app.locals({
  metaTitle: 'Ideino',
  templates: fs.readFileSync(path.join(__dirname,'./public/html/templates.html'))
});
// register .html extension
app.engine('html', ejs);
// configure
var port = process.env.PORT || 2424;
var sessionStore = new express.session.MemoryStore({
  reapInterval: 60000 * 10
});
app.configure(function() {
  app.use(express.favicon( path.join(__dirname,'/public/favicon.ico'))); 
  app.set('port', port);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'html');
  app.use(express.cookieParser());
  app.use(express.session({
    store: sessionStore,
    secret: '5up3453c43t',
    key: 'sid'
  }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.favicon());
  app.use(express.compress());
  if (ideinoConfig.users) {
    app.use(express.basicAuth(function(user, pass, callback) {
      callback(null, ideinoConfig.users[user] == pass);
    }));
  }
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});
app.configure('development', function() {
  app.use(express.logger('dev'));
  app.use(express.errorHandler());
});
process.on('uncaughtException', function(err) {
  console.error(err.stack);
});
// routing
require('./lib/routing').configure();
// initialize server / start listening
server.listen(port, function() {
  console.log('Listening on ' + port);
});
// child processes
childprocs.connect(io, sessionStore);
app.set('childprocs', childprocs);
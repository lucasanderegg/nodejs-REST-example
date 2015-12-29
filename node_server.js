// rest webserver

// required modules
var https = require('https');
var http = require('http');
var url = require('url');
var fs = require('fs');
var data = require('./data.js').data;
var js2xml = require('js2xmlparser');
var zlib = require('zlib');


// required informations
var client_html = fs.readFileSync('./public/client.html', 'utf8');
var client_script = fs.readFileSync('./public/REST_client.js', 'utf8');
var tlsOptions = {
   key  : fs.readFileSync('./tls/server.key'), // private key
   cert : fs.readFileSync('./tls/server.crt'),  // public certificate
   //requestCert: false,
   //rejectUnauthorized: false
};

data.addresses.push({id:1, prename:'Samar', familyname:'Navabi', street:'Street 1', city:'Vilnius', country:'LT'});
data.addresses.push({id:2, prename:'Raymond', familyname:'Reddington', street:'Bakerstreet 2', city:'Seattle', country:'USA'});
data.addresses.push({id:3, prename:'Jacob', familyname:'Phelps', street:'Street 3', city:'Askaban', country:'??'});

var connection_count = 0;

var server = https.createServer(tlsOptions, function(request, response){
	connection_count++;
	console.log('Connection');
	var httpMethod = request.method;
	var path = url.parse(request.url).pathname;
	var split = path.split('/');
	var resource = split[1];
	var identifier = split[2];
	var parameters = url.parse(request.url,true).query;
	var requestedDataFormat = {};
	requestedDataFormat.dataFormat = request.headers.accept;
	requestedDataFormat.dataCharset = request.headers['accept-charset'];
	requestedDataFormat.dataEncoding = request.headers['accept-encoding'];
	requestedDataFormat.language = request.headers['accept-language'];
	console.log("resource: " + resource + "\nidentifier: " + identifier + "\nparameters: " + parameters + "\nhttp method: " + httpMethod + "\nFormat, Charset, Encoding and Language: " + requestedDataFormat.dataFormat + "  " + requestedDataFormat.dataCharset + "  " + requestedDataFormat.dataEncoding + "  " + requestedDataFormat.language);
	console.log(JSON.stringify(request.headers));
	if (authenticate(request, response)) {
	
	switch(resource){
		case '':
			console.log("in /");
			sendResponse(response, '200', 'text/html', client_html);
			break;
			
		case 'REST_client.js':
			console.log("in /REST_client.js");
			sendResponse(response, '200', 'text/js', client_script);
			break;
		
		case 'addresses':
			console.log("in /address");
			switch (request.method) {
				case 'GET':
					console.log('in GET of addresses');
					handleGetRequest(response, resource, identifier, parameters, requestedDataFormat);
					break;
					
				case 'POST':
					console.log('in POST');
					var body = {};
					request.on('data', function (crap) {
						console.log(crap.toString());
						body = JSON.parse(crap.toString());
						if (body.hasOwnProperty('id')){
							console.log('has propety named id');
							if (data.getId(body.id) == '') {
								console.log('id not in collection yet, will be added');
								data.addresses.push(body);
							}
						}
						console.log(JSON.stringify(data.addresses));
					});
					sendResponse(response, '200', 'text/plain', "Success");
					break;
				
				default:
					console.log("in default!");
					sendResponse(response, '404', 'text/plain', "oops, this doesn't exists - 404");
					break;
			}
			break;
					
		default:
			console.log("in default!");
			sendResponse(response, '404', 'text/plain', "oops, this doesn't exists - 404");
			break;
	}
	}
	
}).listen(443);



function authenticate(request, response) {
	var result;
	//var auth = request.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
	var auth = request.headers.authorization;
	
	if ( auth==null || auth=='undefined' ) {
		console.log('in auth missing');
		response.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
		sendResponse(response, '401', 'text/plain', 'Please enter credentials')
		result = false;
	}else{
		var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd 
		var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is          
	  	var plain_auth = buf.toString();        // read it back out as a string
		console.log("Decoded Authorization ", plain_auth);
		// At this point plain_auth = "username:password"
 	    var creds = plain_auth.split(':');      // split on a ':'
        var username = creds[0];
		var password = creds[1];
		console.log('Connection nr ' + connection_count + '  user: ' + username + '  pw: ' + password);
		if((username == 'red') && (password == 'red')) {   // Is the username/password correct?
			result = true;
		}else{
			console.log('in auth wrong');
		    response.statusCode = 401; // Force them to retry authentication
		    response.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
			sendResponse(response, 401, 'text/plain', 'wrong credentials, biitch');
			result = false;
		}
	}
	return result;
}


function sendResponse(response, statusCode, contentType, body) {
	response.writeHead(statusCode, {'Content-Length': Buffer.byteLength(body), 'Content-Type': + contentType});
	response.write(body);
	response.end();
}

function handleGetRequest(response, resource, identifier, parameters, requestedDataFormat) {
	console.log('in handleGetRequest');
	if (identifier == null || parameters == null) {
		console.log('in addresses ' + JSON.stringify(data.addresses));
		sendFormatedData(response, requestedDataFormat, data[resource.toString()]);
	}else if(identifier != null){
		console.log('in identifer ' + JSON.stringify(data.getId(identifier)));
		sendFormatedData(response, requestedDataFormat, data.getId(identifier));
	}else if (parameters != null) {
		sendFormatedData(response, requestedDataFormat, data.filter(parameters.attribute, parameters.value));
	}
}

function sendFormatedData(response, requestedDataFormat, data) {
	if (requestedDataFormat.dataFormat == 'text/xml') {
		xmlData = createXmlString(data);
		sendResponse(response, '200', 'text/xml', xmlData);
	}else if (requestedDataFormat.dataFormat == 'text/json') {
		var jsonData = createJsonString(data);
		sendResponse(response, '200', 'text/json', jsonData);
	}else if (requestedDataFormat.dataFormat == 'text/plain') {
		sendResponse(response, '406', 'text/plain', 'data format not supported');
	}else if (requestedDataFormat.dataFormat == 'application/json') {
		if (requestedDataFormat.dataEncoding == 'gzip') {
			console.log('in gzip');
			var jsonData = createJsonString(data);
			//var compressed = zlib.gzipSync(jsonData);
			var compressed = zlib.gzip(jsonData, function (err, encoded) {
				console.log('error happen while compressing  ' + encoded + err);
				response.writeHead(200, {'Content-Length': Buffer.byteLength(encoded), 'Content-Type':'application/json', 'Content-Encoding':'gzip'});
				response.write(encoded);
				response.end();
			});
			console.log('after zip var compressed is : ' + compressed + '    and var jsonData is : ' + jsonData);
			//response.setHeader('Content-Encoding', 'gzip');
			//sendResponse(response, '200', 'application/json', compressed);
//			response.writeHead(200, {'Content-Length': Buffer.byteLength(compressed), 'Content-Type':'application/json', 'Content-Encoding':'gzip'});
//			response.write(compressed);
//			response.end();
		} else {
			sendResponse(response, '406', 'text/plain', 'data format not supported');
		}
	}else if (requestedDataFormat.dataFormat == 'application/xml') {
		if (requestedDataFormat.dataEncoding == 'gzip') {
					
		} else {
			sendResponse(response, '406', 'text/plain', 'data format not supported');
		}
	}else {
		sendResponse(response, '406', 'text/plain', 'data format not supported');
	}
}


function createJsonString(data) {
	return JSON.stringify(data);
}

function createXmlString(data) {
	var xmlData = js2xml('address', createJsonString(data));
	xmlData = JSON.stringify(xmlData);
}





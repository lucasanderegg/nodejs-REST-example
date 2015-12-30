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

//added functionality
String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
data.addresses = [];
data.addresses.push({id:1, prename:'Samar', familyname:'Navabi', street:'Street 1', city:'Vilnius', country:'LT'});
data.addresses.push({id:2, prename:'Raymond', familyname:'Reddington', street:'Bakerstreet 2', city:'Seattle', country:'USA'});
data.addresses.push({id:3, prename:'Jacob', familyname:'Phelps', street:'Street 3', city:'Askaban', country:'??'});
data[''] = client_html;
data['REST_client.js'] = client_script;

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
	
		switch(request.method){
			case 'GET':
				console.log("in GET");
				handleGetRequest(response, resource, identifier, parameters, requestedDataFormat);
				break;
			case 'POST':
				console.log('in POST');
				handlePostRequest(request, response, resource);
				break;
		}
	}
}).listen(443);



function authenticate(request, response) {
	var result;
	//var auth = request.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
	var auth = request.headers.authorization;
	
	if ( auth==null || auth=='undefined' ) {
		response.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
		sendResponse(response, '401', 'text/plain', 'Please enter credentials')
		result = false;
	}else{
		var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd 
		var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is          
	  	var plain_auth = buf.toString();        // read it back out as a string
		// At this point plain_auth = "username:password"
 	    var creds = plain_auth.split(':');      // split on a ':'
        var username = creds[0];
		var password = creds[1];
		if((username == 'red') && (password == 'red')) {   // Is the username/password correct?
			result = true;
		}else{
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
	 if (identifier == null && parameters == null && resource != null) {
		sendFormatedData(response, requestedDataFormat, data[resource.toString()]);
	}else if(identifier != null){
		sendFormatedData(response, requestedDataFormat, data.getId(resource, identifier));
	}else if (parameters != null) {
		sendFormatedData(response, requestedDataFormat, data.filter(resource, parameters));
	}
}

function handlePostRequest(request, response, resource){
	request.on('data', function (input) {
		var httpStatusCode = 406;
		var responsebody = 'dataformat not supported';
		var responseformat = 'text/plain';
		try{
			var dataset = JSON.parse(input.toString());
			if (dataset.hasOwnProperty('id')){
				if (data.getId(resource, dataset.id) == '') {
					data[resource].push(dataset);
					httpStatusCode = 200;
					responsebody = 'Success';
				}else {
					responsebody = 'Id already exists';
				}
			}else {
				responsebody = 'Id is missing';
			}
			sendResponse(response, httpStatusCode, responsebody, responsebody);
		}catch(e){
			console.log(e);
			sendResponse(response, httpStatusCode, responsebody, responsebody);
		}
		console.log(JSON.stringify(data[resource]));
	});
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
	}else if (requestedDataFormat.dataFormat.contains('text/html')) {
		sendResponse(response, '200', 'text/html', data);
	}else if (requestedDataFormat.dataFormat.contains('text/javascript')) {
		sendResponse(response, '200', 'text/javascript', data); // text/js is not working because safari does not load script with type="text/js" means safari does not even send a http request
	}else if (requestedDataFormat.dataFormat == '*/*') {
		sendResponse(response, '200', '*/*', data);
	}else if (requestedDataFormat.dataFormat == 'application/json') {
		if (requestedDataFormat.dataEncoding == 'gzip') {
			var jsonData = createJsonString(data);
			//var compressed = zlib.gzipSync(jsonData);
			var compressed = zlib.gzip(jsonData, function (err, encoded) {
				response.writeHead(200, {'Content-Length': Buffer.byteLength(encoded), 'Content-Type':'application/json', 'Content-Encoding':'gzip'});
				response.write(encoded);
				response.end();
			});
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
	var xmlData = js2xml('result', createJsonString(data));
	xmlData = JSON.stringify(xmlData);
}


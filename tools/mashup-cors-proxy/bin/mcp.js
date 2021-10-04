#!/usr/bin/env node

var express = require('express');
var request = require('request');
var cors = require('cors');
var chalk = require('chalk');
var proxy = express();
var commandLineArgs = require('command-line-args');

function startProxy(ip, port, proxyUrl, proxyPartial, credentials, origin, corsUrl) {
    
    proxy.use(cors({credentials: credentials, origin: origin}));
    proxy.options('*', cors({credentials: credentials, origin: origin}));

    var cleanProxyUrl;
    
    if (!corsUrl) {
	// remove trailing slash
	var cleanProxyUrl = proxyUrl.replace(/\/$/, '');
    }
    
    // remove all forward slashes
    var cleanProxyPartial = proxyPartial.replace(/\//g, '');    
    
    proxy.use('/' + cleanProxyPartial, function(req, res) {
	let uri;
	if (corsUrl) {
	    console.log(chalk.green('Request Proxied -> ' + decodeURIComponent(req.query.url)));	    
	    uri = req.query.url;
	} else {
	    console.log(chalk.green('Request Proxied -> ' + req.url));	    
	    uri = cleanProxyUrl + req.url;
	}
	req.pipe(	    
	    request(decodeURIComponent(uri))
		.on('response', response => {

		    // In order to avoid https://github.com/expressjs/cors/issues/134		    
		    const accessControlAllowOriginHeader = response.headers['access-control-allow-origin']
		    if(accessControlAllowOriginHeader && accessControlAllowOriginHeader !== origin ){
			console.log(chalk.blue('Override access-control-allow-origin header from proxified URL : ' + chalk.green(accessControlAllowOriginHeader) + '\n'));
			response.headers['access-control-allow-origin'] = origin;
		    }
		    
		})
	).pipe(res);
    });
    
    proxy.listen(port,ip);
    
    console.log(chalk.bgGreen.black.bold.underline('\n Proxy Active \n'));
    console.log(chalk.blue('Proxy Url: ' + chalk.green(cleanProxyUrl)));
    console.log(chalk.blue('Proxy Partial: ' + chalk.green(cleanProxyPartial)));
    console.log(chalk.blue('IP: ' + chalk.green(ip)));    
    console.log(chalk.blue('Port: ' + chalk.green(port)));
    console.log(chalk.blue('Credentials: ' + chalk.green(credentials)));
    console.log(chalk.blue('Origin: ' + chalk.green(origin) + '\n'));
    if (corsUrl) {
	console.log(
	    chalk.cyan(
		'To start using the proxy simply add the request uri as an url paramter: ' +
		    chalk.bold(`http://${ip}:${port}/${cleanProxyPartial}?url=http://theserver/theapi?param1=x\n`)
	    )
	);
    } else {
	console.log(
	    chalk.cyan(
		'To start using the proxy simply replace the proxied part of your url with: ' +
		    chalk.bold(`http://${ip}:${port}/${cleanProxyPartial}\n`)
	    )
	);	
    }
};


var optionDefinitions = [
    { name: 'ip', alias: 'i', type: String, defaultValue: '0.0.0.0' },    
    { name: 'port', alias: 'p', type: Number, defaultValue: 8010 },
    {
	name: 'proxyPartial',
	type: String,
	defaultValue: '/proxy'
    },
    { name: 'proxyUrl', type: String, defaultValue:"" },
    { name: 'credentials', type: Boolean, defaultValue: false },
    { name: 'origin', type: String, defaultValue: '*' },
    { name: 'corsUrl', type: Boolean, defaultValue: false }
];

try {
  var options = commandLineArgs(optionDefinitions);
  if (options.proxyUrl==="" && !options.corsUrl) {
    throw new Error('--proxyUrl or --corsUrl is required');
  }
    startProxy(options.ip, options.port, options.proxyUrl, options.proxyPartial, options.credentials, options.origin, options.corsUrl);
} catch (error) {
  console.error(error);
}

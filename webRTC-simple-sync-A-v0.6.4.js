// Version: v0.6.4
// Date: 2019/October
// Tested with NodeJS: v10.16.3
// Tested in x86 PC Linux, RPI3, RPIZero*
// *Zero requires to compile NodeJS-WRTC Module f/ source
// *Zero if want to use Syncthing, need to compile it f/ source
//
// Need to install:
//    npm install wrtc
//    npm install simple-peer
//
// How to Use (need 2 terminal shells):
//    2. run: node webRTC-simple-sync-B.js
//    3. run: node webRTC-simple-sync-A.js
//


var Peer = require('simple-peer')
var wrtc = require('wrtc')

// Change the following variable to the path of the sync folder
var syncFolderPath = '/home/userName/Desktop/syncFolder';

var fileCount = 1;

var peer1
peer1 = new Peer({ initiator: true, wrtc: wrtc })


function watchAnswer() {
	var fs = require('fs');
	fs.watchFile(syncFolderPath + '/B/answer.txt', (curr, prev) => {
		
		var signal = JSON.parse(fs.readFileSync(syncFolderPath + '/B/answer.txt', 'utf8').trim());
		console.log('--> Sync-ing answer...');
		console.log(signal.msg);  
		console.log();
		peer1.signal(signal.msg);		
		
		fs.unwatchFile(syncFolderPath + '/B/answer.txt');
		setTimeout( function() {
			 readAllCandidates();
		}, 5);		
	});
}


function readAllCandidates() {
	console.log('Reading ICE Candidates...');
	var path = require('path');
	var fs = require('fs');
	var directoryPath = path.join("", syncFolderPath + '/B/');
	
	fs.readdir(directoryPath, function (err, files) {
		if (err) {
			return console.log('Unable to readdir ' + err);
		}
		
		files.forEach(function(file) {
			if (file.indexOf('candidate') > -1) {
				console.log(file);
				fs.readFile(syncFolderPath + '/B/' + file,'utf8', function(err, contents) { 
				  var signal = JSON.parse(contents);
				  console.log(signal.msg);  
				  console.log();
				  peer1.signal(signal.msg);
				});
			}
		});
		
	});

}	


// Clear Used Signals From Other Peer
function clearSignals() {
	
	var path = require('path');
	var fs = require('fs');
	var directoryPath = path.join("", syncFolderPath + '/B/');
	
	fs.readdir(directoryPath, function (err, files) {
		if (err) {
			return console.log('Unable to readdir ' + err);
		}
		
		files.forEach(function(file) {
			//console.log(file);
			if (file.indexOf('candidate') > -1) {
				// if candidates, remove
				fs.unlink(syncFolderPath + '/B/' + file, err => {
					if (err) throw err;
				});
			} else {
				// if offer/answer, init with empty
				fs.writeFile(syncFolderPath + '/B/answer.txt', '', function(err) {	
					if (err) {
						return console.log(err);
					}
				});					
			}
		});
		
	});	
}


// connection/negotiation section...
peer1.on('signal', data => {
	// when peer1 has signaling data, send it to peer2

	if (data.type === 'offer') {
		var fs = require('fs');
		console.log("offer is created...");
		fs.writeFile(syncFolderPath + '/A/offer.txt', JSON.stringify({'msg': data}), function(err) {	
			if (err) {
				return console.log(err);
			}
		});		
				
	} else {
		if (data.candidate) {
			//console.log("data.candidate");
			console.log("ICE is created...");
			var fs = require('fs');
			var fileName = ''
			fileName = 'A-ice-candidate-' + fileCount + '.txt';
			fileCount++; 			
			fs.writeFile(syncFolderPath + '/A/' + fileName, JSON.stringify({'msg': data}), function(err) {
				if (err) {
					return console.log(err);
				}
			});
			
		}
	}
  
})


// link is complete
peer1.on('connect', () => {
	// wait for 'connect' event before using the data channel
	
	setTimeout(function() {
		console.log('Connection is OK...');
		console.log('----------');
		console.log('----------');
		peer1.send('Hello Peer2!')
	}, 3000);
})


// data exchange section
peer1.on('data', data => {
	// got a data channel message
	console.log('Received message from Peer2: ' + data)
	
	if (data == 'closeItPlease#') {
		peer1.destroy()
	}
  
})


// shutdown section...
peer1.on('close', () => {
	console.log()
	console.log('Connection with Peer2 is closed...');
	console.log('----------');
	console.log('----------');  
	
	clearSignals();
})


// Start watching for an answer comming from peerB
watchAnswer()

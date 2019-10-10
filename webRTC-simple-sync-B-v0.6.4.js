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

var peer2
peer2 = new Peer({ wrtc: wrtc })


function watchOffer() {
	var fs = require('fs');
	fs.watchFile(syncFolderPath + '/A/offer.txt', (curr, prev) => {
		
		var signal = JSON.parse(fs.readFileSync(syncFolderPath + '/A/offer.txt', 'utf8').trim());
		console.log('--> Sync-ing offer...');
		console.log(signal.msg);  
		console.log();
		peer2.signal(signal.msg);	
		
		fs.unwatchFile(syncFolderPath + '/A/offer.txt');
		
		setTimeout( function() {
			 readAllCandidates();
		}, 500);
	});
}


function readAllCandidates() {
	console.log('Reading ICE Candidates...');
	var path = require('path');
	var fs = require('fs');
	var directoryPath = path.join("", syncFolderPath + '/A/');
	
	fs.readdir(directoryPath, function (err, files) {
		if (err) {
			return console.log('Unable to readdir ' + err);
		}
		
		files.forEach(function(file) {

			if (file.indexOf('candidate') > -1) {
				console.log(file);
				fs.readFile(syncFolderPath + '/A/' + file,'utf8', function(err, contents) {
				  var signal = JSON.parse(contents);
				  console.log(signal.msg);  
				  console.log();
				  peer2.signal(signal.msg);
				});
			}
		});
		
	});

}	


// Clear Used Signals From Other Peer
function clearSignals() {
	
	var path = require('path');
	var fs = require('fs');
	var directoryPath = path.join("", syncFolderPath + '/A/');
	
	fs.readdir(directoryPath, function (err, files) {
		if (err) {
			return console.log('Unable to readdir ' + err);
		}
		
		files.forEach(function(file) {
			//console.log(file);
			if (file.indexOf('candidate') > -1) {
				// if candidates, remove
				fs.unlink(syncFolderPath + '/A/' + file, err => {
					if (err) throw err;
				});
			} else {
				// if offer/answer, init with empty
				fs.writeFile(syncFolderPath + '/A/offer.txt', '', function(err) {	
					if (err) {
						return console.log(err);
					}
				});					
			}
		});
		
	});	
}


// connection/negotiation section...
peer2.on('signal', data => {
  // when peer2 has signaling data, send it to peer1
  
	if (data.type === 'answer') {
		var fs = require('fs');
		//console.log(data.type);
		console.log("answer is created...");
		fs.writeFile(syncFolderPath + '/B/answer.txt', JSON.stringify({'msg': data}), function(err) {	
			if (err) {
				return console.log(err);
			}
		});		
				
	} else {
		if (data.candidate) {
			console.log("ICE is created...");
			var fs = require('fs');
			var fileName = ''
			fileName = 'B-ice-candidate-' + fileCount + '.txt';
			fileCount++; 			
			fs.writeFile(syncFolderPath + '/B/' + fileName, JSON.stringify({'msg': data}), function(err) {
				if (err) {
					return console.log(err);
				}
			});			
		}
	}  
  

})


// link is complete
peer2.on('connect', () => {
	// wait for 'connect' event before using the data channel
	console.log('Connection is OK...');
	  
	setTimeout( function() {
		console.log('----------');
		console.log('----------');
	}, 2000);
})


// data exchange section
peer2.on('data', data => {
	// got a data channel message
	console.log('Received message from Peer1: ' + data)
	
	peer2.send('Hello Peer1, how are you?')
	
	setTimeout( function () {
		peer2.send('closeItPlease#')
	}, 10000)
})


// shutdown section...
peer2.on('close', () => {
	console.log()
	console.log('Connection with Peer1 is closed...');

	console.log('----------');
	console.log('----------');
	
	clearSignals();
	 
})


// start to watch for an offer comming from peerA...
watchOffer();

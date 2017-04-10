const http = require('http');
const port = 8964;

const dixie = require('./zadixie');

let tref = Date.now();
let buf1 = [];
let buf1len = 0;

/*
const ebml = require('ebml');
const enc = new ebml.Encoder();
const dec = new ebml.Decoder();

enc.on('data', data=> {
	buf1.push(data);
	buf1len+=data.length;
});

dec.on('data', data=> {
	if (data[0] === 'start' && data[1].name === 'Cluster') {
		console.log('write', buf1len, (Date.now()-tref)/1000);
		let catbuf = Buffer.concat(buf1);
		buf1 = [];
		buf1len = 0;
		for(var i=0;i<listeners.length;i++) {
			var res = listeners[i];
			res.write(catbuf);
		}
	}

	//if(data[1].name!='SimpleBlock')
		console.log(data[0], data[1].name, data[1].dataSize, data);

	enc.write(data);
});
*/

var t = { port: port };
let listeners = [];

t.canvas = null;
let dixiedone = false;
let putbuf = buf=> {
	//console.log(`${buf.length} bytes of data, ${listeners.length} listeners`);	
	//dec.write(buf);
	buf1.push(buf);
	buf1len+=buf.length;
	if(buf1len>10000 && !dixiedone) {
		dixiedone=true;
		var catbuf = Buffer.concat(buf1);
		if(t.canvas!=null) {
			dixie.main(catbuf, t.canvas);
		}
	};
};

t.putblob = blob=> {
	var reader = new FileReader();
	reader.onload = function() {
		var buf = Buffer.from(reader.result);
		putbuf(buf);
	};
	reader.readAsArrayBuffer(blob);
};

let server = http.createServer(function (req, res) {
	res.writeHead(200, { 
		'Content-Type': 'video/webm' });
	listeners.push(res);
});
server.listen(port);

module.exports = t;

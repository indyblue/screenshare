const http = require('http');
const port = 8964;

const ebml = require('ebml');
const enc = new ebml.Encoder();
const dec = new ebml.Decoder();

let tref = Date.now();
let buf1 = [];
let buf1len = 0;
enc.on('data', data=> {
	buf1.push(data);
	buf1len+=data.length;
	/*
	*/
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

let listeners = [];

//let buf1 = [];
//let buf1len = 0;
let putbuf = buf=> {
	//console.log(`${buf.length} bytes of data, ${listeners.length} listeners`);	
	dec.write(buf);
	/*
	buf1.push(buf);
	buf1len+=buf.length;
	if(buf1len>1) {
		let newbuf = Buffer.concat(buf1);
		dec.write(newbuf);
		buf1 = [];
		buf1len=0;
	}
	*/
};

let putblob = blob=> {
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

module.exports = {
	port: port,
	putblob: putblob
};

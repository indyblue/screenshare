const http = require('http');
const port = 8964;

const sdixie = require('./zsdixie');


let tref = Date.now();
let buf1 = [];
let buf1len = 0;

var t = { port: port };
let listeners = [];

t.setcanvas = function(canvas) {
	sdixie.setcanvas(canvas);
};
let putbuf = buf=> {
	//console.log(`${buf.length} bytes of data, ${listeners.length} listeners`);	
	sdixie.write(buf);
	buf1len+=buf.length;
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

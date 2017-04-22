const {remote, desktopCapturer, ipcRenderer, screen} = require('electron');
const websrv = require('./websrv');
global.$ = $;
global.mainWindow = remote.getGlobal('mainWindow');

let sharemr = null;
$(document).ready(()=>{
	let $button = $('#share');
	$button.click(e=> {
		if(sharemr!=null) {
			stopStream();
			$button.text('Start sharing');
		}
		else {
			desktopCapturer.getSources({types: ['window', 'screen']},
				fnHandleSources);
			$button.text('Stop sharing');
		}
	});
	let $canvas = $('canvas');
	$canvas.on('mousemove', e=> {
		var t = e;
		var coff = $canvas.offset();
		var ew = $canvas.width();
		var eh = $canvas.height();
		var cx = (e.clientX - coff.left) / ew;
		var cy = (e.clientY - coff.top) / eh;
		var disp = screen.getPrimaryDisplay();
		var ds = disp.size;
		var dx = Math.floor(ds.width * cx);
		var dy = Math.floor(ds.height * cy);
		ipcRenderer.send('wincrs', dx, dy);
		//console.log(e.clientX, e.clientY, e.offsetX, e.offsetY, cx, cy);
	}).on('mouseout', e=> {
		ipcRenderer.send('wincrs', -1);
	}).on('click', e=> {
		ipcRenderer.send('wincrs-click');
	});
});

function fnHandleSources(error, sources) {
	if (error) throw error

	if(sources.length==0) return;
	navigator.mediaDevices.getUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: sources[0].id,
				maxWidth: 1000,
				maxHeight: 500,
				maxFrameRate: 5
			}
		}
	}).then(upStream);
	return;
}

function upStream(stream) {
	sharemr = new MediaRecorder(stream);
	sharemr.ondataavailable = function(e) {
		websrv.putblob(e.data);
	};
	sharemr.start(50);
	//var video = document.querySelector('video');
	//var url = 'http://localhost:'+websrv.port;
	var url = URL.createObjectURL(stream);
	//video.src = url;

	websrv.setcanvas(document.querySelector('canvas'));
}

function stopStream() {
	sharemr.stop();
	sharemr = null;
	websrv.clearcanvas();
}

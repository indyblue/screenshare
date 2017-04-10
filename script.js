const {remote, desktopCapturer} = require('electron');
const websrv = require('./websrv');

desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
	if (error) throw error

	if(sources.length==0) return;
	navigator.mediaDevices.getUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: sources[0].id,
				maxWidth: 500,
				maxHeight: 500,
				maxFrameRate: 4
			}
		}
	}).then(upStream);
	return;
});

function upStream(stream) {
	var mr = new MediaRecorder(stream);
	mr.ondataavailable = function(e) {
		websrv.putblob(e.data);
	};
	mr.start(50);
	var video = document.querySelector('video');
	//var url = 'http://localhost:'+websrv.port;
	var url = URL.createObjectURL(stream);
	video.src = url;

	websrv.canvas = document.querySelector('canvas');
}


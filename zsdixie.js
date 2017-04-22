'use strict';

if(typeof require=='function'
	&& typeof module!='undefined' && module.exports) {
	var dixie = require('./zdixie');
}

var streamdixie;
(function(){
	var lc = {
		canvas: null,
		context: null,
		output: null,
		outputData: null
	};
	function clearcanvas() {
		if(lc.canvas == null) return;
		if(lc.context == null) 
			lc.context = lc.canvas.getContext("2d");
		lc.canvas.height=10;
		lc.canvas.width=10;
		lc.context.clearRect(0, 0, lc.canvas.width, lc.canvas.height);
		lc.canvas = null;
		lc.context = null;
		lc.outputData = null;
	}

	function vpximg2canvas(img) {
		if(lc.canvas == null) return;
		if(lc.outputData==null) {
			lc.canvas.height=img.d_h;
			lc.canvas.width=img.d_w;
			lc.context = lc.canvas.getContext("2d");

			lc.output = lc.context.createImageData(lc.canvas.width, lc.canvas.height);
			lc.outputData = lc.output.data;
		}

		var planeY_off=img.planes_off[0],
				planeU_off=img.planes_off[1],
				planeV_off=img.planes_off[2],
				plane=img.planes[0];

		for (var h=0;h<img.d_h;h++) {
			var stride_Y_h_off = (img.w)*h,
				stride_UV_h_off = (img.w>>1)*(h>>1),
				stride_RGBA_off = (img.d_w<<2)*h;
			for (var w=0;w<img.d_w;w++) {
				var Y = plane[planeY_off+ w+stride_Y_h_off],
					stride_UV_off = (w>>1)+stride_UV_h_off,
					U = (plane[planeU_off+ stride_UV_off]) - 128,
					V = (plane[planeV_off+ stride_UV_off]) - 128,
					R =  (Y + 1.371*V),
					G =  (Y - 0.698*V - 0.336*U),
					B =  (Y + 1.732*U),
					outputData_pos = (w<<2)+stride_RGBA_off;

				lc.outputData[0+outputData_pos] = R;
				lc.outputData[1+outputData_pos] = G;
				lc.outputData[2+outputData_pos] = B;
				lc.outputData[3+outputData_pos] = 255;
			};
		}

		lc.context.putImageData(lc.output, 0, 0);
	}

	var header = { data: [], init:false };
	function parseheader() {
		if(header.init) return true;

		var pk = peekall(0, true, dixie.ID_CLUSTER);
		if(!pk.first) return false;

		input.infile.data_off = 0;
		var fourcc=[0];
		var width=[0];
		var height=[0];
		var fps_den=[0];
		var fps_num=[0];
		if(dixie.file_is_webm(input, fourcc, width, height, fps_den, fps_num)) {
			header.data = input.infile.data.slice(0,pk.first);
			input.kind = dixie.WEBM_FILE;
			header.fourcc = fourcc[0];
			header.width = width[0];
			header.height = height[0];
			header.fps_den = fps_den[0];
			header.fps_num = fps_num[0];
			header.init = true;
			header.decoder2 = new dixie.vp8_decoder_ctx();
			return true;
		}
		return false;
	}

	var readingframes = false;
	var lastframe = 0;
	function readframe() {
		readingframes = true;
		var pk = peekall(lastframe, true, dixie.ID_SIMPLE_BLOCK, true);
		if(!pk.first) { // no more full clusters
			readingframes = false;
			return 0;
		}
		
		var id = [0], size = [0];
		input.infile.data_off = pk.first;
		pk = dixie.ne_peek_element(input.nestegg_ctx, id, size);
		lastframe = input.infile.data_off+size[0];

		var buf = [null];
		var buf_off=[null];
		var buf_sz = [0], buf_alloc_sz = [0];
		var isframe=!dixie.read_frame(input, buf, buf_off, buf_sz, buf_alloc_sz);
		if (isframe){
			setTimeout(function() {
				buf=buf[0]; // added by d

				dixie.vp8_dixie_decode_frame(header.decoder2, buf, buf_sz);
				buf=[buf]; // added by d
				var img_avail = header.decoder2.frame_hdr.is_shown;
				var img = header.decoder2.ref_frames[0].img;

				if(img_avail && img && lc.canvas) vpximg2canvas(img);
				readframe();
			},0);
			return 1;
		}
		readingframes = false;
		return -1;
	}

	var peekcodes = {
		0x83: 'ID_TRACK_TYPE',
		0x86: 'ID_CODEC_ID',
		0x88: 'ID_FLAG_DEFAULT',
		0x9b: 'ID_BLOCK_DURATION',
		0x9c: 'ID_FLAG_LACING',
		0x9f: 'ID_CHANNELS',
		0xa0: 'ID_BLOCK_GROUP',
		0xa1: 'ID_BLOCK',
		0xa3: 'ID_SIMPLE_BLOCK',
		0xae: 'ID_TRACK_ENTRY',
		0xb0: 'ID_PIXEL_WIDTH',
		0xb3: 'ID_CUE_TIME',
		0xb5: 'ID_SAMPLING_FREQUENCY',
		0xb7: 'ID_CUE_TRACK_POSITIONS',
		0xb9: 'ID_FLAG_ENABLED',
		0xba: 'ID_PIXEL_HEIGHT',
		0xbb: 'ID_CUE_POINT',
		0xbf: 'ID_CRC32',
		0xd7: 'ID_TRACK_NUMBER',
		0xe0: 'ID_VIDEO',
		0xe1: 'ID_AUDIO',
		0xe7: 'ID_TIMECODE',
		0xec: 'ID_VOID',
		0xf1: 'ID_CUE_CLUSTER_POSITION',
		0xf7: 'ID_CUE_TRACK',
		0xfb: 'ID_REFERENCE_BLOCK',
		0x4282: 'ID_DOCTYPE',
		0x4285: 'ID_DOCTYPE_READ_VERSION',
		0x4286: 'ID_EBML_VERSION',
		0x4287: 'ID_DOCTYPE_VERSION',
		0x42f2: 'ID_EBML_MAX_ID_LENGTH',
		0x42f3: 'ID_EBML_MAX_SIZE_LENGTH',
		0x42f7: 'ID_EBML_READ_VERSION',
		0x4489: 'ID_DURATION',
		0x4dbb: 'ID_SEEK',
		0x5378: 'ID_CUE_BLOCK_NUMBER',
		0x53ab: 'ID_SEEK_ID',
		0x53ac: 'ID_SEEK_POSITION',
		0x54aa: 'ID_PIXEL_CROP_BOTTOM',
		0x54b0: 'ID_DISPLAY_WIDTH',
		0x54ba: 'ID_DISPLAY_HEIGHT',
		0x54bb: 'ID_PIXEL_CROP_TOP',
		0x54cc: 'ID_PIXEL_CROP_LEFT',
		0x54dd: 'ID_PIXEL_CROP_RIGHT',
		0x6264: 'ID_BIT_DEPTH',
		0x63a2: 'ID_CODEC_PRIVATE',
		0x73c5: 'ID_TRACK_UID',
		0x22b59c: 'ID_LANGUAGE',
		0x23314f: 'ID_TRACK_TIMECODE_SCALE',
		0x2ad7b1: 'ID_TIMECODE_SCALE',
		0x114d9b74: 'ID_SEEK_HEAD',
		0x1549a966: 'ID_INFO',
		0x1654ae6b: 'ID_TRACKS',
		0x18538067: 'ID_SEGMENT',
		0x1a45dfa3: 'ID_EBML',
		0x1c53bb6b: 'ID_CUES',
		0x1f43b675: 'ID_CLUSTER',
	}

	function peekseek(start, limit) {
		var off0 = input.infile.data_off;
		if(typeof start!='number') start = input.infile.data_off;
		if(typeof limit!='number') limit = input.infile.data.length;
		var infile = input.infile, ctx = input.nestegg_ctx,
			r = {
				start: start,
				limit: limit,
				match: false
			};
		if(r.limit>r.start+1000) r.limit = r.start+1000;
		for(r.end=r.start; r.end<r.limit; r.end++){
			infile.data_off = r.end;
			var id = [0], size = [0];
			var peek = dixie.ne_sneak_peek(ctx, id, size);
			if(peek==1 && typeof peekcodes[id[0]]!='undefined') {
				r.type = peekcodes[id[0]];
				r.size = size[0];
				r.match = true;
				break;
			}
		}
		if(r.match) {
			infile.data_off += r.size;
			var peek = dixie.ne_sneak_peek(ctx, id, size);
			if(peek!=1 || typeof peekcodes[id[0]]=='undefined')
				r.match = null;
		}
		infile.data_off = off0;
		return r;
	}
	
	var posLog = [];
	function peekall(position, revert, tag, first) {
		if(typeof revert=='undefined') revert = true;
		if(typeof first=='undefined') first = false;
		var startPos = input.infile.data_off,
			retval = [], retfirst = null, retlast = null,
			lastgood = null, errfirst = null,
			infile = input.infile, ctx = input.nestegg_ctx,
			usePos = (typeof position=='number' && position>=0);
		if(usePos)
			input.infile.data_off = position;
		for(;;) {
			var id = [0], size = [0];
			var start_off = infile.data_off;
			var peek = dixie.ne_sneak_peek(ctx, id, size);
			if(peek!=1) {
				infile.data_off = start_off;
				break;
			} else if(typeof peekcodes[id[0]]=='undefined') {
				infile.data_off = start_off;
				var test = peekseek();
				if(test.match)
					infile.data.slice(test.start, test.end-test.start);
				break;
			}
			else lastgood = start_off;

			if(size[0]>0)
				infile.data_off += size[0];
			var rvitem = {
				id:id[0],
				type: peekcodes[id[0]]||'ERROR',
				size: size[0],
				start: start_off,
				end: infile.data_off
			};
			if(infile.data_off > infile.data.length) 
				break; // last block, and isn't complete.
			retval.push(rvitem);
			if(typeof tag!='undefined' && (rvitem.id==tag || tag=='*')) {
				if(retfirst==null) retfirst = rvitem.start;
				retlast = rvitem.start;
				if(first) break;
			}
			if(posLog.indexOf(rvitem.start)<0) {
				if(rvitem.id!=dixie.ID_SIMPLE_BLOCK)
					console.log(JSON.stringify(rvitem));
				else console.log('ID_SIMPLE_BLOCK');
				posLog.push(rvitem.start);
			}
		}
		if(revert)
			input.infile.data_off = startPos;
		return {
			first: retfirst,
			last: retlast,
			list: retval,
			lastgood: lastgood,
			errfirst: errfirst
		};
	}

	function vacuum() {
		var pk = peekall(0, true, dixie.ID_CLUSTER);
		if(pk.last>pk.first) {
			console.log('header', pk.first, 'last cluster', pk.last);
			input.infile.data.splice(pk.first, pk.last-pk.first);
			input.infile.data_off -= (pk.last - pk.first);
			lastframe -= (pk.last - pk.first);
		}
	};

	var input=null;
	function init() {
		input = dixie.new_input();
	}
	function write(data) {
		if(typeof input!='object' || input==null) init();
		if(typeof data=='string')
			data = data.split('').map(function(x) { return x.charCodeAt(0); });
		else if(data instanceof Buffer)
			data = bufferToArray(data);

		if(Array.isArray(data) && Array.isArray(input.infile.data)) {
			input.infile.data = input.infile.data.concat(data);
		}
		else console.log('problem writing data');
		//peekall(-1, false);
		vacuum();
		if(parseheader() && !readingframes) 
			readframe();
	}

	function bufferToArray(buf) {
		if(typeof Array.from=='function')
			return Array.from(buf);
		else
			return [].slice.call(buf);
	}

	streamdixie = {
		init: init,
		write: write,
		peek: peekall,
		setcanvas: function(c) {
			if(typeof c!='undefined' && c instanceof HTMLCanvasElement) {
				lc.canvas = c;
				lc.context = null;
				lc.outputData = null;
				return true;
			} else return false;
		},
		clearcanvas: clearcanvas
	};
})();


if(typeof require=='function'
	&& typeof module!='undefined' && module.exports) {
	module.exports = streamdixie;
}

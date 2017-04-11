if(typeof require=='function' 
	&& typeof module!='undefined' && module.exports) {
	var dixie = require('./zdixie');
}

var streamdixie;
(function(){
	var vpximg2canvasinit = false;
	var context, output, outputData;
	function vpximg2canvas(img, canvas) {
		if(!vpximg2canvasinit) {
			canvas.height=img.d_h;
			canvas.width=img.d_w;
			context = canvas.getContext("2d");

			output = context.createImageData(canvas.width, canvas.height);
			outputData = output.data;
			vpximg2canvasinit = true;
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

				outputData[0+outputData_pos] = R;
				outputData[1+outputData_pos] = G;
				outputData[2+outputData_pos] = B;
				outputData[3+outputData_pos] = 255;
			};			
		}
		
		context.putImageData(output, 0, 0);
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

	function peek(position, tag, first) {
		if(typeof first=='undefined') first = true;
		var startPos = input.infile.data_off;
		if(typeof position=='number')
			input.infile.data_off = position;
		var retval = [];
		var retlast = null;
		var infile = input.infile;
		var ctx = input.nestegg_ctx;
		for(;;) {
			//if(infile.data.length<infile.data_off) break;
			var id = [0], size = [0];
			var start_off = infile.data_off;
			ctx.last_id = 0;
			ctx.last_size = 0;
			var peek = dixie.ne_peek_element(ctx, id, size);
			if(peek!=1) {
				infile.data_off = start_off;
				break;
			}

			if(size[0]>0)
				infile.data_off += size[0];
			var rvitem = {
				id:id[0],
				type: peekcodes[id[0]], 
				size: size[0], 
				start: start_off, 
				end: infile.data_off
			};
			if(typeof tag!='undefined' && rvitem.id==tag) {
				retlast = rvitem.start;
				if(first) break;
			}
			if(typeof position=='undefined' && rvitem.id!=dixie.ID_SIMPLE_BLOCK)
				console.log(JSON.stringify(rvitem));
			retval.push(rvitem);
		}
		//console.log('out of data');
		if(typeof position!='undefined')
			input.infile.data_off = startPos;
		if(retlast!=null) return retlast;
		return retval;
	}
	function vacuum() {
		var hdrend = peek(0, dixie.ID_CLUSTER);
		var lcstart = peek(0, dixie.ID_CLUSTER, 0);
		if(header.length==0) 
			header = input.infile.data.slice(0,hdrend);
		if(lcstart>hdrend) {
			console.log('header', hdrend, 'last cluster', lcstart);
			input.infile.data.splice(hdrend, lcstart - hdrend);
			input.infile.data_off -= (lcstart - hdrend);
		}
	};

	var header = [];
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
		peek();
		vacuum();
	}
	function bufferToArray(buf) {
		if(typeof Array.from=='function')
			return Array.from(buf);
		else
			return [].slice.call(buf);
	}

	sd = {
		init: init,
		write: write,
		peek: peek
	};
})();


if(typeof require=='function' 
	&& typeof module!='undefined' && module.exports) {
	module.exports = sd;
}

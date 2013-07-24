/*
 * BitmapData.js by Peter Nitsch - https://github.com/pnitsch/BitmapData.js
 * HTML5 Canvas API implementation of the AS3 BitmapData class. 
 */

var halfColorMax = 0.00784313725;

var BlendMode = new function() {
	this.ADD = "add";
	this.ALPHA = "alpha";
	this.DARKEN = "darken";
	this.DIFFERENCE = "difference";
	this.ERASE = "erase";
	this.HARDLIGHT = "hardlight";
	this.INVERT = "invert";
	this.LAYER = "layer";
	this.LIGHTEN = "lighten";
	this.HARDLIGHT = "hardlight";
	this.MULTIPLY = "multiply";
	this.NORMAL = "normal";
	this.OVERLAY = "overlay";
	this.SCREEN = "screen";
	this.SHADER = "shader";
	this.SUBTRACT = "subtract";
};

var BitmapDataChannel = new function() {
	this.ALPHA = 8;
	this.BLUE = 4;
	this.GREEN = 2;
	this.RED = 1;
};

// RGB <-> Hex conversion
function hexToRGB (hex) { return { r: ((hex & 0xff0000) >> 16), g: ((hex & 0x00ff00) >> 8), b: ((hex & 0x0000ff)) }; };	
function hexToRGBA (hex) { return { r: (Math.floor(hex/16777216)), g: ((hex & 0x00ff0000) >> 16), b: ((hex & 0x0000ff00) >> 8), a:((hex & 0x000000ff))}; };
function RGBToHex(rgb) { return rgb.r<<16 | rgb.g<<8 | rgb.b; };
function RGBAToHex(rgba) { return Math.floor(rgba.r*16777216) + (rgba.g<<16 | rgba.b<<8 | rgba.a); }; //16777216 == 2<<23 == 2^24

function BitmapData(width, height, transparent, fillColor, canvas) {
	this.width = width;
	this.height = height;
	this.rect = new Rectangle(0, 0, this.width, this.height);
	this.transparent = transparent || false;

	this.canvas = canvas || document.createElement("canvas");
	this.context = this.canvas.getContext("2d");
	this.canvas.setAttribute('width', this.width);
	this.canvas.setAttribute('height', this.height);
	
	this.drawingCanvas = document.createElement("canvas");
	this.drawingContext = this.drawingCanvas.getContext("2d");

	this.imagedata = this.context.createImageData(this.width, this.height);	                              
    Object.defineProperty(this, "data", {get : function(){return this.imagedata;},
                                        set : function(source){this.imagedata = source;}});  
	
	
	/*** Canvas2D functions ***/
	this.setPixel = function(x, y, color) {
		var rgba = hexToRGBA(color);
		var pos = (x + y * this.width) * 4;
		var data = this.imagedata.data;

		data[pos+0] = rgba.r;
		data[pos+1] = rgba.g;
		data[pos+2] = rgba.b;
		data[pos+3] = rgba.a;
	};
	
	this.getPixel = function(x, y) {
		var pos = (x + y * this.width) * 4;
		var data = this.imagedata.data;
		var rgba = {
			r: data[pos+0],
			g: data[pos+1],
			b: data[pos+2],
			a: data[pos+3]
		};
		return RGBAToHex(rgba); 
	};
	
	this.getAlphaPixel = function(x, y, alpha) {
	    var pos = (x + y * this.width) * 4;
		var data = this.imagedata.data;
		var rgba = {
			r: data[pos+0],
			g: data[pos+1],
			b: data[pos+2],
			a: alpha
		};
		return RGBAToHex(rgba); 
	};
	
	this.getRGBPixel = function(x, y) {
		var pos = (x + y * this.width) * 4;
		var data = this.imagedata.data;
		var rgb = {
			r: data[pos+0],
			g: data[pos+1],
			b: data[pos+2]
		};
		
		return RGBToHex(rgb);
	};
	
	this.clone = function() {
		this.context.putImageData(this.imagedata, 0, 0);
		
		var result = new BitmapData(this.width, this.height, this.transparent);
		result.data = this.context.getImageData(0, 0, this.width, this.height);
		return result;
	};
	
	this.applyFilter = function(sourceBitmapData, sourceRect, destPoint, filter) {
		var copy = this.clone();
		filter.run(sourceRect, this.imagedata.data, copy.imagedata.data);
	};
	
	this.copyCanvas = function(sourceCanvas, sourceRect, destPoint, blendMode) {
		this.context.putImageData(this.imagedata, 0, 0);
		
		var bw = this.canvas.width - sourceRect.width - destPoint.x;
		var bh = this.canvas.height - sourceRect.height - destPoint.y

		var dw = (bw < 0) ? sourceRect.width + (this.canvas.width - sourceRect.width - destPoint.x) : sourceRect.width;
		var dh = (bh < 0) ? sourceRect.height + (this.canvas.height - sourceRect.height - destPoint.y) : sourceRect.height;
		
		if(blendMode && blendMode != BlendMode.NORMAL) {

			var sourceData = sourceCanvas.getContext("2d").getImageData(sourceRect.x, sourceRect.y, dw, dh).data;
			var sourcePos, destPos;
			var data = this.imagedata.data;
			
			for (var y=0; y<dh; y++) {
				for (var x=0; x<dw; x++) {
					sourcePos = (x + y * dw) * 4;
					destPos = ((x+destPoint.x) + (y+destPoint.y) * this.width) * 4;
					
					switch(blendMode) {
						case BlendMode.ADD:
							data[destPos] = Math.min(data[destPos] + sourceData[sourcePos], 255);
							data[destPos+1] = Math.min(data[destPos+1] + sourceData[sourcePos+1], 255);
							data[destPos+2] = Math.min(data[destPos+2] + sourceData[sourcePos+2], 255);
						break;
						
						case BlendMode.ALPHA:
						    data[destPos+3] = sourceData[sourcePos+3];
						break;
						
						case BlendMode.SUBTRACT:
							data[destPos] = Math.max(sourceData[sourcePos] - data[destPos], 0);
							data[destPos+1] = Math.max(sourceData[sourcePos+1] - data[destPos+1], 0);
							data[destPos+2] = Math.max(sourceData[sourcePos+2] - data[destPos+2], 0);
						break;
						
						case BlendMode.INVERT:
							data[destPos] = 255 - sourceData[sourcePos];
							data[destPos+1] = 255 - sourceData[sourcePos+1];
							data[destPos+2] = 255 - sourceData[sourcePos+1];
						break;
						
						case BlendMode.MULTIPLY:
							data[destPos] = Math.floor(sourceData[sourcePos] * data[destPos] / 255);
							data[destPos+1] = Math.floor(sourceData[sourcePos+1] * data[destPos+1] / 255);
							data[destPos+2] = Math.floor(sourceData[sourcePos+2] * data[destPos+2] / 255);
						break;
						
						case BlendMode.LIGHTEN:
							if(sourceData[sourcePos] > data[destPos]) data[destPos] = sourceData[sourcePos];
							if(sourceData[sourcePos+1] > data[destPos+1]) data[destPos+1] = sourceData[sourcePos+1];
							if(sourceData[sourcePos+2] > data[destPos+2]) data[destPos+2] = sourceData[sourcePos+2];
						break;
						
						case BlendMode.DARKEN:
							if(sourceData[sourcePos] < data[destPos]) data[destPos] = sourceData[sourcePos];
							if(sourceData[sourcePos+1] < data[destPos+1]) data[destPos+1] = sourceData[sourcePos+1];
							if(sourceData[sourcePos+2] < data[destPos+2]) data[destPos+2] = sourceData[sourcePos+2];
						break;

						case BlendMode.DIFFERENCE:
							data[destPos] = Math.abs(sourceData[sourcePos] - data[destPos]);
							data[destPos+1] = Math.abs(sourceData[sourcePos+1] - data[destPos+1]);
							data[destPos+2] = Math.abs(sourceData[sourcePos+2] - data[destPos+2]);
						break;
						
						case BlendMode.SCREEN:
							data[destPos] = (255 - ( ((255-data[destPos])*(255-sourceData[sourcePos])) >> 8));
							data[destPos+1] = (255 - ( ((255-data[destPos+1])*(255-sourceData[sourcePos+1])) >> 8));
							data[destPos+2] = (255 - ( ((255-data[destPos+2])*(255-sourceData[sourcePos+2])) >> 8));
						break;

						case BlendMode.OVERLAY:
							if(sourceData[sourcePos] < 128) data[destPos] = data[destPos] * sourceData[sourcePos] * halfColorMax;
							else data[destPos] = 255 - (255-data[destPos])*(255-sourceData[sourcePos])*halfColorMax;
							
							if(sourceData[sourcePos+1] < 128) data[destPos+1] = data[destPos+1] * sourceData[sourcePos+1] * halfColorMax;
							else data[destPos+1] = 255 - (255-data[destPos+1])*(255-sourceData[sourcePos+1])*halfColorMax;
							
							if(sourceData[sourcePos+2] < 128) data[destPos+2] = data[destPos+2] * sourceData[sourcePos+2] * halfColorMax;
							else data[destPos+2] = 255 - (255-data[destPos+2])*(255-sourceData[sourcePos+2])*halfColorMax;
						break;

						case BlendMode.OVERLAY:
							if(sourceData[sourcePos] < 128) data[destPos] = data[destPos] * sourceData[sourcePos] * halfColorMax;
							else data[destPos] = 255 - (255-data[destPos])*(255-sourceData[sourcePos])*halfColorMax;
							
							if(sourceData[sourcePos+1] < 128) data[destPos+1] = data[destPos+1] * sourceData[sourcePos+1] * halfColorMax;
							else data[destPos+1] = 255 - (255-data[destPos+1])*(255-sourceData[sourcePos+1])*halfColorMax;
							
							if(sourceData[sourcePos+2] < 128) data[destPos+2] = data[destPos+2] * sourceData[sourcePos+2] * halfColorMax;
							else data[destPos+2] = 255 - (255-data[destPos+2])*(255-sourceData[sourcePos+2])*halfColorMax;
						break;
						
						case BlendMode.HARDLIGHT:
							if(data[destPos] < 128) data[destPos] = data[destPos] * sourceData[sourcePos] * halfColorMax;
							else data[destPos] = 255 - (255-data[destPos])*(255-sourceData[sourcePos])*halfColorMax;
							
							if(data[destPos+1] < 128) data[destPos+1] = data[destPos+1] * sourceData[sourcePos+1] * halfColorMax;
							else data[destPos+1] = 255 - (255-data[destPos+1])*(255-sourceData[sourcePos+1])*halfColorMax;
							
							if(data[destPos+2] < 128) data[destPos+2] = data[destPos+2] * sourceData[sourcePos+2] * halfColorMax;
							else data[destPos+2] = 255 - (255-data[destPos+2])*(255-sourceData[sourcePos+2])*halfColorMax;
						break;	
						
					}
				}
			}
			
		} else {
			this.context.drawImage(sourceCanvas, 
				sourceRect.x, sourceRect.y, dw, dh, 
				destPoint.x, destPoint.y, dw, dh);
			
			this.imagedata = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		}
		
		this.context.putImageData(this.imagedata, 0, 0);
	};
	
	this.copyChannel = function(sourceBitmapData, sourceRect, destPoint, sourceChannel, destChannel) {
		var sourceOffset = 0;
		var destOffset = 0;
		
		switch(sourceChannel){
		    case 1:
		        sourceOffset = 0;
		        break;
		    case 2:
		        sourceOffset = 1;
		        break;
		    case 4:
		        sourceOffset = 2;
		        break;
		    case 8:
		        sourceOffset = 3;
		        break;
		}
		
		switch(destChannel){
		    case 1:
		        destOffset = 0;
		        break;
		    case 2:
		        destOffset = 1;
		        break;
		    case 4:
		        destOffset = 2;
		        break;
		    case 8:
		        destOffset = 3;
		        break;
		}
		
		var sourcepos;
        var sourcedata = sourceBitmapData.imagedata.data;
		var data = this.imagedata.data;
		for (var y=0; y<sourceRect.height; y++) {
			for (var x=0; x<sourceRect.width; x++) {
			    sourcepos = (x + y * sourceRect.width) * 4;
				pos = ((destPoint.x + x) + (destPoint.y + y * this.width)) * 4;
        		data[pos+destOffset] = sourcedata[sourcepos+sourceOffset];
			}
		}
		
		this.context.putImageData(this.imagedata, 0, 0);
	};
	
	this.draw = function(source, matrix, colorTransform, blendMode, clipRect, smoothing) {

		/*
		 * currently only supports Image object
		 * TODO: implement instanceof switches
		 */
		
		sourceMatrix = matrix || new Matrix();
		sourceRect = clipRect || new Rectangle(0, 0, source.width, source.height);
		
		if(blendMode && this.gpuEnabled) {
			// TO DO
		}
				
		this.drawingCanvas.setAttribute('width', source.width);
		this.drawingCanvas.setAttribute('height', source.height);
		
		this.drawingContext.transform(
			sourceMatrix.a,
			sourceMatrix.b,
			sourceMatrix.c,
			sourceMatrix.d,
			sourceMatrix.tx,
			sourceMatrix.ty);
			
		this.drawingContext.drawImage(source, 
			0, 0, source.width, source.height, 
			0, 0, source.width, source.height);
		
		this.copyCanvas(this.drawingCanvas, sourceRect, new Point(sourceRect.x, sourceRect.y), blendMode);
	}
	
};
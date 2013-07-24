

function createBrush(color) {
	//console.log("createBrush--------------", color);
    var canvas = $('brush');
    var c = canvas.getContext('2d');

    c.clearRect(0,0,50,50);
    c.beginPath();
    c.moveTo(5,42);
    c.bezierCurveTo(16,46,25,49,26,36);
    c.lineTo(21,32);
    c.bezierCurveTo(14,28,12,42,5,42);
    c.closePath();
    c.fillStyle = '#' + color.substr(2);
    c.fill();

    c.beginPath();
    c.moveTo(21,32);
    c.lineTo(38,5);
    c.lineTo(41,8);
    c.lineTo(26,36);
    c.closePath();
    c.fillStyle = '#574D33';
    c.fill();
}

function $(id) {
    return document.getElementById(id);
}

function hideBrush() {
    $("brush").style.display = 'none';
}

function showBrush() {
    //console.log('showBrush---------------', paintColor);
    $("mouseTrap").style.cursor = paintColor ? 'none' : 'default';
    $("brush").style.display = "";
}

function updateBrushLocation(e) {
    var brush = $('brush');
    var container = $("container");
    var mouseTrap = $("mouseTrap");
    brush.style.left = (e.pageX - container.offsetLeft - mouseTrap.offsetLeft - 5) + 'px';
    brush.style.top = (e.pageY - container.offsetTop - mouseTrap.offsetTop - 42) + 'px';
}

function setPaintColor(c) {
    paintColor = c;
    createBrush(c);
}

function tintToChannel() {
	//console.log("tintToChannel-------------");
    if (!paintColor) return;
    var brush = $('brush');

    if (!bmd_layer) {
        //create gray bitmapdata layer and draw source image with gray matrix filter
        bmd_layer = new BitmapData(sourceImg.width, sourceImg.height);
        var desaturateMatrix = [
            0.299, 0.587, 0.114, 0, 0,
            0.299, 0.587, 0.114, 0, 0,
            0.299, 0.587, 0.114, 0, 0,
            0, 0, 0, 1, 0
        ];
        var desaturateFilter = new ColorMatrixFilter(desaturateMatrix);
        bmd_layer.draw(sourceImg);
        bmd_layer.applyFilter(bmd_layer, bmd_layer.rect, new Point(), desaturateFilter);
    }

    var clickX = parseInt(brush.style.left ) + 5;
    var clickY = parseInt(brush.style.top) + 42;

    var click_bmd_channel;
    var maskNum;
    for (var i=0;i<maskCount;i++) {
        console.log(bmd_channels[i].getRGBPixel(clickX, clickY));
        if (bmd_channels[i].getRGBPixel(clickX, clickY) == 0xffffff) {
            click_bmd_channel = bmd_channels[i];
            maskNum = i;
            break;
        }
    }

    if (!click_bmd_channel) return;

    if (!bmd_alpha_channels[maskNum]) {
        //create channel bitmapdata layer, draw channel image and copy it's RED to gray bitmapdata layer's ALPHA
        bmd_layer.copyChannel(click_bmd_channel, bmd_layer.rect, new Point(), BitmapDataChannel.RED, BitmapDataChannel.ALPHA);

        //clone gray bitmapdata and tint by given color with matrix filter
        bmd_alpha_channels[maskNum] = bmd_layer.clone();
    }
    //var hex = 0xfff99f;//#89779D
    var bmd_obj = bmd_alpha_channels[maskNum].clone();
    var hex = parseInt(paintColor);
    var alpha = 100;
    var matrix = [((hex & 0xFF0000) >>> 16)/255, 0, 0, 0, 0,
        0, ((hex & 0x00FF00) >>> 8)/255, 0, 0, 0,
        0, 0, (hex & 0x0000FF)/255, 0, 0,
        0, 0, 0, alpha/100, 0
    ];
    var filter = new ColorMatrixFilter(matrix);
    bmd_obj.applyFilter(bmd_obj, bmd_obj.rect, new Point(), filter);

    //display painted bitmapdata on the painted canvas
    var paintedCanvas = $("paintedMask" + maskNum);
    var paintedContext = paintedCanvas.getContext("2d");
    paintedCanvas.width = bmd_obj.rect.width;
    paintedCanvas.height = bmd_obj.rect.height;
    paintedContext.putImageData(bmd_obj.data, 0, 0);
}

function mergeImage(canvas) {
    canvas.width = $('source').width;
    canvas.height = $('source').height;
    var c = canvas.getContext("2d");
    c.drawImage($('source'), 0, 0);

    for (var i=0; i<maskCount; i++){
        var pCanvas = $("paintedMask" + i);
        c.drawImage(pCanvas,0,0);
    }
}

var paintedImgCount = 0;
var paintedImgArray = [];
var delBtnArray = [];
var interval;
var saveImgStart = false;

function getRemovePaintedCanvas(){
    for (var i=0; i<paintedImgArray.length; i++) {
        if (paintedImgArray[i].style.display == 'none') {
            paintedImgArray[i].style.cssText = "";
            return paintedImgArray[i];
        }
    }
    return null;
}

function getRemoveDelbtn(){
    for (var i=0; i<delBtnArray.length; i++) {
        if (delBtnArray[i].style.display == 'none') {
            delBtnArray[i].style.cssText = "";
            return delBtnArray[i];
        }
    }
    return null;
}

function saveImg() {
    if (saveImgStart || paintedImgCount == 4) return;
    saveImgStart = true;

    paintedImgCount ++;
    var c = getRemovePaintedCanvas();
    if (!c) {
        c = document.createElement('canvas');
        paintedImgArray.push(c);
    }
    $("container").appendChild(c);
    this.mergeImage(c);

    interval = window.setInterval(function(){
        updateImgSizeAndPos(c);
    },20);
}


function updateImgSizeAndPos(c) {
    var colCount = 1;
    var paintedImgNum = paintedImgCount - 1;
    var row = Math.floor(paintedImgNum / colCount);
    var col = paintedImgNum % colCount;
    c.style.width = (c.style.width ? parseInt(c.style.width) : c.width) * 0.91 + 'px';
    c.style.height = (c.style.height ? parseInt(c.style.height) : c.height) * 0.91 + 'px';
    c.style.left = (c.style.left ? parseInt(c.style.left) : 0) + 47 + col * 9 + 'px';
    c.style.top =  (c.style.top ? parseInt(c.style.top) : 10) + row * 6 + 'px';

    if (parseInt(c.style.width) <= 160) {
        window.clearInterval(interval);
        saveImgStart = false;
        
        var delBtn = getRemoveDelbtn();
        if (!delBtn) {
            delBtn = deleteBtnImg.cloneNode(true);
            delBtnArray.push(delBtn);
        }
        $("container").appendChild(delBtn);
        
        delBtn.style.left = parseInt(c.style.left) + parseInt(c.style.width) - 10 + 'px';
        delBtn.style.top = parseInt(c.style.top) - 6 + 'px';
        delBtn.onclick = function () {
            this.style.display = 'none';
            c.style.display = 'none';
            paintedImgCount-- ;
            for(var i=0, j=0;i<paintedImgArray.length; i++){
                if (paintedImgArray[i].style.display != 'none') {
                    paintedImgArray[i].style.top = 10 + j * 102 + 'px';
                    delBtnArray[i].style.top = 4 + j * 102 + 'px';
                    j++;
                }
            }
        }
    }

}

function clearUp() {
    for (var i=0; i<maskCount; i++) {
        var paintedCanvas = $("paintedMask" + i);
        var paintedContext = paintedCanvas.getContext("2d");
        paintedContext.clearRect(0, 0, paintedCanvas.width, paintedCanvas.height);
    }
}

function setupColors(cs){
	for (var i = 0; i< cs.length; i++) {
    	var divEle = document.createElement('div');
    	$('colorsZone').appendChild(divEle);
    	divEle.style.background = cs[i];
    	divEle.name = cs[i].substring(1);
    	divEle.onclick = function () {
    		var c = '0x' + this['name'];
    		paintColor = c;
    		createBrush(c);
    	};
	};
}
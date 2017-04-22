const {app, BrowserWindow, ipcMain} = require('electron');

let mainWindow, cursorWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

	cursorWindow = new BrowserWindow({
		width: 10, height: 10, 
		transparent:true, 
		frame: false, 
		focusable: false,
		show: false,
		hasShadow: false,
		parent:mainWindow, 
		backgroundColor: '#2e2c29' 
	});
	cursorWindow.hide();
	cursorWindow.setIgnoreMouseEvents(true);
	ipcMain.on('wincrs', (e, x, y, flicker) => {
		//console.log(x,y);
		if(x<0) cursorWindow.hide();
		else {
			cursorWindow.setPosition(x,y);
			cursorWindow.show();
		}
	}).on('wincrs-click', e=> {
		console.log(cursorWindow.webContents);
	});
});

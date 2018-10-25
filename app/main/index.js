import path from 'path';
import { app, crashReporter, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import menuTemplate from './menuTemplate';

const isDevelopment = process.env.NODE_ENV === 'development';
const fs = require('fs');

let mainWindow = null;
let forceQuit = false;




require('electron-context-menu')({
    prepend: (params, browserWindow) => [{
        label: 'Rainbow',
        // Only show it when right-clicking images
        visible: params.mediaType === 'image'
    }]
});

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  for (const name of extensions) {
    try {
      await installer.default(installer[name], forceDownload);
    } catch (e) {
      console.log(`Error installing ${name} extension: ${e.message}`);
    }
  }
};

crashReporter.start({
  productName: 'YourName',
  companyName: 'YourCompany',
  submitURL: 'https://your-domain.com/url-to-submit',
  uploadToServer: false,
});

app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    show: false,
    webPreferences: {
        backgroundThrottling: false
    }
  });
  console.log("Template is ", menuTemplate);
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  mainWindow.webContents.openDevTools();
 
  
  mainWindow.loadFile(path.resolve(path.join(__dirname, '../renderer/index.html')));

  // show window once on first load
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Handle window logic properly on macOS:
    // 1. App should not terminate if window has been closed
    // 2. Click on icon in dock should re-open the window
    // 3. ⌘+Q should close the window and quit the app
    if (process.platform === 'darwin') {
      mainWindow.on('close', function(e) {
        if (!forceQuit) {
          e.preventDefault();
          mainWindow.hide();
        }
      });

      app.on('activate', () => {
        mainWindow.show();
      });

      app.on('before-quit', () => {
        forceQuit = true;
      });
    } else {
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
    }
  });

  if (isDevelopment) {
    // auto-open dev tools
    mainWindow.webContents.openDevTools();

    // add inspect element on right click menu
    /*mainWindow.webContents.on('context-menu', (e, props) => {
      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click() {
            mainWindow.inspectElement(props.x, props.y);
          },
        },
      ]).popup(mainWindow);
    });*/
  }
});


let dir;
ipcMain.on('selectDirectory', () => {
  dir = dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
  });
});


ipcMain.on('folder:open', (event, content) => {
    

    // WE DON"T KNOW WHAT VALUE CONTENT IS
    dialog.showSaveDialog((fileName) => {
        //http://mylifeforthecode.com/getting-started-with-standard-dialogs-in-electron/
  
          if(fileName === undefined) {
              console.log("you did not enter a file name");
              return;
          }
  
          var rawContent = content.replace(/<[^>]+>/g, "");
          fs.writeFile(fileName, rawContent, (error) => {  
              if(null){ 
                  console.log("Error Saving File ", error);
                  // maybe pop up an alert
              }
          });
          
      });
  });
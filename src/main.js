const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    vibrancy: 'under-window'
  })

  win.loadFile(path.join(__dirname, 'index.html'))

  ipcMain.on('window-minimize', () => win.minimize())
  ipcMain.on('window-maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize())
  ipcMain.on('window-close', () => win.close())
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

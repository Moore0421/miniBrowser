const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs');

let bookmarks = [];
const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');

// 加载书签
function loadBookmarks() {
    try {
        if (fs.existsSync(bookmarksPath)) {
            bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
        }
    } catch (error) {
        console.error('Failed to load bookmarks:', error);
    }
}

// 保存书签
function saveBookmarks() {
    try {
        fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Failed to save bookmarks:', error);
    }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      webSecurity: true,
      sandbox: false
    }
  })

  win.loadFile('index.html')

  // 注册 F12 打开开发者工具
  globalShortcut.register('F12', () => {
    win.webContents.toggleDevTools()
  })

  // 窗口控制 IPC 处理
  ipcMain.handle('window-minimize', () => win.minimize())
  ipcMain.handle('window-maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window-close', () => win.close())

  // 监听窗口最大化状态变化
  win.on('maximize', () => {
    win.webContents.send('window-maximize-change', true);
  });
  win.on('unmaximize', () => {
    win.webContents.send('window-maximize-change', false);
  });

  // 添加 webview 安全设置
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'allow' };
  });

  // 添加书签相关 IPC 处理
  ipcMain.handle('save-bookmark', async (event, bookmark) => {
    bookmarks.push(bookmark);
    saveBookmarks();
    // 通知所有窗口更新书签
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('bookmarks-updated');
    });
    return true;
  });

  ipcMain.handle('get-bookmarks', () => bookmarks);

  ipcMain.handle('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  // 修改创建书签窗口的处理
  ipcMain.handle('create-bookmark-window', async (event, data) => {
    const bookmarkWin = new BrowserWindow({
        width: 500,
        height: 400,
        parent: win,
        modal: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // 将数据存储到 window 对象中
    bookmarkWin.bookmarkData = data;

    bookmarkWin.loadFile('bookmark-edit.html');
    return true;
  });

  // 添加获取预填充数据的处理
  ipcMain.handle('get-bookmark-data', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win.bookmarkData || {};
  });

  // 添加编辑书签的IPC处理
  ipcMain.handle('edit-bookmark', async (event, { index, bookmark }) => {
    bookmarks[index] = bookmark;
    saveBookmarks();
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('bookmarks-updated');
    });
    return true;
  });

  // 添加删除书签的IPC处理
  ipcMain.handle('delete-bookmark', async (event, index) => {
    bookmarks.splice(index, 1);
    saveBookmarks();
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('bookmarks-updated');
    });
    return true;
  });
}

app.whenReady().then(() => {
  loadBookmarks();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      contents.loadURL(url);
      return { action: 'deny' };
    });
  }
});

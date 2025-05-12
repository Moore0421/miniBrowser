const { app, BrowserWindow, globalShortcut, ipcMain, shell, dialog, session } = require('electron')
const path = require('path')
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { throttle } = require('lodash');

let bookmarks = [];
const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');

let history = [];
const historyPath = path.join(app.getPath('userData'), 'history.json');

// 下载记录相关
let downloads = [];
const downloadsPath = path.join(app.getPath('userData'), 'downloads.json');
let downloadSettings = {
    defaultDownloadPath: app.getPath('downloads'),
    askBeforeEachDownload: false
};
const downloadSettingsPath = path.join(app.getPath('userData'), 'downloadSettings.json');

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

// 加载历史记录
function loadHistory() {
    try {
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// 保存历史记录
function saveHistory() {
    try {
        fs.writeFileSync(historyPath, JSON.stringify(history));
    } catch (error) {
        console.error('Failed to save history:', error);
    }
}

// 加载下载设置
function loadDownloadSettings() {
    try {
        if (fs.existsSync(downloadSettingsPath)) {
            const data = fs.readFileSync(downloadSettingsPath, 'utf8');
            downloadSettings = JSON.parse(data);
            // 确保 defaultDownloadPath 有值
            if (!downloadSettings.defaultDownloadPath) {
                downloadSettings.defaultDownloadPath = app.getPath('downloads');
            }
        } else { // 如果设置文件不存在，则使用默认值并保存
             downloadSettings.defaultDownloadPath = app.getPath('downloads'); // 确保有默认值
             saveDownloadSettings();
        }
    } catch (error) {
        console.error('Failed to load download settings:', error);
        // 出错时也确保有默认值
        downloadSettings.defaultDownloadPath = app.getPath('downloads');
        downloadSettings.askBeforeEachDownload = false;
    }
}

// 保存下载设置
function saveDownloadSettings() {
    try {
        fs.writeFileSync(downloadSettingsPath, JSON.stringify(downloadSettings));
    } catch (error) {
        console.error('Failed to save download settings:', error);
    }
}

// 加载下载记录
function loadDownloads() {
    try {
        if (fs.existsSync(downloadsPath)) {
            downloads = JSON.parse(fs.readFileSync(downloadsPath, 'utf8'));
        }
    } catch (error) {
        console.error('Failed to load downloads:', error);
    }
}

// 保存下载记录
function saveDownloads() {
    try {
        fs.writeFileSync(downloadsPath, JSON.stringify(downloads));
    } catch (error) {
        console.error('Failed to save downloads:', error);
    }
}

let win = null;

const throttledSendUpdate = throttle((item) => {
    if (win && win.webContents) {
        // 发送item的副本，确保状态是最新的
        const currentItemState = downloads.find(d => d.id === item.id);
        if (currentItemState) {
            win.webContents.send('download-update', { ...currentItemState });
        }
    }
}, 250); // 调整更新频率，例如250ms，可以根据需要调整

function createWindow() {
  win = new BrowserWindow({
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

  // 添加历史记录相关 IPC 处理
  ipcMain.handle('add-history', (event, historyItem) => {
    // 限制历史记录数量为1000条
    if (history.length >= 1000) {
        history.shift(); // 移除最旧的记录
    }
    history.push(historyItem);
    saveHistory();
    return true;
  });

  ipcMain.handle('get-history', () => {
    return history;
  });

  ipcMain.handle('clear-history', () => {
    history = [];
    saveHistory();
    return true;
  });

  // 修改 open-history-window 处理函数
  ipcMain.handle('open-history-window', () => {
    win.webContents.send('open-history-in-tab');
    return true;
  });

  // 添加删除单条历史记录的处理
  ipcMain.handle('delete-history-item', (event, timestamp) => {
    const index = history.findIndex(item => item.timestamp === timestamp);
    if (index !== -1) {
      history.splice(index, 1);
      saveHistory();
    }
    return true;
  });

  ipcMain.handle('open-url-in-new-tab', (event, url) => {
    win.webContents.send('open-url-in-new-tab', url);
    const historyWin = BrowserWindow.fromWebContents(event.sender);
    if (historyWin && historyWin !== win) {
        historyWin.close();
    }
    return true;
  });

  // 下载相关 IPC 处理
  ipcMain.handle('get-download-settings', () => {
    return downloadSettings;
  });

  ipcMain.handle('set-download-settings', (event, settings) => {
    downloadSettings.defaultDownloadPath = settings.defaultDownloadPath;
    downloadSettings.askBeforeEachDownload = settings.askBeforeEachDownload;
    saveDownloadSettings();
    return true;
  });

  ipcMain.handle('get-downloads', () => {
    return downloads;
  });

  ipcMain.handle('open-downloaded-file', (event, filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        shell.openPath(filePath).catch(err => console.error("Failed to open file:", err));
    } else {
        console.error('File not found or path is invalid:', filePath);
    }
  });

  ipcMain.handle('show-item-in-folder', (event, filePath) => {
     if (filePath && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
    } else {
        console.error('File not found or path is invalid for showItemInFolder:', filePath);
    }
  });

  ipcMain.handle('check-file-exists', (event, filePath) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('open-downloads-tab', () => {
    if (win && win.webContents) {
        win.webContents.send('open-downloads-tab-signal');
    } else {
        console.error('[Main] Main window (win) or webContents is not available to send "open-downloads-tab-signal".');
    }
    return true;
  });

  ipcMain.handle('clear-downloads', () => {
    downloads = [];
    saveDownloads();
    return true;
  });

  ipcMain.handle('remove-download', (event, downloadId) => {
    downloads = downloads.filter(d => d.id !== downloadId);
    saveDownloads();
    return true;
  });

  ipcMain.handle('cancel-download', (event, downloadId) => {
    const itemToCancel = session.defaultSession.getAllDownloads().find(d => {
        const ourRecord = downloads.find(d => d.id === downloadId);
        if (ourRecord && d.getURL() === ourRecord.url && d.getState() === 'progressing') {
            return true;
        }
        return false;
    });
    if (itemToCancel) {
        itemToCancel.cancel();
        return true;
    }
    return false;
  });

  ipcMain.handle('retry-download', async (downloadId) => {
    const downloadToRetry = downloads.find(d => d.id === downloadId);
    if (downloadToRetry && (downloadToRetry.state === 'interrupted' || downloadToRetry.state === 'cancelled' || downloadToRetry.state === 'failed')) {
        // 移除旧的失败/取消的记录
        downloads = downloads.filter(d => d.id !== downloadId);
        // saveDownloads(); // 保存移除后的列表

        // 尝试重新下载，这将触发新的 will-download 事件，并生成新的ID
        if (win && win.webContents) {
            win.webContents.downloadURL(downloadToRetry.url);
        }
        saveDownloads(); // 在新下载开始前（或几乎同时）保存移除旧条目后的列表
        return true;
    }
    return false;
  });

  ipcMain.handle('open-path-dialog', async () => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
  });

  // 下载处理
  session.defaultSession.on('will-download', async (event, item, webContents) => {
    const downloadId = uuidv4();
    item.id = downloadId; // 将我们生成的ID附加到Electron的item对象上，方便后续引用

    const filename = item.getFilename();
    const startTime = Date.now();
    let filePathToSave; // 将在路径确定后设置

    const downloadEntry = {
        id: downloadId,
        url: item.getURL(),
        filename: filename,
        filePath: null, // 稍后设置
        startTime: startTime,
        totalBytes: item.getTotalBytes(),
        receivedBytes: 0,
        state: 'progressing', // 初始状态
    };

    // 查找是否已存在此ID的条目（理论上不应该，因为ID是新生成的）
    // 但如果存在，则更新而不是添加，这有助于防止因意外重用ID导致的重复
    const existingEntryIndex = downloads.findIndex(d => d.id === downloadId);
    if (existingEntryIndex > -1) {
        downloads[existingEntryIndex] = downloadEntry;
    } else {
        downloads.unshift(downloadEntry); // 添加到数组开头
    }
    saveDownloads();
    win.webContents.send('download-started-signal', downloadId);

    if (downloadSettings.askBeforeEachDownload) {
        const result = await dialog.showSaveDialog(win, {
            title: '选择保存位置',
            defaultPath: path.join(downloadSettings.defaultDownloadPath, filename)
        });
        if (result.canceled || !result.filePath) {
            item.cancel();
            // 更新条目状态为已取消
            const entryToCancel = downloads.find(d => d.id === item.id);
            if (entryToCancel) {
                entryToCancel.state = 'cancelled';
                saveDownloads();
                win.webContents.send('download-completed', { ...entryToCancel });
            }
            return;
        }
        filePathToSave = result.filePath;
    } else {
        let chosenPath = downloadSettings.defaultDownloadPath || app.getPath('downloads');
        if (!fs.existsSync(chosenPath)) {
            try {
                fs.mkdirSync(chosenPath, { recursive: true });
            } catch (err) {
                console.error("Failed to create default download directory:", err);
                // 如果创建失败，回退到系统下载目录
                chosenPath = app.getPath('downloads');
            }
        }
        filePathToSave = path.join(chosenPath, filename);
        // 处理文件名冲突
        let counter = 1;
        let originalName = path.parse(filename).name;
        let ext = path.parse(filename).ext;
        while (fs.existsSync(filePathToSave)) {
            filePathToSave = path.join(chosenPath, `${originalName} (${counter})${ext}`);
            counter++;
        }
    }

    item.setSavePath(filePathToSave);
    // 更新我们记录中的filePath
    const entryToUpdatePath = downloads.find(d => d.id === item.id);
    if (entryToUpdatePath) {
        entryToUpdatePath.filePath = filePathToSave;
        saveDownloads(); // 保存路径更新
    }

    item.on('updated', (event, state) => {
        const entryToUpdate = downloads.find(d => d.id === item.id); // 使用附加的item.id查找
        if (entryToUpdate) {
            entryToUpdate.receivedBytes = item.getReceivedBytes();
            entryToUpdate.totalBytes = item.getTotalBytes(); // 总大小也可能在下载过程中确定
            entryToUpdate.state = state; // 'progressing' 或 'interrupted'
            saveDownloads(); // 实时保存进度
            throttledSendUpdate({ ...entryToUpdate }); // 发送副本以更新UI
        }
    });

    item.on('done', (event, state) => {
        const entryToUpdate = downloads.find(d => d.id === item.id); // 使用附加的item.id查找
        if (entryToUpdate) {
            entryToUpdate.receivedBytes = item.getReceivedBytes();
            entryToUpdate.totalBytes = item.getTotalBytes();
            entryToUpdate.state = state; // 'completed', 'cancelled', 'interrupted', 'failed'
            entryToUpdate.filePath = item.getSavePath(); // 确保最终路径正确
            saveDownloads();
            win.webContents.send('download-completed', { ...entryToUpdate }); // 发送副本
        }
    });
  });
}

app.whenReady().then(() => {
  loadBookmarks();
  loadHistory();
  loadDownloads();
  loadDownloadSettings();
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

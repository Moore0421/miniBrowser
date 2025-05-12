const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximize-change', (_, isMaximized) => callback(isMaximized));
  },
  saveBookmark: (bookmark) => ipcRenderer.invoke('save-bookmark', bookmark),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  createBookmarkWindow: (data) => ipcRenderer.invoke('create-bookmark-window', data),
  onBookmarksUpdated: (callback) => {
    ipcRenderer.on('bookmarks-updated', callback);
  },
  getBookmarkData: () => ipcRenderer.invoke('get-bookmark-data'),
  editBookmark: (index, bookmark) => ipcRenderer.invoke('edit-bookmark', { index, bookmark }),
  deleteBookmark: (index) => ipcRenderer.invoke('delete-bookmark', index),
  showContextMenu: () => ipcRenderer.invoke('show-context-menu'),
  addHistory: (historyItem) => ipcRenderer.invoke('add-history', historyItem),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  openHistoryWindow: () => ipcRenderer.invoke('open-history-window'),
  openUrlInNewTab: (url) => ipcRenderer.invoke('open-url-in-new-tab', url),
  onOpenUrlInNewTab: (callback) => {
    ipcRenderer.on('open-url-in-new-tab', (_, url) => callback(url));
  },
  deleteHistoryItem: (timestamp) => ipcRenderer.invoke('delete-history-item', timestamp),
  onOpenHistoryInTab: (callback) => {
    ipcRenderer.on('open-history-in-tab', callback);
  },
  getDownloadSettings: () => ipcRenderer.invoke('get-download-settings'),
  setDownloadSettings: (settings) => ipcRenderer.invoke('set-download-settings', settings),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  openDownloadedFile: (filePath) => ipcRenderer.invoke('open-downloaded-file', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  openDownloadsTab: () => {
    return ipcRenderer.invoke('open-downloads-tab');
  },
  onOpenDownloadsTab: (callback) => {
    ipcRenderer.on('open-downloads-tab-signal', (event, ...args) => {
      callback(...args);
    });
  },
  onDownloadStarted: (callback) => ipcRenderer.on('download-started-signal', (event, downloadId) => callback(downloadId)),
  onDownloadUpdate: (callback) => ipcRenderer.on('download-update', (event, item) => callback(item)),
  onDownloadCompleted: (callback) => ipcRenderer.on('download-completed', (event, item) => callback(item)),
  clearDownloads: () => ipcRenderer.invoke('clear-downloads'),
  removeDownload: (downloadId) => ipcRenderer.invoke('remove-download', downloadId),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  retryDownload: (downloadId) => ipcRenderer.invoke('retry-download', downloadId),
  openPathDialog: () => ipcRenderer.invoke('open-path-dialog')
})

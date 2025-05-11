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
  showContextMenu: () => ipcRenderer.invoke('show-context-menu')
})

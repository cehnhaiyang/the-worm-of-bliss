
const { contextBridge, ipcRenderer } = require('electron');

// 将安全的 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // ============================================
  // 文件系统 API - 存档 & 日志
  // ============================================

  /** -----------------------------------------
   * 高级存档 API (代替原始文件读写)
   * ----------------------------------------- */

  saveGame: (slot, saveData) =>
    ipcRenderer.invoke('fs:saveGame', slot, saveData),

  loadGame: (slot) =>
    ipcRenderer.invoke('fs:loadGame', slot),

  deleteSave: (slot) =>
    ipcRenderer.invoke('fs:deleteSave', slot),

  getSaveSlots: () =>
    ipcRenderer.invoke('fs:getSaveSlots'),

  /** 追加写入日志行 */
  appendLog: (relativePath, line) =>
    ipcRenderer.invoke('fs:appendLog', relativePath, line),
});


import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 在 ESM 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 数据目录：项目根目录 / data/
// ============================================

const DATA_DIR = path.join(__dirname, '..', 'data');
const SAVES_DIR = path.join(DATA_DIR, 'saves');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 安全地将相对路径解析为 DATA_DIR 内的绝对路径（防路径穿越）
function resolveSafePath(relativePath) {
  const resolved = path.resolve(DATA_DIR, relativePath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw new Error(`非法路径: ${relativePath}`);
  }
  return resolved;
}

// ============================================
// IPC 处理器注册
// ============================================

function registerIpcHandlers() {
  // ============================================
  // 高级存档 API (替换原有的零碎文件读写)
  // ============================================

  // 1. 保存游戏 (写入拆分的 JSON 结构)
  ipcMain.handle('fs:saveGame', async (_event, slot, saveData) => {
    try {
      const dirName = slot === 'auto' ? 'autosave' : `slot_${slot}`;
      const dirPath = resolveSafePath(`saves/${dirName}`);
      ensureDir(dirPath);

      // 提取核心数据
      const { systemState, masterState, carriages, maidens, logs, ...metadata } = saveData;

      fs.writeFileSync(path.join(dirPath, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dirPath, 'system.json'), JSON.stringify(systemState, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dirPath, 'master.json'), JSON.stringify(masterState, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dirPath, 'carriages.json'), JSON.stringify(carriages, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dirPath, 'maidens.json'), JSON.stringify(maidens, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dirPath, 'logs.json'), JSON.stringify(logs, null, 2), 'utf-8');

      return { success: true };
    } catch (err) {
      console.error('[Main] fs:saveGame 失败:', err);
      return { success: false, error: err.message };
    }
  });

  // 2. 加载游戏
  ipcMain.handle('fs:loadGame', async (_event, slot) => {
    try {
      const dirName = slot === 'auto' ? 'autosave' : `slot_${slot}`;
      const dirPath = resolveSafePath(`saves/${dirName}`);

      if (!fs.existsSync(dirPath) || !fs.existsSync(path.join(dirPath, 'metadata.json'))) {
        return { success: false, error: '存档不存在' };
      }

      const readFile = (filename) => {
        const filePath = path.join(dirPath, filename);
        return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : undefined;
      };

      // 分片缺失即判定存档损坏：缺一份就静默给空表，等于把损失拖到玩法里才发作
      const requiredShards = ['metadata.json', 'system.json', 'master.json', 'carriages.json', 'maidens.json', 'logs.json'];
      const missing = requiredShards.find(filename => !fs.existsSync(path.join(dirPath, filename)));
      if (missing) {
        return { success: false, error: `存档不完整，缺少 ${missing}` };
      }

      const metadata = readFile('metadata.json');
      const saveData = {
        ...metadata,
        systemState: readFile('system.json'),
        masterState: readFile('master.json'),
        carriages: readFile('carriages.json'),
        maidens: readFile('maidens.json'),
        logs: readFile('logs.json')
      };

      return { success: true, data: saveData };
    } catch (err) {
      console.error('[Main] fs:loadGame 失败:', err);
      return { success: false, error: err.message };
    }
  });

  // 3. 删除存档
  ipcMain.handle('fs:deleteSave', async (_event, slot) => {
    try {
      const dirName = slot === 'auto' ? 'autosave' : `slot_${slot}`;
      const dirPath = resolveSafePath(`saves/${dirName}`);
      
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      return { success: true };
    } catch (err) {
      console.error('[Main] fs:deleteSave 失败:', err);
      return { success: false, error: err.message };
    }
  });

  // 4. 获取存档列表
  ipcMain.handle('fs:getSaveSlots', async (_event) => {
    try {
      const savesPath = resolveSafePath('saves');
      if (!fs.existsSync(savesPath)) return { success: true, slots: [] };

      const dirs = fs.readdirSync(savesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const slots = [];
      for (const dir of dirs) {
        let slot;
        if (dir === 'autosave') slot = 'auto';
        else if (dir.startsWith('slot_')) slot = parseInt(dir.split('_')[1], 10);
        else continue;

        const metaPath = path.join(savesPath, dir, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          slots.push({
            slot,
            timestamp: meta.timestamp || 0,
            daysElapsed: meta.stats?.daysElapsed || 0,
            playTime: meta.playTime || 0,
            slotName: meta.slotName,
            maidenCount: meta.maidenCount || 0,
            version: meta.version || '0.0.0'
          });
        }
      }
      return { success: true, slots: slots.sort((a, b) => b.timestamp - a.timestamp) };
    } catch (err) {
      console.error('[Main] fs:getSaveSlots 失败:', err);
      return { success: false, error: err.message };
    }
  });

  // 追加日志行
  ipcMain.handle('fs:appendLog', async (_event, relativePath, line) => {
    try {
      const filePath = resolveSafePath(relativePath);
      ensureDir(path.dirname(filePath));
      fs.appendFileSync(filePath, line + '\n', 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('[Main] fs:appendLog 失败:', err);
      return { success: false, error: err.message };
    }
  });
}

const createWindow = () => {
  // 预先创建数据目录
  ensureDir(SAVES_DIR);
  ensureDir(LOGS_DIR);

  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#050505', // 匹配 body 背景色，防止白屏闪烁
    title: '至乐之蠕虫 | The Worm of Bliss',
    autoHideMenuBar: true, // 自动隐藏菜单栏，保持沉浸感
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 关闭跨域限制，允许直接请求外部 API (如 Groq)
    },
  });

  // 设置 User-Agent 避免被识别为爬虫
  win.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // 根据是否为打包环境决定加载方式
  const isDev = !app.isPackaged;

  // 监听加载失败
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    if (errorCode === -102 && isDev) {
      console.error('无法连接到 Vite 开发服务器，请确保 Vite 已启动');
    }
  });

  // 监听加载完成
  win.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
    console.log(`[Main] 数据目录: ${DATA_DIR}`);
  });

  // 监听控制台消息（仅开发模式）
  if (isDev) {
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer ${level}]:`, message);
    });
  }

  // 根据环境加载不同来源
  if (isDev) {
    win.loadURL('http://localhost:5137').catch(err => {
      console.error('loadURL 失败:', err);
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 仅开发模式下打开开发工具
  if (isDev) {
    win.webContents.openDevTools();
  }
};

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

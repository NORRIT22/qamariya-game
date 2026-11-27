const { app, BrowserWindow, shell, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_URL = "https://norrit22.github.io/readdy_3/";
let mainWindow = null;
let splashWindow = null;
let startupFinished = false;
let offlineState = false;

const APP_LOGO = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 18C10 15.8 11.8 14 14 14H30V50H14C11.8 50 10 48.2 10 46V18Z" fill="#1A73E8"/><path d="M34 14H50C52.2 14 54 15.8 54 18V46C54 48.2 52.2 50 50 50H34V14Z" fill="#8AB4F8"/><path d="M30 14H34V50H30V14Z" fill="#D3E3FD"/><rect x="15" y="22" width="10" height="2.6" rx="1.3" fill="#fff"/><rect x="15" y="28.5" width="10" height="2.6" rx="1.3" fill="#fff"/><rect x="15" y="35" width="7" height="2.6" rx="1.3" fill="#fff"/><path d="M40 25.5L48.5 32L40 38.5V25.5Z" fill="#041E49"/></svg>';

function splashMarkup(mode = "loading") {
  const offline = mode === "offline";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
  *{box-sizing:border-box}body{margin:0;width:100vw;height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 0%,#182235 0%,#0b0d12 58%,#090a0d 100%);color:#f5f7fb;font-family:"Segoe UI",Tahoma,sans-serif;overflow:hidden}
  .card{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px 42px;text-align:center;position:relative}
  .glow{position:absolute;width:190px;height:190px;border-radius:50%;background:#1a73e8;filter:blur(85px);opacity:.2;top:36px}
  .logo{width:82px;height:82px;border-radius:25px;display:grid;place-items:center;background:linear-gradient(145deg,#202b3e,#111824);border:1px solid #34445d;box-shadow:0 16px 50px #0008, inset 0 1px #ffffff18;z-index:1}
  .logo svg{width:54px;height:54px;filter:drop-shadow(0 5px 12px #1a73e866)}
  h1{font-size:25px;letter-spacing:.2px;margin:19px 0 7px;font-weight:700} .sub{font-size:13px;color:#9aa8bc;margin:0;line-height:1.8}
  .status{margin-top:29px;display:flex;align-items:center;gap:10px;color:#aab8cb;font-size:12px}
  .dot{width:7px;height:7px;border-radius:50%;background:#58a6ff;box-shadow:0 0 14px #58a6ff;animation:pulse 1.2s infinite}
  .bar{width:210px;height:3px;border-radius:8px;background:#263244;margin-top:16px;overflow:hidden}.fill{height:100%;width:38%;border-radius:8px;background:linear-gradient(90deg,#1a73e8,#8ab4f8);animation:load 1.5s ease-in-out infinite}
  .offlineIcon{width:46px;height:46px;border:1px solid #634c32;border-radius:15px;display:grid;place-items:center;color:#f0b45d;background:#2a2117;font-size:23px}
  .message{max-width:390px;margin:13px 0 0;color:#b2bdcc;font-size:13px;line-height:1.9}
  .actions{display:flex;gap:10px;margin-top:24px}.btn{border:1px solid #35445a;border-radius:10px;padding:11px 19px;font-size:13px;font-weight:600;cursor:pointer;color:#eaf1fb;background:#1a2432}.primary{background:#1a73e8;border-color:#1a73e8;color:white}.btn:hover{filter:brightness(1.13)}
  .foot{position:absolute;bottom:18px;font-size:10px;color:#68778b;letter-spacing:.5px}
  @keyframes pulse{50%{opacity:.35;transform:scale(.8)}}@keyframes load{0%{transform:translateX(250%)}100%{transform:translateX(-300%)}}
  </style></head><body><main class="card"><div class="glow"></div><div class="logo">${APP_LOGO}</div><h1>Readdy 3</h1>
  ${offline ? '<div class="offlineIcon">⌁</div><p class="message"><b style="color:#f2c27c">تعذّر الاتصال بالإنترنت</b><br>يمكنك متابعة استخدام المحتوى والملفات المحفوظة محلياً. قد لا تتوفر حالياً ميزات الذكاء الاصطناعي والمزامنة والخدمات السحابية.</p><div class="actions"><button class="btn" onclick="window.startupAction('retry')">إعادة المحاولة</button><button class="btn primary" onclick="window.startupAction('offline')">المتابعة دون اتصال</button></div>' : '<p class="sub">مساحة تعلمك، جاهزة للانطلاق</p><div class="status"><span class="dot"></span><span>جارٍ تجهيز التطبيق والتحقق من الاتصال…</span></div><div class="bar"><div class="fill"></div></div>'}
  <div class="foot">YOUR LEARNING SPACE</div></main><script>const{ipcRenderer}=require('electron');</script></body></html>`;
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 540, height: 430, frame: false, resizable: false,
    transparent: false, alwaysOnTop: true, center: true,
    show: false, backgroundColor: '#0B0D12',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashMarkup()));
  splashWindow.once('ready-to-show', () => splashWindow.show());
  splashWindow.webContents.on('page-title-updated', async (event, title) => {
    if (title === 'CONTINUE_OFFLINE') revealMain();
    if (title === 'RETRY_CONNECTION') {
      const online = await checkInternet();
      if (online) revealMain(); else showOfflinePrompt();
    }
  });
}

function showOfflinePrompt() {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashMarkup('offline')));
}
function revealMain() {
  if (startupFinished) return;
  startupFinished = true;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  splashWindow = null;
}

async function checkInternet() {
  try {
    const response = await net.fetch(APP_URL, { method: "HEAD", signal: AbortSignal.timeout(4500) });
    return response.ok;
  } catch { return false; }
}

function createMainWindow() {
  const siteRoot = app.isPackaged
    ? path.join(process.resourcesPath, "app-site")
    : path.join(__dirname, "..");
  const startUrl = pathToFileURL(path.join(siteRoot, "index.html")).href;

  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 650,
    show: false, autoHideMenuBar: true, backgroundColor: "#0B0B0C", title: "Readdy 3",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\\/\\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      event.preventDefault(); shell.openExternal(url);
    }
  });

  mainWindow.loadURL(startUrl);
  mainWindow.webContents.once("did-finish-load", async () => {
    offlineState = !(await checkInternet());
    if (offlineState) showOfflinePrompt();
    else revealMain();
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, validatedURL, isMainFrame) => {
    if (isMainFrame && code !== -3 && !startupFinished) {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(splashMarkup("offline")));
      }
    }
  });
}

app.whenReady().then(() => {
  createSplash();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) { startupFinished = false; createSplash(); createMainWindow(); }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');
const path = require('path');

let mainWindow;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true,
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'POS Pro',
        show: false,
        backgroundColor: '#0a0a0a',
    });

    const startUrl = isDev
        ? `http://localhost:5173`
        : `file://${path.join(__dirname, '../client/dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    const template = [
        {
            label: 'POS Pro',
            submenu: [
                {
                    label: 'Acerca de POS Pro',
                    click: async () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Acerca de POS Pro',
                            message: 'POS Pro v1.0\n\nSistema Profesional de Punto de Venta\nDesarrollado por Alejandro Perez Vasquez\n\nAPV Labs - 2026\nTodos los derechos reservados.',
                            buttons: ['OK']
                        });
                    }
                },
                { type: 'separator' },
                { role: 'about' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Documentacion',
                    click: async () => {
                        await shell.openExternal('https://github.com/Alejandroperezitsur/Punto-de-Venta');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

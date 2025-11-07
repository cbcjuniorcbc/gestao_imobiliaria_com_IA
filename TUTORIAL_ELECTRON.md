# 📦 Tutorial: Integração Electron + React + SQLite

Este tutorial ensina como transformar esta aplicação React em um executável Windows (.exe) usando Electron.

---

## 📋 Pré-requisitos (Windows)

Antes de começar, instale:

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/
   - Verificar instalação: `node -v` e `npm -v`

2. **Git** (opcional, mas recomendado)
   - Download: https://git-scm.com/

3. **Python** e **windows-build-tools** (para compilar módulos nativos)
   ```bash
   # PowerShell como Administrador
   npm install --global windows-build-tools
   ```

4. **Visual Studio Build Tools** (alternativa ao windows-build-tools)
   - Download: https://visualstudio.microsoft.com/downloads/
   - Instalar "Desktop development with C++"

---

## 🚀 Passo 1: Instalar Dependências do Electron

No diretório raiz do projeto, execute:

```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
npm install better-sqlite3 bcrypt
```

### Pacotes instalados:
- `electron`: Framework para desktop
- `electron-builder`: Empacotador (gera .exe)
- `better-sqlite3`: Driver SQLite (mais rápido que sqlite3)
- `bcrypt`: Hash de senhas
- `concurrently`: Executar múltiplos comandos
- `wait-on`: Esperar servidor estar pronto
- `cross-env`: Variáveis de ambiente multiplataforma

---

## 🔧 Passo 2: Configurar package.json

Adicione/modifique estas seções no `package.json`:

```json
{
  "name": "gestao-imobiliaria",
  "version": "1.0.0",
  "description": "Sistema de Gestão Imobiliária Desktop",
  "main": "electron/main.js",
  "homepage": "./",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \"cross-env BROWSER=none npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder --win nsis",
    "electron:build:portable": "npm run build && electron-builder --win portable",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.gestao.imobiliaria",
    "productName": "Gestão Imobiliária",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Gestão Imobiliária"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "database/**/*"
    ],
    "extraResources": [
      {
        "from": "database",
        "to": "database"
      }
    ],
    "directories": {
      "buildResources": "build",
      "output": "release"
    }
  }
}
```

---

## 📁 Passo 3: Criar Estrutura do Electron

### 3.1 - Criar pasta `electron/` na raiz

```bash
mkdir electron
```

### 3.2 - Criar `electron/main.js`

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

let mainWindow;
let db;
let rootPath;
let lockFilePath;

// Definir pasta raiz padrão (pode ser alterada pelo admin)
function getDefaultRootPath() {
  const userDataPath = app.getPath('userData');
  const defaultPath = path.join(userDataPath, 'GestaoImobiliariaData');
  
  // Criar pasta se não existir
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
  }
  
  return defaultPath;
}

// Verificar e criar arquivo de lock
function checkDatabaseLock() {
  lockFilePath = path.join(rootPath, '.db.lock');
  
  if (fs.existsSync(lockFilePath)) {
    const response = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['Cancelar', 'Forçar Abertura (Admin)'],
      defaultId: 0,
      title: 'Banco de Dados em Uso',
      message: 'ATENÇÃO: Este banco de dados já está aberto em outra instância.',
      detail: 'Abrir simultaneamente pode corromper os dados. Recomendamos fechar a outra instância primeiro.\n\nApenas administradores devem forçar a abertura.'
    });
    
    if (response === 0) {
      app.quit();
      return false;
    }
  }
  
  // Criar arquivo de lock
  fs.writeFileSync(lockFilePath, `${Date.now()}\n${process.pid}`);
  return true;
}

// Remover lock ao fechar
function removeDatabaseLock() {
  if (lockFilePath && fs.existsSync(lockFilePath)) {
    fs.unlinkSync(lockFilePath);
  }
}

// Inicializar banco de dados
function initializeDatabase() {
  const dbPath = path.join(rootPath, 'database.db');
  
  try {
    db = new Database(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging para performance
    
    // Executar schema se banco estiver vazio
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    if (tables.length === 0) {
      console.log('Banco vazio. Executando schema...');
      const schemaSQL = fs.readFileSync(
        path.join(__dirname, '../database/schema.sql'),
        'utf8'
      );
      db.exec(schemaSQL);
      
      // Executar seed data
      const seedSQL = fs.readFileSync(
        path.join(__dirname, '../database/seed.sql'),
        'utf8'
      );
      db.exec(seedSQL);
      
      console.log('Banco inicializado com sucesso!');
    }
    
    console.log('Banco de dados conectado:', dbPath);
  } catch (error) {
    console.error('Erro ao conectar banco:', error);
    dialog.showErrorBox('Erro de Banco de Dados', `Não foi possível conectar ao banco:\n${error.message}`);
    app.quit();
  }
}

// Criar pastas para proprietários/inquilinos
function createFolder(folderPath) {
  const fullPath = path.join(rootPath, folderPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

// Criar janela principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.ico')
  });

  // Carregar app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ========================================
// IPC HANDLERS - Comunicação com o React
// ========================================

// Autenticação
ipcMain.handle('auth:login', async (event, { username, password }) => {
  try {
    const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);
    
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return { success: false, error: 'Senha incorreta' };
    }
    
    // Remover hash da resposta
    const { password_hash, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, error: error.message };
  }
});

// Proprietários
ipcMain.handle('proprietarios:getAll', async () => {
  try {
    const proprietarios = db.prepare('SELECT * FROM proprietarios ORDER BY nome').all();
    return { success: true, data: proprietarios };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proprietarios:create', async (event, proprietario) => {
  try {
    const id = Date.now().toString();
    const pasta_path = `/Proprietario_${proprietario.nome.replace(/\s+/g, '_')}`;
    
    db.prepare(`
      INSERT INTO proprietarios (id, nome, cpf_cnpj, telefone, email, endereco, observacoes, pasta_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, proprietario.nome, proprietario.cpf_cnpj, proprietario.telefone, 
           proprietario.email, proprietario.endereco, proprietario.observacoes || '', pasta_path);
    
    // Criar pasta física
    createFolder(pasta_path);
    
    // Log da ação
    logAction(event.sender.id, proprietario.user_id, proprietario.user_name, 
              'Cadastro', `Cadastrou proprietário: ${proprietario.nome}`);
    
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Imóveis
ipcMain.handle('imoveis:getByProprietario', async (event, proprietarioId) => {
  try {
    const imoveis = db.prepare('SELECT * FROM imoveis WHERE proprietario_id = ?').all(proprietarioId);
    return { success: true, data: imoveis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Boletos
ipcMain.handle('boletos:getByInquilino', async (event, inquilinoId) => {
  try {
    const boletos = db.prepare('SELECT * FROM boletos WHERE inquilino_id = ? ORDER BY data_vencimento DESC').all(inquilinoId);
    return { success: true, data: boletos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:marcarPago', async (event, { boletoId, userId, userName }) => {
  try {
    const boleto = db.prepare('SELECT * FROM boletos WHERE id = ?').get(boletoId);
    
    db.prepare(`
      UPDATE boletos 
      SET situacao = 'Pago', data_pagamento = datetime('now', 'localtime')
      WHERE id = ?
    `).run(boletoId);
    
    // Log da ação
    logAction(event.sender.id, userId, userName, 
              'Pagamento', `Marcou boleto como pago: R$ ${boleto.valor_total.toFixed(2)}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Upload de arquivo
ipcMain.handle('documentos:upload', async (event, { ownerType, ownerId, file, userId }) => {
  try {
    // Obter pasta do proprietário/inquilino
    let folderPath;
    if (ownerType === 'proprietario') {
      const prop = db.prepare('SELECT pasta_path FROM proprietarios WHERE id = ?').get(ownerId);
      folderPath = prop.pasta_path;
    } else {
      const inq = db.prepare('SELECT pasta_path FROM inquilinos WHERE id = ?').get(ownerId);
      folderPath = inq.pasta_path;
    }
    
    // Criar pasta se não existir
    const fullFolderPath = createFolder(folderPath);
    
    // Salvar arquivo
    const filePath = path.join(fullFolderPath, file.name);
    fs.writeFileSync(filePath, Buffer.from(file.data));
    
    // Registrar no banco
    const id = Date.now().toString();
    db.prepare(`
      INSERT INTO documentos (id, owner_type, owner_id, filename, path, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, ownerType, ownerId, file.name, filePath, userId);
    
    return { success: true, id, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Função auxiliar de log
function logAction(senderId, userId, userName, acaoTipo, descricao) {
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO logs_acoes (id, usuario_id, usuario_nome, acao_tipo, descricao)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, userName, acaoTipo, descricao);
}

// Selecionar nova pasta raiz (admin)
ipcMain.handle('config:selectRootPath', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Selecionar Pasta Raiz do Sistema'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }
  
  return { success: false };
});

// ========================================
// INICIALIZAÇÃO DO APP
// ========================================

app.whenReady().then(() => {
  // Definir pasta raiz
  rootPath = getDefaultRootPath();
  
  // Verificar lock
  if (!checkDatabaseLock()) {
    return;
  }
  
  // Inicializar banco
  initializeDatabase();
  
  // Criar janela
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  removeDatabaseLock();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
  removeDatabaseLock();
});
```

### 3.3 - Criar `electron/preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expor API segura para o React
contextBridge.exposeInMainWorld('electronAPI', {
  // Autenticação
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  
  // Proprietários
  getProprietarios: () => ipcRenderer.invoke('proprietarios:getAll'),
  createProprietario: (data) => ipcRenderer.invoke('proprietarios:create', data),
  
  // Imóveis
  getImoveisByProprietario: (id) => ipcRenderer.invoke('imoveis:getByProprietario', id),
  
  // Boletos
  getBoletosByInquilino: (id) => ipcRenderer.invoke('boletos:getByInquilino', id),
  marcarBoletoPago: (data) => ipcRenderer.invoke('boletos:marcarPago', data),
  
  // Documentos
  uploadDocumento: (data) => ipcRenderer.invoke('documentos:upload', data),
  
  // Configurações
  selectRootPath: () => ipcRenderer.invoke('config:selectRootPath'),
});
```

---

## 🎨 Passo 4: Criar Ícone do App

Crie uma pasta `build/` na raiz e adicione:
- `icon.ico` (Windows) - 256x256px ou maior

Você pode usar ferramentas como:
- https://convertio.co/png-ico/
- https://www.icoconverter.com/

---

## 🔌 Passo 5: Adaptar o React para usar Electron

### 5.1 - Modificar `src/contexts/AuthContext.tsx`

Detectar se está rodando no Electron e usar a API apropriada:

```typescript
const isElectron = () => {
  return window && window.electronAPI !== undefined;
};

const login = async (username: string, password: string): Promise<boolean> => {
  if (isElectron()) {
    // Usar Electron IPC
    const result = await window.electronAPI.login({ username, password });
    if (result.success) {
      setUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      return true;
    }
    return false;
  } else {
    // Fallback para mock (desenvolvimento web)
    // ... código existente
  }
};
```

### 5.2 - Adicionar tipos TypeScript

Criar `src/types/electron.d.ts`:

```typescript
export {};

declare global {
  interface Window {
    electronAPI?: {
      login: (credentials: { username: string; password: string }) => Promise<any>;
      getProprietarios: () => Promise<any>;
      createProprietario: (data: any) => Promise<any>;
      // ... adicionar todos os métodos
    };
  }
}
```

---

## ▶️ Passo 6: Executar e Testar

### Modo desenvolvimento:

```bash
npm run electron:dev
```

Isso irá:
1. Iniciar o servidor Vite
2. Aguardar estar pronto
3. Abrir o Electron apontando para localhost:8080

### Build para produção:

```bash
npm run electron:build
```

O instalador será gerado em `release/` com:
- `Gestão Imobiliária Setup.exe` (instalador NSIS)
- `Gestão Imobiliária.exe` (versão portable)

---

## 📦 Passo 7: Distribuição

### Instalar o aplicativo:
1. Execute o `Setup.exe`
2. Siga o assistente de instalação
3. Escolha a pasta de instalação
4. O app criará automaticamente a pasta de dados

### Usando com Google Drive:
1. No primeiro uso, escolha uma pasta dentro do Google Drive for Desktop
2. **IMPORTANTE**: Nunca abra o mesmo banco em duas máquinas simultaneamente
3. Feche o app antes de permitir sincronização em conflitos

---

## 🐛 Solução de Problemas Comuns

### Erro: `node-gyp` não encontrado

```bash
# PowerShell como Admin
npm install --global windows-build-tools
```

### Erro: `better-sqlite3` falha ao compilar

```bash
npm rebuild better-sqlite3 --update-binary
```

### Erro: VCRUNTIME140.dll não encontrado

Instale o Visual C++ Redistributable:
- https://aka.ms/vs/17/release/vc_redist.x64.exe

### App não abre após build

Verifique se o `main.js` está correto em `package.json`:
```json
"main": "electron/main.js"
```

### Banco de dados corrompido

Se sincronizando via Google Drive:
1. Feche TODAS as instâncias do app
2. Faça backup manual do `database.db`
3. Aguarde sincronização completa
4. Abra novamente em apenas UMA máquina

---

## 📚 Recursos Adicionais

- Documentação Electron: https://www.electronjs.org/docs
- Electron Builder: https://www.electron.build/
- Better SQLite3: https://github.com/WiseLibs/better-sqlite3
- Bcrypt: https://github.com/kelektiv/node.bcrypt.js

---

## ✅ Checklist Final

- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Pasta `electron/` criada com `main.js` e `preload.js`
- [ ] Pasta `database/` com `schema.sql` e `seed.sql`
- [ ] Ícone adicionado em `build/icon.ico`
- [ ] `package.json` configurado
- [ ] Tipos TypeScript criados
- [ ] React adaptado para detectar Electron
- [ ] Teste em desenvolvimento (`npm run electron:dev`)
- [ ] Build gerado (`npm run electron:build`)
- [ ] Instalador testado

---

🎉 **Pronto!** Seu sistema está pronto para ser distribuído como executável Windows!

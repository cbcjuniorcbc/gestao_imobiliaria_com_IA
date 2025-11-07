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
      preload: path.join(__dirname, 'preload.cjs')
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

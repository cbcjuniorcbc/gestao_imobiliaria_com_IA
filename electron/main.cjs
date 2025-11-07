const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

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
    try {
      // Ler o PID do processo que criou o lock
      const lockContent = fs.readFileSync(lockFilePath, 'utf8');
      const lines = lockContent.split('\n');
      const lockPid = parseInt(lines[1]);
      
      // Verificar se o processo ainda está rodando
      let processRunning = false;
      try {
        process.kill(lockPid, 0); // Signal 0 apenas verifica se o processo existe
        processRunning = true;
      } catch (e) {
        processRunning = false;
      }
      
      if (processRunning) {
        // Processo ainda está rodando - perguntar ao usuário
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
      } else {
        // Processo não está mais rodando - remover lock antigo automaticamente
        fs.unlinkSync(lockFilePath);
      }
    } catch (error) {
      // Se houver erro ao ler o lock, remove o arquivo e continua
      console.log('Removendo lock antigo...');
      fs.unlinkSync(lockFilePath);
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
async function initializeDatabase() {
  const dbPath = path.join(rootPath, 'database.db');
  
  try {
    const SQL = await initSqlJs();
    
    // Carregar banco existente ou criar novo
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
      
      console.log('Banco vazio. Executando schema...');
      const schemaSQL = fs.readFileSync(
        path.join(__dirname, '../database/schema.sql'),
        'utf8'
      );
      db.run(schemaSQL);
      
      // Executar seed data
      const seedSQL = fs.readFileSync(
        path.join(__dirname, '../database/seed.sql'),
        'utf8'
      );
      db.run(seedSQL);
      
      // Salvar banco inicial
      saveDatabase();
      
      console.log('Banco inicializado com sucesso!');
    }
    
    console.log('Banco de dados conectado:', dbPath);
  } catch (error) {
    console.error('Erro ao conectar banco:', error);
    dialog.showErrorBox('Erro de Banco de Dados', `Não foi possível conectar ao banco:\n${error.message}`);
    app.quit();
  }
}

// Salvar banco em disco
function saveDatabase() {
  if (!db) return;
  const dbPath = path.join(rootPath, 'database.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
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
  const distPath = path.join(__dirname, '../dist/index.html');
  const isDevelopment = !fs.existsSync(distPath);
  
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(distPath);
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
    const result = db.exec('SELECT * FROM usuarios WHERE username = ?', [username]);
    
    if (!result || result.length === 0 || result[0].values.length === 0) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const user = {};
    columns.forEach((col, i) => user[col] = values[i]);
    
    // Permitir login do admin sem senha se password_hash estiver vazio
    if (user.password_hash === '' && username === 'admin' && password === '') {
      const { password_hash, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
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

// Usuários - Listar todos
ipcMain.handle('usuarios:getAll', async () => {
  try {
    const result = db.exec('SELECT id, username, role, criado_em as created_at FROM usuarios ORDER BY username');
    const usuarios = resultToArray(result);
    return { success: true, users: usuarios };
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return { success: false, error: error.message };
  }
});

// Usuários - Criar novo
ipcMain.handle('usuarios:create', async (event, { username, password, role }) => {
  try {
    // Verificar se usuário já existe
    const existingResult = db.exec('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existingResult && existingResult.length > 0 && existingResult[0].values.length > 0) {
      return { success: false, message: 'Usuário já existe' };
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : '';
    const id = Date.now().toString();
    
    db.run(
      'INSERT INTO usuarios (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [id, username, passwordHash, role]
    );
    
    saveDatabase();

    return { success: true, userId: id };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return { success: false, message: 'Erro ao criar usuário' };
  }
});

// Usuários - Alterar senha
ipcMain.handle('usuarios:updatePassword', async (event, { userId, newPassword }) => {
  try {
    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 10) : '';
    
    db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    
    saveDatabase();

    return { success: true };
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return { success: false, message: 'Erro ao alterar senha' };
  }
});

// Proprietários
ipcMain.handle('proprietarios:getAll', async () => {
  try {
    const result = db.exec('SELECT * FROM proprietarios ORDER BY nome');
    const proprietarios = resultToArray(result);
    return { success: true, data: proprietarios };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proprietarios:create', async (event, proprietario) => {
  try {
    const id = Date.now().toString();
    const pasta_path = `/Proprietario_${proprietario.nome.replace(/\s+/g, '_')}`;
    
    db.run(
      `INSERT INTO proprietarios (id, nome, cpf_cnpj, telefone, email, endereco, observacoes, pasta_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, proprietario.nome, proprietario.cpf_cnpj, proprietario.telefone, 
       proprietario.email, proprietario.endereco, proprietario.observacoes || '', pasta_path]
    );
    
    saveDatabase();
    
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
    const result = db.exec('SELECT * FROM imoveis WHERE proprietario_id = ?', [proprietarioId]);
    const imoveis = resultToArray(result);
    return { success: true, data: imoveis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Boletos
ipcMain.handle('boletos:getByInquilino', async (event, inquilinoId) => {
  try {
    const result = db.exec('SELECT * FROM boletos WHERE inquilino_id = ? ORDER BY data_vencimento DESC', [inquilinoId]);
    const boletos = resultToArray(result);
    return { success: true, data: boletos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:marcarPago', async (event, { boletoId, userId, userName }) => {
  try {
    const result = db.exec('SELECT * FROM boletos WHERE id = ?', [boletoId]);
    const boletos = resultToArray(result);
    const boleto = boletos[0];
    
    db.run(
      `UPDATE boletos 
       SET situacao = 'Pago', data_pagamento = datetime('now', 'localtime')
       WHERE id = ?`,
      [boletoId]
    );
    
    saveDatabase();
    
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
      const result = db.exec('SELECT pasta_path FROM proprietarios WHERE id = ?', [ownerId]);
      const props = resultToArray(result);
      folderPath = props[0].pasta_path;
    } else {
      const result = db.exec('SELECT pasta_path FROM inquilinos WHERE id = ?', [ownerId]);
      const inqs = resultToArray(result);
      folderPath = inqs[0].pasta_path;
    }
    
    // Criar pasta se não existir
    const fullFolderPath = createFolder(folderPath);
    
    // Salvar arquivo
    const filePath = path.join(fullFolderPath, file.name);
    fs.writeFileSync(filePath, Buffer.from(file.data));
    
    // Registrar no banco
    const id = Date.now().toString();
    db.run(
      `INSERT INTO documentos (id, owner_type, owner_id, filename, path, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ownerType, ownerId, file.name, filePath, userId]
    );
    
    saveDatabase();
    
    return { success: true, id, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Função auxiliar de log
function logAction(senderId, userId, userName, acaoTipo, descricao) {
  const id = Date.now().toString();
  db.run(
    `INSERT INTO logs_acoes (id, usuario_id, usuario_nome, acao_tipo, descricao)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, userName, acaoTipo, descricao]
  );
  saveDatabase();
}

// Converter resultado sql.js para array de objetos
function resultToArray(result) {
  if (!result || result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
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

app.whenReady().then(async () => {
  // Definir pasta raiz
  rootPath = getDefaultRootPath();
  
  // Verificar lock
  if (!checkDatabaseLock()) {
    return;
  }
  
  // Inicializar banco
  await initializeDatabase();
  
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

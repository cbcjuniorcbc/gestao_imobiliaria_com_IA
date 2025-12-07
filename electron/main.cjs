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
  const configPath = path.join(userDataPath, 'db-config.json');
  
  // Verificar se existe configuração personalizada
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.dbPath && fs.existsSync(config.dbPath)) {
        return config.dbPath;
      }
    } catch (error) {
      console.log('Erro ao ler configuração do banco:', error);
    }
  }
  
  // Usar pasta padrão se não houver configuração
  const defaultPath = path.join(userDataPath, 'GestaoImobiliariaData');
  
  // Criar pasta se não existir
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
  }
  
  return defaultPath;
}

// Salvar novo caminho do banco
function saveDbPath(newPath) {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'db-config.json');
  
  try {
    fs.writeFileSync(configPath, JSON.stringify({ dbPath: newPath }, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar configuração do banco:', error);
    return false;
  }
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
      db.exec('PRAGMA foreign_keys = ON;'); // Enable foreign key enforcement for existing DB
      
      // Executar migrations para bancos existentes
      runMigrations();
      db.exec('PRAGMA foreign_keys = ON;'); // Ensure foreign keys are ON after migrations
    } else {
      db = new SQL.Database();
      
      // Temporarily disable foreign key checks for schema creation
      db.exec('PRAGMA foreign_keys = OFF;'); 
      
      console.log('Banco vazio. Executando schema...');
      const schemaSQL = fs.readFileSync(
        path.join(__dirname, '../database/schema.sql'),
        'utf8'
      );
      
      // Split SQL into individual statements and execute one by one for better error reporting
      const statements = schemaSQL.split(';').filter(s => s.trim().length > 0);
      for (const stmt of statements) {
        try {
          db.run(stmt + ';'); // Add semicolon back for execution
          // console.log(`[Schema Init] Executed: ${stmt.substring(0, 100)}...`); // Too verbose, disable for now
        } catch (stmtError) {
          console.error(`[Schema Init] Error executing statement: ${stmt.substring(0, 100)}...`, stmtError);
          throw stmtError; // Re-throw to stop initialization
        }
      }
      
      // Re-enable foreign key checks after schema creation
      db.exec('PRAGMA foreign_keys = ON;'); 
      
      // Log foreign key status after enabling
      const fkStatus = db.exec('PRAGMA foreign_keys;');
      console.log('[DB Init] PRAGMA foreign_keys status after schema creation:', resultToArray(fkStatus));

      // Log foreign key info for relevant tables
      logForeignKeyInfo('imoveis');
      logForeignKeyInfo('inquilinos');
      logForeignKeyInfo('boletos');
      logForeignKeyInfo('imovel_anexos');
      
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

// Função para logar informações de chaves estrangeiras
function logForeignKeyInfo(tableName) {
  try {
    const fkInfo = db.exec(`PRAGMA foreign_key_list(${tableName});`);
    const fks = resultToArray(fkInfo);
    if (fks.length > 0) {
      console.log(`[DB Init] Foreign keys for table '${tableName}':`, JSON.stringify(fks, null, 2));
    } else {
      console.log(`[DB Init] No foreign keys found for table '${tableName}'.`);
    }
  } catch (error) {
    console.error(`[DB Init] Error logging foreign key info for table '${tableName}':`, error);
  }
}

// Executar migrations para atualizar banco existente
function runMigrations() {
  console.log('Verificando necessidade de migrations...');
  db.exec('PRAGMA foreign_keys = ON;'); // Ensure foreign keys are ON during migrations
  
  try {
    // Verificar e adicionar coluna 'codigo' na tabela imoveis
    const checkCodigoColumn = db.exec("PRAGMA table_info(imoveis)");
    const columns = resultToArray(checkCodigoColumn);
    const hasCodigoColumn = columns.some(col => col.name === 'codigo');
    
    if (!hasCodigoColumn) {
      console.log('Adicionando coluna codigo na tabela imoveis...');
      db.run('ALTER TABLE imoveis ADD COLUMN codigo TEXT');
      
      // Gerar códigos únicos para imóveis existentes
      const imoveis = db.exec('SELECT id FROM imoveis');
      if (imoveis.length > 0) {
        const imoveisArray = resultToArray(imoveis);
        imoveisArray.forEach(imovel => {
          const codigo = Math.floor(1000 + Math.random() * 9000).toString();
          db.run('UPDATE imoveis SET codigo = ? WHERE id = ?', [codigo, imovel.id]);
        });
      }
      
      saveDatabase();
      console.log('Coluna codigo adicionada com sucesso!');
    }
    
    // Verificar e adicionar coluna 'dia_vencimento' na tabela inquilinos
    const checkDiaVencimentoColumn = db.exec("PRAGMA table_info(inquilinos)");
    const inquilinosColumns = resultToArray(checkDiaVencimentoColumn);
    const hasDiaVencimentoColumn = inquilinosColumns.some(col => col.name === 'dia_vencimento');
    
    if (!hasDiaVencimentoColumn) {
      console.log('Adicionando coluna dia_vencimento na tabela inquilinos...');
      db.run('ALTER TABLE inquilinos ADD COLUMN dia_vencimento INTEGER DEFAULT 10');
      saveDatabase();
      console.log('Coluna dia_vencimento adicionada com sucesso!');
    }
    
    // Verificar e adicionar coluna 'status' na tabela inquilinos
    const hasStatusColumn = inquilinosColumns.some(col => col.name === 'status');
    
    if (!hasStatusColumn) {
      console.log('Adicionando coluna status na tabela inquilinos...');
      db.run("ALTER TABLE inquilinos ADD COLUMN status TEXT DEFAULT 'Ativo'");
      saveDatabase();
      console.log('Coluna status adicionada com sucesso!');
    }
    
    // Verificar e adicionar coluna 'data_geracao' na tabela boletos
    const checkDataGeracaoColumn = db.exec("PRAGMA table_info(boletos)");
    const boletosColumns = resultToArray(checkDataGeracaoColumn);
    const hasDataGeracaoColumn = boletosColumns.some(col => col.name === 'data_geracao');
    
    if (!hasDataGeracaoColumn) {
      console.log('Adicionando coluna data_geracao na tabela boletos...');
      db.run('ALTER TABLE boletos ADD COLUMN data_geracao TEXT');
      saveDatabase();
      console.log('Coluna data_geracao adicionada com sucesso!');
    }
    
    // Verificar e adicionar coluna 'fotos_paths' na tabela imoveis
    const hasFotosPathsColumn = columns.some(col => col.name === 'fotos_paths');
    
    if (!hasFotosPathsColumn) {
      console.log('Adicionando coluna fotos_paths na tabela imoveis...');
      db.run('ALTER TABLE imoveis ADD COLUMN fotos_paths TEXT');
      saveDatabase();
      console.log('Coluna fotos_paths adicionada com sucesso!');
    }

    // Verificar e criar tabela imovel_anexos se não existir
    const checkImovelAnexosTable = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='imovel_anexos'");
    if (checkImovelAnexosTable.length === 0) {
      console.log('Criando tabela imovel_anexos...');
      db.run(`
        CREATE TABLE imovel_anexos (
          id TEXT PRIMARY KEY,
          imovel_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_type TEXT NOT NULL CHECK(file_type IN ('foto', 'documento')),
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE CASCADE
        )
      `);
      db.run('CREATE INDEX idx_imovel_anexos_imovel_id ON imovel_anexos(imovel_id);');
      db.run('CREATE INDEX idx_imovel_anexos_file_type ON imovel_anexos(file_type);');
      saveDatabase();
      console.log('Tabela imovel_anexos criada com sucesso!');
    }
    
    console.log('Migrations concluídas!');
  } catch (error) {
    console.error('Erro ao executar migrations:', error);
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
    title: 'Gestão Imobiliária Beira Alta',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../build/icon.ico')
  });

  // Carregar app
  if (app.isPackaged) {
    // Produção - carregar do dist empacotado
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // Desenvolvimento - carregar do servidor Vite
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
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

// Usuários - Deletar
ipcMain.handle('usuarios:delete', async (event, { userId }) => {
  try {
    db.exec('PRAGMA foreign_keys = ON;'); // Ensure foreign keys are ON for this operation
    console.log(`[usuarios:delete] Attempting to delete user with ID: ${userId}`);

    // Verificar se o usuário existe
    const userCheck = db.exec('SELECT id, username FROM usuarios WHERE id = ?', [userId]);
    if (!userCheck || userCheck.length === 0 || userCheck[0].values.length === 0) {
      console.warn(`[usuarios:delete] User with ID ${userId} not found.`);
      return { success: false, message: 'Usuário não encontrado' };
    }
    
    const usuario = resultToArray(userCheck)[0];
    
    // Deletar usuário
    console.log(`[usuarios:delete] Deleting user ${usuario.username} (ID: ${userId}).`);
    db.run('DELETE FROM usuarios WHERE id = ?', [userId]);
    console.log(`[usuarios:delete] DELETE command executed for user ID: ${userId}.`);
    saveDatabase();
    console.log(`[usuarios:delete] Database saved after deleting user ID: ${userId}.`);
    
    console.log(`Usuário ${usuario.username} deletado com sucesso`);
    return { success: true };
  } catch (error) {
    console.error(`[usuarios:delete] Error deleting user with ID ${userId}:`, error);
    return { success: false, message: 'Erro ao deletar usuário' };
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

ipcMain.handle('proprietarios:getById', async (event, id) => {
  try {
    // Fetch proprietario details
    const propResult = db.exec('SELECT * FROM proprietarios WHERE id = ?', [id]);
    const proprietarios = resultToArray(propResult);
    const proprietario = proprietarios[0] || null;

    if (proprietario) {
      // Fetch associated documents
      const docResult = db.exec("SELECT * FROM documentos WHERE owner_type = 'proprietario' AND owner_id = ?", [id]);
      proprietario.documentos = resultToArray(docResult);
    }

    return { success: true, data: proprietario };
  } catch (error) {
    console.error(`[proprietarios:getById] Error fetching proprietario with ID ${id}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proprietarios:create', async (event, proprietario) => {
  try {
    db.exec('PRAGMA foreign_keys = ON;'); // Ensure foreign keys are ON for this operation
    const id = Date.now().toString();
    const pasta_path = `/Proprietario_${proprietario.nome.replace(/\s+/g, '_')}`;
    
    db.run(
      `INSERT INTO proprietarios (id, nome, cpf_cnpj, telefone, email, endereco, metodo_recebimento, observacoes, pasta_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, proprietario.nome, proprietario.cpf_cnpj, proprietario.telefone, 
       proprietario.email, proprietario.endereco, proprietario.metodo_recebimento || '', 
       proprietario.observacoes || '', pasta_path]
    );
    
    // Lidar com anexos
    if (proprietario.anexos && proprietario.anexos.length > 0) {
      for (const anexo of proprietario.anexos) {
        await handleDocumentUpload(event, { ownerType: 'proprietario', ownerId: id, file: anexo, userId: proprietario.user_id });
      }
    }

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

ipcMain.handle('proprietarios:update', async (event, proprietario) => {
  try {
    db.exec('PRAGMA foreign_keys = ON;'); // Ensure foreign keys are ON for this operation
    db.run(
      `UPDATE proprietarios SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, 
       endereco = ?, metodo_recebimento = ?, observacoes = ?
       WHERE id = ?`,
      [proprietario.nome, proprietario.cpf_cnpj, proprietario.telefone, proprietario.email,
       proprietario.endereco, proprietario.metodo_recebimento || '', proprietario.observacoes || '', proprietario.id]
    );
    
    // Lidar com anexos
    if (proprietario.anexos && proprietario.anexos.length > 0) {
      for (const anexo of proprietario.anexos) {
        await handleDocumentUpload(event, { ownerType: 'proprietario', ownerId: proprietario.id, file: anexo, userId: proprietario.user_id });
      }
    }

    saveDatabase();
    logAction(event.sender.id, proprietario.user_id, proprietario.user_name, 'Edição', `Editou proprietário: ${proprietario.nome}`);
    
    return { success: true, message: 'Proprietário atualizado com sucesso!' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proprietarios:delete', async (event, { id, userId, userName }) => {
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    console.log(`[proprietarios:delete] Attempting to delete proprietario with ID: ${id}`);

    // Get proprietario info before deleting
    const result = db.exec('SELECT nome, pasta_path FROM proprietarios WHERE id = ?', [id]);
    const props = resultToArray(result);
    
    if (props.length === 0) {
      console.warn(`[proprietarios:delete] Proprietario with ID ${id} not found.`);
      return { success: false, error: 'Proprietário não encontrado' };
    }
    
    const { nome, pasta_path } = props[0];

    // Delete from database (CASCADE should handle related entities)
    db.run('DELETE FROM proprietarios WHERE id = ?', [id]);
    saveDatabase();
    console.log(`[proprietarios:delete] Database record for ${nome} (ID: ${id}) deleted.`);

    // Delete proprietario's folder from filesystem
    if (pasta_path) {
      const fullPath = path.join(rootPath, pasta_path);
      if (fs.existsSync(fullPath)) {
        console.log(`[proprietarios:delete] Deleting folder: ${fullPath}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`[proprietarios:delete] Folder for ${nome} deleted successfully.`);
      }
    }

    logAction(event.sender.id, userId, userName, 'Exclusão', `Excluiu proprietário: ${nome}`);
    
    return { success: true };
  } catch (error) {
    console.error(`[proprietarios:delete] Error deleting proprietario with ID ${id}:`, error);
    return { success: false, error: error.message };
  }
});

// Imóveis
ipcMain.handle('imoveis:getAll', async () => {
  try {
    const result = db.exec('SELECT * FROM imoveis ORDER BY endereco');
    const imoveis = resultToArray(result);
    return { success: true, data: imoveis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:getByProprietario', async (event, proprietarioId) => {
  try {
    const result = db.exec('SELECT * FROM imoveis WHERE proprietario_id = ?', [proprietarioId]);
    const imoveis = resultToArray(result);
    return { success: true, data: imoveis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:getById', async (event, id) => {
  try {
    console.log(`[imoveis:getById] Attempting to fetch imovel with ID: ${id}`);
    const result = db.exec('SELECT * FROM imoveis WHERE id = ?', [id]);
    console.log(`[imoveis:getById] Raw DB exec result for ID ${id}:`, JSON.stringify(result));

    const imoveis = resultToArray(result);
    let imovel = imoveis[0] || null; 
    console.log(`[imoveis:getById] Processed imovel object for ID ${id}:`, JSON.stringify(imovel));

    if (imovel) {
      const anexosResult = db.exec('SELECT * FROM imovel_anexos WHERE imovel_id = ?', [id]);
      imovel.anexos = resultToArray(anexosResult);
      console.log(`[imoveis:getById] Imovel with anexos for ID ${id}:`, JSON.stringify(imovel));
    } else {
      console.log(`[imoveis:getById] No imovel found for ID: ${id}`);
    }
    
    return { success: true, data: imovel };
  } catch (error) {
    console.error(`[imoveis:getById] Error fetching imovel with ID ${id}:`, error); 
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:create', async (event, imovel) => {
  try {
    const id = Date.now().toString();
    
    // Gerar código único de 4 dígitos
    let codigo;
    let isUnique = false;
    while (!isUnique) {
      codigo = Math.floor(1000 + Math.random() * 9000).toString();
      const checkResult = db.exec('SELECT codigo FROM imoveis WHERE codigo = ?', [codigo]);
      const existing = resultToArray(checkResult);
      if (existing.length === 0) {
        isUnique = true;
      }
    }
    
    db.run(
      `INSERT INTO imoveis (id, proprietario_id, codigo, endereco, rua, numero, bairro, cidade, estado, cep, 
       tipo, valor, publicado_internet, situacao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, imovel.proprietario_id, codigo, imovel.endereco, imovel.rua || '', imovel.numero || '', 
       imovel.bairro || '', imovel.cidade || '', imovel.estado || '', imovel.cep || '',
       imovel.tipo, imovel.valor, imovel.publicado_internet || 0,
       imovel.situacao, imovel.observacoes || '']
    );
    
    // Lidar com anexos
    if (imovel.anexos && imovel.anexos.length > 0) {
      for (const anexo of imovel.anexos) {
        await handleDocumentUpload(event, { ownerType: 'imovel', ownerId: id, file: anexo, userId: imovel.user_id });
      }
    }
    
    saveDatabase();
    logAction(event.sender.id, imovel.user_id, imovel.user_name, 'Cadastro', `Cadastrou imóvel: ${imovel.endereco} (Código: ${codigo})`);
    
    return { success: true, id, codigo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:update', async (event, imovel) => {
  try {
    console.log(`[imoveis:update] Received imovel object for update:`, JSON.stringify(imovel));

    const updateParams = [
      imovel.endereco, imovel.rua || '', imovel.numero || '', imovel.bairro || '', 
      imovel.cidade || '', imovel.estado || '', imovel.cep || '', imovel.tipo, imovel.valor,
      imovel.publicado_internet ? 1 : 0, // Ensure it's 1 or 0
      imovel.situacao, imovel.observacoes || '', imovel.id
    ];

    const updateSql = `UPDATE imoveis SET endereco = ?, rua = ?, numero = ?, bairro = ?, cidade = ?, estado = ?, 
                       cep = ?, tipo = ?, valor = ?, publicado_internet = ?, situacao = ?, observacoes = ?
                       WHERE id = ?`;
    
    console.log(`[imoveis:update] Executing SQL: ${updateSql}`);
    console.log(`[imoveis:update] With parameters:`, JSON.stringify(updateParams));

    db.run(updateSql, updateParams);
    
    // Lidar com anexos
    if (imovel.anexos && imovel.anexos.length > 0) {
      for (const anexo of imovel.anexos) {
        await handleDocumentUpload(event, { ownerType: 'imovel', ownerId: imovel.id, file: anexo, userId: imovel.user_id });
      }
    }
    
    saveDatabase();
    console.log(`[imoveis:update] Database saved after update for ID: ${imovel.id}`);

    // Verify immediately after saving
    const verifyResult = db.exec('SELECT publicado_internet FROM imoveis WHERE id = ?', [imovel.id]);
    const verifiedPublicadoInternet = resultToArray(verifyResult)[0]?.publicado_internet;
    console.log(`[imoveis:update] Verified 'publicado_internet' in DB after save for ID ${imovel.id}:`, verifiedPublicadoInternet);

    logAction(event.sender.id, imovel.user_id, imovel.user_name, 'Edição', `Editou imóvel: ${imovel.endereco}`);
    
    return { success: true, message: 'Imóvel atualizado com sucesso!' };
  } catch (error) {
    console.error(`[imoveis:update] Error updating imovel with ID ${imovel.id}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:delete', async (event, { id, userId, userName }) => {
  try {
    const result = db.exec('SELECT endereco FROM imoveis WHERE id = ?', [id]);
    const imoveis = resultToArray(result);
    const endereco = imoveis[0]?.endereco;
    
    db.run('DELETE FROM imoveis WHERE id = ?', [id]);
    
    saveDatabase();
    logAction(event.sender.id, userId, userName, 'Exclusão', `Excluiu imóvel: ${endereco}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Inquilinos
ipcMain.handle('inquilinos:getAll', async () => {
  try {
    const result = db.exec('SELECT * FROM inquilinos ORDER BY nome');
    const inquilinos = resultToArray(result);
    return { success: true, data: inquilinos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inquilinos:getByImovel', async (event, imovelId) => {
  try {
    console.log(`[inquilinos:getByImovel] Received imovelId: ${imovelId}`);
    const result = db.exec('SELECT * FROM inquilinos WHERE imovel_id = ?', [imovelId]);
    const inquilinos = resultToArray(result);
    console.log(`[inquilinos:getByImovel] Returning ${inquilinos.length} inquilinos for imovelId ${imovelId}:`, JSON.stringify(inquilinos));
    return { success: true, data: inquilinos };
  } catch (error) {
    console.error(`[inquilinos:getByImovel] Error fetching inquilinos for imovelId ${imovelId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inquilinos:getById', async (event, id) => {
  try {
    const result = db.exec('SELECT * FROM inquilinos WHERE id = ?', [id]);
    const inquilinos = resultToArray(result);
    return { success: true, data: inquilinos[0] || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inquilinos:create', async (event, inquilino) => {
  try {
    const id = Date.now().toString();
    
    // Verificar se CPF já existe
    const cpfCheck = db.exec('SELECT id FROM inquilinos WHERE cpf_cnpj = ?', [inquilino.cpf_cnpj]);
    if (cpfCheck.length > 0 && cpfCheck[0].values.length > 0) {
      return { success: false, error: 'Já existe um cliente com esse CPF' };
    }
    
    // Obter pasta do proprietário
    const propResult = db.exec('SELECT proprietario_id FROM imoveis WHERE id = ?', [inquilino.imovel_id]);
    const imoveis = resultToArray(propResult);
    const proprietario_id = imoveis[0]?.proprietario_id;
    
    if (!proprietario_id) {
      return { success: false, error: 'Imóvel não encontrado ou sem proprietário vinculado' };
    }
    
    const propPathResult = db.exec('SELECT pasta_path FROM proprietarios WHERE id = ?', [proprietario_id]);
    const props = resultToArray(propPathResult);
    
    if (!props[0] || !props[0].pasta_path) {
      return { success: false, error: 'Proprietário não encontrado ou sem pasta configurada' };
    }
    
    const pasta_path = `${props[0].pasta_path}/Inquilino_${inquilino.nome.replace(/\s+/g, '_')}`;
    
    // Valor padrão para dia_vencimento se não fornecido
    const dia_vencimento = inquilino.dia_vencimento || 10;
    
    db.run(
      `INSERT INTO inquilinos (id, imovel_id, proprietario_id, nome, cpf, rg, cpf_cnpj, telefone, 
       email, renda_aproximada, data_inicio, data_termino, dia_vencimento, status, observacoes, pasta_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, inquilino.imovel_id, proprietario_id, inquilino.nome, inquilino.cpf || '', 
       inquilino.rg || '', inquilino.cpf_cnpj, inquilino.telefone, inquilino.email, 
       inquilino.renda_aproximada, inquilino.data_inicio, inquilino.data_termino || '', 
       dia_vencimento, 'Ativo', inquilino.observacoes || '', pasta_path]
    );
    
    saveDatabase();
    createFolder(pasta_path);
    
    // Atualizar situação do imóvel para Locado
    db.run("UPDATE imoveis SET situacao = 'Locado' WHERE id = ?", [inquilino.imovel_id]);
    saveDatabase();
    
    // Gerar boletos automáticos se houver data_termino
    if (inquilino.data_termino) {
      await gerarBoletosAutomaticos(id, inquilino, dia_vencimento, event.sender.id);
    }
    
    logAction(event.sender.id, inquilino.user_id, inquilino.user_name, 'Cadastro', `Cadastrou inquilino: ${inquilino.nome}`);
    
    return { success: true, id };
  } catch (error) {
    // Verificar se é erro de UNIQUE constraint
    if (error.message && error.message.includes('UNIQUE constraint failed: inquilinos.cpf_cnpj')) {
      return { success: false, error: 'Já existe um cliente com esse CPF' };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inquilinos:update', async (event, inquilinoData) => {
  console.log('[inquilinos:update] Recebido para atualização:', inquilinoData);
  const { id, userId, userName, ...fieldsToUpdate } = inquilinoData;

  if (!id) {
    return { success: false, error: 'ID do inquilino não fornecido.' };
  }

  try {
    const oldInquilinoResult = db.exec('SELECT * FROM inquilinos WHERE id = ?', [id]);
    const oldInquilino = resultToArray(oldInquilinoResult)[0];

    if (!oldInquilino) {
      return { success: false, error: 'Inquilino não encontrado.' };
    }

    const updates = [];
    const params = [];

    for (const key in fieldsToUpdate) {
      if (Object.prototype.hasOwnProperty.call(fieldsToUpdate, key)) {
        let newValue = fieldsToUpdate[key];
        let oldValue = oldInquilino[key];
        
        // Garantir que undefined nunca seja passado ao bind
        if (newValue === undefined) {
          continue;
        }
        
        if (key === 'renda_aproximada') {
          newValue = newValue ? parseFloat(newValue) : null;
          oldValue = oldValue ? parseFloat(oldValue) : null;
        }
        
        if (key === 'dia_vencimento') {
          newValue = newValue ? parseInt(newValue) : 10;
          oldValue = oldValue ? parseInt(oldValue) : 10;
        }

        if (newValue !== oldValue) {
          console.log(`[inquilinos:update] Campo '${key}' alterado de '${oldValue}' para '${newValue}'`);
          updates.push(`${key} = ?`);
          params.push(newValue);
        }
      }
    }

    if (updates.length === 0) {
      console.log('[inquilinos:update] Nenhum campo para atualizar.');
      return { success: true, message: 'Nenhuma alteração para salvar.' };
    }

    params.push(id);
    const sql = `UPDATE inquilinos SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('[inquilinos:update] Executando SQL:', sql);
    console.log('[inquilinos:update] com Parâmetros:', params);

    db.run(sql, params);

    saveDatabase();
    logAction(event.sender.id, userId, userName, 'Edição', `Editou inquilino: ${fieldsToUpdate.nome || oldInquilino.nome}`);

    return { success: true, message: 'Inquilino atualizado com sucesso!' };

  } catch (error) {
    console.error('[inquilinos:update] Erro ao atualizar inquilino:', error);
    let errorMessage = 'Ocorreu um erro desconhecido ao atualizar o inquilino.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    if (errorMessage.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'O CPF/CNPJ informado já está em uso por outro inquilino.' };
    }
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('inquilinos:delete', async (event, { id, userId, userName }) => {
  try {
    const result = db.exec('SELECT nome, imovel_id FROM inquilinos WHERE id = ?', [id]);
    const inquilinos = resultToArray(result);
    const nome = inquilinos[0]?.nome;
    const imovelId = inquilinos[0]?.imovel_id;
    
    // Deletar inquilino e seus boletos (CASCADE)
    db.run('DELETE FROM inquilinos WHERE id = ?', [id]);
    
    // Verificar se ainda há inquilinos ativos no imóvel
    const countResult = db.exec(
      "SELECT COUNT(*) as count FROM inquilinos WHERE imovel_id = ? AND status = 'Ativo'", 
      [imovelId]
    );
    const count = resultToArray(countResult)[0]?.count || 0;
    
    // Se não há mais inquilinos ativos, marcar imóvel como disponível
    if (count === 0) {
      db.run("UPDATE imoveis SET situacao = 'Disponível' WHERE id = ?", [imovelId]);
    }
    
    saveDatabase();
    logAction(event.sender.id, userId, userName, 'Exclusão', `Excluiu inquilino: ${nome}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:create', async (event, boleto) => {
  try {
    const id = Date.now().toString();
    
    // Verificar se é o primeiro boleto do inquilino
    const existingBoletosResult = db.exec('SELECT COUNT(*) as count FROM boletos WHERE inquilino_id = ?', [boleto.inquilino_id]);
    const existingCount = resultToArray(existingBoletosResult)[0]?.count || 0;
    
    db.run(
      `INSERT INTO boletos (id, inquilino_id, acao, valor_total, forma_pagamento, data_vencimento, 
       data_inicio, data_termino, situacao, data_geracao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, boleto.inquilino_id, boleto.acao, boleto.valor_total, boleto.forma_pagamento, 
       boleto.data_vencimento, boleto.data_inicio || '', boleto.data_termino || '', 
       boleto.situacao || 'À gerar', boleto.data_geracao || null, boleto.observacoes || '']
    );
    
    saveDatabase();
    logAction(event.sender.id, boleto.user_id, boleto.user_name, 'Boleto', `Registrou boleto: ${boleto.acao} - R$ ${boleto.valor_total}`);
    
    // Se é o primeiro boleto, gerar boletos automáticos para os próximos meses
    if (existingCount === 0) {
      const inquilinoResult = db.exec('SELECT * FROM inquilinos WHERE id = ?', [boleto.inquilino_id]);
      const inquilinos = resultToArray(inquilinoResult);
      const inquilino = inquilinos[0];
      
      if (inquilino && inquilino.data_termino) {
        await gerarBoletosAutomaticosFromPrimeiroBoleto(
          boleto.inquilino_id,
          boleto.data_vencimento,
          boleto.valor_total,
          boleto.acao,
          boleto.forma_pagamento,
          inquilino.data_termino
        );
      }
    }
    
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Função para gerar boletos automaticamente a partir do primeiro boleto
async function gerarBoletosAutomaticosFromPrimeiroBoleto(inquilinoId, primeiraDataVencimento, valorTotal, acao, formaPagamento, dataTermino) {
  try {
    const primeiroVencimento = new Date(primeiraDataVencimento);
    const diaVencimento = primeiroVencimento.getDate();
    const dataFim = new Date(dataTermino);
    
    // Começar do mês seguinte ao primeiro boleto
    let mesAtual = new Date(primeiroVencimento.getFullYear(), primeiroVencimento.getMonth() + 1, 1);
    
    while (mesAtual <= dataFim) {
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth();
      
      // Criar strings de data diretamente sem conversão de timezone
      const vencimento = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
      const inicioMes = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const fimMes = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      
      const boletoId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
      
      db.run(
        `INSERT INTO boletos (id, inquilino_id, acao, valor_total, forma_pagamento, data_vencimento, 
         data_inicio, data_termino, situacao, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [boletoId, inquilinoId, acao, valorTotal, formaPagamento, 
         vencimento, inicioMes, fimMes, 'À gerar', 
         `Boleto gerado automaticamente para ${mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`]
      );
      
      // Avançar para o próximo mês
      mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1);
    }
    
    saveDatabase();
  } catch (error) {
    console.error('Erro ao gerar boletos automáticos:', error);
  }
}

// Função para gerar boletos automaticamente quando cria inquilino
async function gerarBoletosAutomaticos(inquilinoId, inquilino, diaVencimento, senderId) {
  try {
    const dataInicio = new Date(inquilino.data_inicio);
    const dataTermino = new Date(inquilino.data_termino);
    const valor = inquilino.valor_aluguel || 0;
    
    // Obter o imóvel para pegar o valor
    const imovelResult = db.exec('SELECT valor FROM imoveis WHERE id = ?', [inquilino.imovel_id]);
    const imovelData = resultToArray(imovelResult);
    const valorAluguel = imovelData[0]?.valor || valor;
    
    // Gerar boleto para cada mês do contrato
    let mesAtual = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    
    while (mesAtual <= dataTermino) {
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth();
      
      // Criar strings de data diretamente sem conversão de timezone
      const vencimento = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
      const inicioMes = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const fimMes = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      
      const boletoId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
      
      db.run(
        `INSERT INTO boletos (id, inquilino_id, acao, valor_total, forma_pagamento, data_vencimento, 
         data_inicio, data_termino, situacao, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [boletoId, inquilinoId, 'Aluguel', valorAluguel, 'Boleto', 
         vencimento, inicioMes, fimMes, 'À gerar', 
         `Boleto gerado automaticamente para ${mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`]
      );
      
      // Avançar para o próximo mês
      mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1);
    }
    
    saveDatabase();
  } catch (error) {
    console.error('Erro ao gerar boletos automáticos:', error);
  }
}

// Marcar boleto como gerado
ipcMain.handle('boletos:marcarGerado', async (event, { boletoId, dataGeracao, userId, userName }) => {
  try {
    const result = db.exec('SELECT * FROM boletos WHERE id = ?', [boletoId]);
    const boletos = resultToArray(result);
    const boleto = boletos[0];
    
    db.run(
      `UPDATE boletos 
       SET situacao = 'Em aberto', data_geracao = ?
       WHERE id = ?`,
      [dataGeracao, boletoId]
    );
    
    saveDatabase();
    
    logAction(event.sender.id, userId, userName, 
              'Boleto Gerado', `Marcou boleto como gerado: R$ ${boleto.valor_total.toFixed(2)}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Boletos
ipcMain.handle('boletos:getAll', async () => {
  try {
    const result = db.exec('SELECT * FROM boletos ORDER BY data_vencimento DESC');
    const boletos = resultToArray(result);
    return { success: true, data: boletos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:getByInquilino', async (event, inquilinoId) => {
  try {
    console.log(`[boletos:getByInquilino] Received inquilinoId: ${inquilinoId}`);
    const result = db.exec('SELECT * FROM boletos WHERE inquilino_id = ? ORDER BY data_vencimento DESC', [inquilinoId]);
    const boletos = resultToArray(result);
    console.log(`[boletos:getByInquilino] Returning ${boletos.length} boletos for inquilinoId ${inquilinoId}:`, JSON.stringify(boletos));
    return { success: true, data: boletos };
  } catch (error) {
    console.error(`[boletos:getByInquilino] Error fetching boletos for inquilinoId ${inquilinoId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:marcarPago', async (event, { boletoId, dataPagamento, userId, userName }) => {
  try {
    const result = db.exec('SELECT * FROM boletos WHERE id = ?', [boletoId]);
    const boletos = resultToArray(result);
    const boleto = boletos[0];
    
    db.run(
      `UPDATE boletos 
       SET situacao = 'Pago', data_pagamento = ?
       WHERE id = ?`,
      [dataPagamento, boletoId]
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

// Criar todos os boletos do inquilino de uma vez
ipcMain.handle('boletos:criarBoletosInquilino', async (event, { inquilinoId, userId, userName }) => {
  try {
    // Buscar dados do inquilino
    const inquilinoResult = db.exec('SELECT * FROM inquilinos WHERE id = ?', [inquilinoId]);
    const inquilinos = resultToArray(inquilinoResult);
    const inquilino = inquilinos[0];
    
    if (!inquilino) {
      return { success: false, error: 'Inquilino não encontrado' };
    }
    
    if (!inquilino.data_inicio || !inquilino.data_termino || !inquilino.dia_vencimento) {
      return { success: false, error: 'Dados incompletos do inquilino. Verifique Data de Início, Data de Término e Dia de Vencimento.' };
    }
    
    // Buscar o imóvel para pegar o valor
    const imovelResult = db.exec('SELECT * FROM imoveis WHERE id = ?', [inquilino.imovel_id]);
    const imoveis = resultToArray(imovelResult);
    const imovel = imoveis[0];
    const valorAluguel = inquilino.valor_aluguel || imovel?.valor || 0;
    
    const dataInicio = new Date(inquilino.data_inicio);
    const dataTermino = new Date(inquilino.data_termino);
    const diaVencimento = parseInt(inquilino.dia_vencimento);
    
    // Gerar boleto para cada mês entre data_inicio e data_termino
    let mesAtual = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    const mesFim = new Date(dataTermino.getFullYear(), dataTermino.getMonth(), 1);
    
    let boletosGerados = 0;
    
    while (mesAtual <= mesFim) {
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth();
      
      // Criar strings de data diretamente sem conversão de timezone
      const vencimento = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
      const inicioMes = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const fimMes = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      
      const boletoId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
      
      db.run(
        `INSERT INTO boletos (id, inquilino_id, acao, valor_total, forma_pagamento, data_vencimento, 
         data_inicio, data_termino, situacao, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [boletoId, inquilinoId, 'Aluguel', valorAluguel, 'Boleto', 
         vencimento, inicioMes, fimMes, 'À gerar', 
         `Boleto para ${mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`]
      );
      
      boletosGerados++;
      
      // Avançar para o próximo mês
      mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1);
    }
    
    saveDatabase();
    logAction(event.sender.id, userId, userName, 'Boleto', `Gerou ${boletosGerados} boletos para inquilino ${inquilino.nome}`);
    
    return { success: true, boletosGerados };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:delete', async (event, { boletoId, userId, userName }) => {
  try {
    const result = db.exec('SELECT * FROM boletos WHERE id = ?', [boletoId]);
    const boletos = resultToArray(result);
    const boleto = boletos[0];
    
    if (!boleto) {
      return { success: false, error: 'Boleto não encontrado' };
    }
    
    db.run('DELETE FROM boletos WHERE id = ?', [boletoId]);
    saveDatabase();
    
    logAction(event.sender.id, userId, userName, 
              'Exclusão', `Excluiu boleto: ${boleto.acao} - R$ ${boleto.valor_total.toFixed(2)}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Documentos
ipcMain.handle('documentos:getByOwner', async (event, { ownerType, ownerId }) => {
  try {
    const result = db.exec('SELECT * FROM documentos WHERE owner_type = ? AND owner_id = ? ORDER BY uploaded_at DESC', [ownerType, ownerId]);
    const documentos = resultToArray(result);
    return { success: true, data: documentos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Download de documento
ipcMain.handle('documentos:download', async (event, { documentoId }) => {
  try {
    const result = db.exec('SELECT * FROM documentos WHERE id = ?', [documentoId]);
    const docs = resultToArray(result);
    
    if (docs.length === 0) {
      return { success: false, error: 'Documento não encontrado' };
    }
    
    const doc = docs[0];
    
    if (!doc.path) {
      return { success: false, error: 'Caminho do arquivo não encontrado' };
    }
    
    const filePath = path.join(rootPath, doc.path);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo não encontrado no sistema: ' + filePath };
    }
    
    // Ler arquivo
    const fileData = fs.readFileSync(filePath);
    
    // Retornar dados do arquivo
    return { 
      success: true, 
      data: {
        filename: doc.filename,
        buffer: Array.from(fileData)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Deletar documento
ipcMain.handle('documentos:delete', async (event, { documentoId }) => {
  try {
    // Buscar documento para pegar o caminho
    const result = db.exec('SELECT * FROM documentos WHERE id = ?', [documentoId]);
    const docs = resultToArray(result);

    if (docs.length === 0) {
      return { success: false, error: 'Documento não encontrado no banco de dados.' };
    }

    const doc = docs[0];
    const filePath = path.join(rootPath, doc.path);

    // Deletar arquivo físico, se existir
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Deletar registro do banco
    db.run('DELETE FROM documentos WHERE id = ?', [documentoId]);
    saveDatabase();

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    return { success: false, error: error.message };
  }
});

// Logs
ipcMain.handle('logs:getAll', async () => {
  try {
    const result = db.exec(
      `SELECT id, usuario_id as user_id, usuario_nome as user_name, 
              acao_tipo as acao, descricao, timestamp 
       FROM logs_acoes ORDER BY timestamp DESC LIMIT 1000`
    );
    const logs = resultToArray(result);
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Logs com filtro de data
ipcMain.handle('logs:getByDateRange', async (event, { startDate, endDate }) => {
  try {
    const result = db.exec(
      `SELECT id, usuario_id as user_id, usuario_nome as user_name, 
              acao_tipo as acao, descricao, timestamp 
       FROM logs_acoes 
       WHERE date(timestamp) >= date(?) AND date(timestamp) <= date(?)
       ORDER BY timestamp DESC`,
      [startDate, endDate]
    );
    const logs = resultToArray(result);
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Limpar todos os logs
ipcMain.handle('logs:clear', async (event) => {
  try {
    db.run('DELETE FROM logs_acoes');
    saveDatabase();
    console.log('[logs:clear] Todos os logs foram deletados com sucesso');
    return { success: true, message: 'Histórico de logs deletado com sucesso!' };
  } catch (error) {
    console.error('[logs:clear] Erro ao deletar logs:', error);
    return { success: false, error: error.message };
  }
});

// Verificar status do banco (se está em modo somente leitura)
ipcMain.handle('database:getStatus', async () => {
  try {
    const isReadOnly = fs.existsSync(lockFilePath);
    let lockInfo = null;
    
    if (isReadOnly) {
      const lockContent = fs.readFileSync(lockFilePath, 'utf8');
      const lines = lockContent.split('\n');
      lockInfo = {
        username: lines[0],
        pid: lines[1],
        timestamp: lines[2]
      };
    }
    
    return { 
      success: true, 
      data: { 
        isReadOnly,
        lockInfo
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Contratos Avulsos
ipcMain.handle('contratos_avulsos:getAll', async () => {
  try {
    const result = db.exec('SELECT * FROM contratos_avulsos ORDER BY data DESC');
    const contratos = resultToArray(result);
    return { success: true, data: contratos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('contratos_avulsos:create', async (event, { data, descricao, valor, userId, userName }) => {
  try {
    const id = Date.now().toString();
    
    db.run(
      `INSERT INTO contratos_avulsos (id, data, descricao, valor, registrado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data, descricao, valor, userName]
    );
    
    saveDatabase();
    
    // Log da ação
    logAction(event.sender.id, userId, userName, 
              'Contrato Avulso', `Registrou contrato avulso: ${descricao} - R$ ${valor.toFixed(2)}`);
    
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('contratos_avulsos:delete', async (event, { contratoId, userId, userName }) => {
  try {
    const result = db.exec('SELECT * FROM contratos_avulsos WHERE id = ?', [contratoId]);
    const contratos = resultToArray(result);
    const contrato = contratos[0];
    
    if (!contrato) {
      return { success: false, error: 'Contrato avulso não encontrado' };
    }
    
    db.run('DELETE FROM contratos_avulsos WHERE id = ?', [contratoId]);
    saveDatabase();
    
    logAction(event.sender.id, userId, userName, 
              'Exclusão', `Excluiu contrato avulso: ${contrato.descricao} - R$ ${contrato.valor.toFixed(2)}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Dashboard Stats
ipcMain.handle('dashboard:getStats', async () => {
  try {
    const stats = {};
    
    // Total de imóveis
    let result = db.exec('SELECT COUNT(*) as total FROM imoveis');
    stats.total_imoveis = resultToArray(result)[0]?.total || 0;
    
    // Imóveis locados
    result = db.exec("SELECT COUNT(*) as total FROM imoveis WHERE situacao = 'Locado'");
    stats.imoveis_locados = resultToArray(result)[0]?.total || 0;
    
    // Boletos em aberto
    result = db.exec("SELECT COUNT(*) as total FROM boletos WHERE situacao = 'Em aberto'");
    stats.boletos_em_aberto = resultToArray(result)[0]?.total || 0;
    
    // Boletos atrasados
    result = db.exec("SELECT COUNT(*) as total FROM boletos WHERE situacao = 'Em aberto' AND date(data_vencimento) < date('now')");
    stats.boletos_atrasados = resultToArray(result)[0]?.total || 0;
    
    // Valor total em aberto
    result = db.exec("SELECT COALESCE(SUM(valor_total), 0) as total FROM boletos WHERE situacao = 'Em aberto'");
    stats.valor_total_em_aberto = resultToArray(result)[0]?.total || 0;
    
    // Contratos avulsos hoje
    result = db.exec("SELECT COUNT(*) as total FROM contratos_avulsos WHERE date(data) = date('now')");
    stats.contratos_avulsos_hoje = resultToArray(result)[0]?.total || 0;
    
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Função para lidar com o upload de documentos
async function handleDocumentUpload(event, { ownerType, ownerId, file, userId }) {
  try {
    let folderPath;
    let relativePath;

    if (ownerType === 'proprietario') {
      const result = db.exec('SELECT pasta_path FROM proprietarios WHERE id = ?', [ownerId]);
      const props = resultToArray(result);
      if (!props[0] || !props[0].pasta_path) throw new Error('Pasta do proprietário não encontrada.');
      relativePath = props[0].pasta_path;
    } else if (ownerType === 'inquilino') {
      const result = db.exec('SELECT pasta_path FROM inquilinos WHERE id = ?', [ownerId]);
      const inqs = resultToArray(result);
      if (!inqs[0] || !inqs[0].pasta_path) throw new Error('Pasta do inquilino não encontrada.');
      relativePath = inqs[0].pasta_path;
    } else if (ownerType === 'imovel') {
      // Criar um caminho de pasta para o imóvel
      relativePath = path.join('Imoveis', `Imovel_${ownerId}`);
    } else {
      throw new Error('Tipo de proprietário de documento inválido.');
    }
    
    folderPath = path.join(rootPath, relativePath);

    // Criar pasta se não existir
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // Salvar arquivo
    const finalFilePath = path.join(folderPath, file.name);
    const finalRelativePath = path.join(relativePath, file.name);
    fs.writeFileSync(finalFilePath, Buffer.from(file.data));
    
    // Registrar no banco
    const id = Date.now().toString();

    if (ownerType === 'imovel') {
      db.run(
        `INSERT INTO imovel_anexos (id, imovel_id, file_name, file_path, file_type)
         VALUES (?, ?, ?, ?, ?)`,
        [id, ownerId, file.name, finalRelativePath, file.type]
      );
    } else {
      db.run(
        `INSERT INTO documentos (id, owner_type, owner_id, filename, path, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ownerType, ownerId, file.name, finalRelativePath, userId]
      );
    }
    
    saveDatabase();
    
    return { success: true, id, path: finalRelativePath };
  } catch (error) {
    console.error('Erro no upload de documento:', error);
    return { success: false, error: error.message };
  }
}

// Upload de arquivo
ipcMain.handle('documentos:upload', async (event, data) => {
  return handleDocumentUpload(event, data);
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

// Obter caminho atual do banco de dados
ipcMain.handle('config:getDbPath', async () => {
  return rootPath;
});

// Selecionar nova pasta para o banco de dados
ipcMain.handle('config:selectDbFolder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Selecionar Pasta para o Banco de Dados',
      message: 'Escolha onde os dados serão salvos (pode ser uma pasta do Google Drive)'
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Seleção cancelada' };
    }
    
    const selectedPath = result.filePaths[0];
    
    // Criar subpasta GestaoImobiliariaData dentro da pasta selecionada
    const newDbPath = path.join(selectedPath, 'GestaoImobiliariaData');
    
    // Criar pasta se não existir
    if (!fs.existsSync(newDbPath)) {
      fs.mkdirSync(newDbPath, { recursive: true });
    }
    
    // Salvar nova configuração
    if (saveDbPath(newDbPath)) {
      // Reiniciar aplicação
      app.relaunch();
      app.quit();
      return { success: true, path: newDbPath };
    } else {
      return { success: false, error: 'Erro ao salvar configuração' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reiniciar aplicação
ipcMain.handle('config:restartApp', async () => {
  app.relaunch();
  app.quit();
  return { success: true };
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

// Handler para obter anexos de um imóvel
ipcMain.handle('imoveis:getAnexos', async (event, imovelId) => {
  try {
    const result = db.exec('SELECT * FROM imovel_anexos WHERE imovel_id = ?', [imovelId]);
    const anexos = resultToArray(result);
    return { success: true, data: anexos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para deletar um anexo de imóvel
ipcMain.handle('imoveis:deleteAnexo', async (event, { anexoId }) => {
  try {
    // Buscar anexo para pegar o caminho
    const result = db.exec('SELECT * FROM imovel_anexos WHERE id = ?', [anexoId]);
    const anexos = resultToArray(result);

    if (anexos.length === 0) {
      return { success: false, error: 'Anexo não encontrado no banco de dados.' };
    }

    const anexo = anexos[0];
    const filePath = path.join(rootPath, anexo.file_path);

    // Deletar arquivo físico, se existir
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Deletar registro do banco
    db.run('DELETE FROM imovel_anexos WHERE id = ?', [anexoId]);
    saveDatabase();

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar anexo:', error);
    return { success: false, error: error.message };
  }
});

// Handler para download de anexo de imóvel
ipcMain.handle('imoveis:downloadAnexo', async (event, anexoId) => {
  try {
    const result = db.exec('SELECT * FROM imovel_anexos WHERE id = ?', [anexoId]);
    const anexos = resultToArray(result);
    
    if (anexos.length === 0) {
      return { success: false, error: 'Anexo não encontrado' };
    }
    
    const anexo = anexos[0];
    
    if (!anexo.file_path) {
      return { success: false, error: 'Caminho do arquivo não encontrado para o anexo' };
    }
    
    const filePath = path.join(rootPath, anexo.file_path);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo não encontrado no sistema: ' + filePath };
    }
    
    // Ler arquivo
    const fileData = fs.readFileSync(filePath);
    
    // Retornar dados do arquivo
    return { 
      success: true, 
      data: {
        filename: anexo.file_name,
        buffer: Array.from(fileData)
      }
    };
  } catch (error) {
    console.error('Erro ao baixar anexo do imóvel:', error);
    return { success: false, error: error.message };
  }
});

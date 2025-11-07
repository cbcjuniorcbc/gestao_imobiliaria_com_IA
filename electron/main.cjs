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
      `INSERT INTO proprietarios (id, nome, cpf_cnpj, telefone, email, endereco, metodo_recebimento, observacoes, pasta_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, proprietario.nome, proprietario.cpf_cnpj, proprietario.telefone, 
       proprietario.email, proprietario.endereco, proprietario.metodo_recebimento || '', 
       proprietario.observacoes || '', pasta_path]
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

ipcMain.handle('proprietarios:update', async (event, proprietario) => {
  try {
    db.run(
      `UPDATE proprietarios SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, 
       endereco = ?, metodo_recebimento = ?, observacoes = ?
       WHERE id = ?`,
      [proprietario.nome, proprietario.cpf_cnpj, proprietario.telefone, proprietario.email,
       proprietario.endereco, proprietario.metodo_recebimento || '', proprietario.observacoes || '', proprietario.id]
    );
    
    saveDatabase();
    logAction(event.sender.id, proprietario.userId, proprietario.userName, 'Edição', `Editou proprietário: ${proprietario.nome}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proprietarios:delete', async (event, { id, userId, userName }) => {
  try {
    const result = db.exec('SELECT nome FROM proprietarios WHERE id = ?', [id]);
    const props = resultToArray(result);
    const nome = props[0]?.nome;
    
    db.run('DELETE FROM proprietarios WHERE id = ?', [id]);
    
    saveDatabase();
    logAction(event.sender.id, userId, userName, 'Exclusão', `Excluiu proprietário: ${nome}`);
    
    return { success: true };
  } catch (error) {
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
    const result = db.exec('SELECT * FROM imoveis WHERE id = ?', [id]);
    const imoveis = resultToArray(result);
    return { success: true, data: imoveis[0] || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:create', async (event, imovel) => {
  try {
    const id = Date.now().toString();
    
    db.run(
      `INSERT INTO imoveis (id, proprietario_id, endereco, rua, numero, bairro, cidade, estado, cep, 
       tipo, valor, publicado_internet, situacao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, imovel.proprietario_id, imovel.endereco, imovel.rua || '', imovel.numero || '', 
       imovel.bairro || '', imovel.cidade || '', imovel.estado || '', imovel.cep || '',
       imovel.tipo, imovel.valor, imovel.publicado_internet || 0,
       imovel.situacao, imovel.observacoes || '']
    );
    
    saveDatabase();
    logAction(event.sender.id, imovel.user_id, imovel.user_name, 'Cadastro', `Cadastrou imóvel: ${imovel.endereco}`);
    
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imoveis:update', async (event, imovel) => {
  try {
    db.run(
      `UPDATE imoveis SET endereco = ?, rua = ?, numero = ?, bairro = ?, cidade = ?, estado = ?, 
       cep = ?, tipo = ?, valor = ?, publicado_internet = ?, situacao = ?, observacoes = ?
       WHERE id = ?`,
      [imovel.endereco, imovel.rua || '', imovel.numero || '', imovel.bairro || '', 
       imovel.cidade || '', imovel.estado || '', imovel.cep || '', imovel.tipo, imovel.valor,
       imovel.publicado_internet || 0, imovel.situacao, imovel.observacoes || '', imovel.id]
    );
    
    saveDatabase();
    logAction(event.sender.id, imovel.user_id, imovel.user_name, 'Edição', `Editou imóvel: ${imovel.endereco}`);
    
    return { success: true };
  } catch (error) {
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
    const result = db.exec('SELECT * FROM inquilinos WHERE imovel_id = ?', [imovelId]);
    const inquilinos = resultToArray(result);
    return { success: true, data: inquilinos };
  } catch (error) {
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
    
    // Obter pasta do proprietário
    const propResult = db.exec('SELECT proprietario_id FROM imoveis WHERE id = ?', [inquilino.imovel_id]);
    const imoveis = resultToArray(propResult);
    const proprietario_id = imoveis[0]?.proprietario_id;
    
    const propPathResult = db.exec('SELECT pasta_path FROM proprietarios WHERE id = ?', [proprietario_id]);
    const props = resultToArray(propPathResult);
    const pasta_path = `${props[0].pasta_path}/Inquilino_${inquilino.nome.replace(/\s+/g, '_')}`;
    
    db.run(
      `INSERT INTO inquilinos (id, imovel_id, proprietario_id, nome, cpf, rg, cpf_cnpj, telefone, 
       email, renda_aproximada, data_inicio, data_termino, observacoes, pasta_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, inquilino.imovel_id, proprietario_id, inquilino.nome, inquilino.cpf || '', 
       inquilino.rg || '', inquilino.cpf_cnpj, inquilino.telefone, inquilino.email, 
       inquilino.renda_aproximada, inquilino.data_inicio, inquilino.data_termino || '', 
       inquilino.observacoes || '', pasta_path]
    );
    
    saveDatabase();
    createFolder(pasta_path);
    
    // Atualizar situação do imóvel para Locado
    db.run("UPDATE imoveis SET situacao = 'Locado' WHERE id = ?", [inquilino.imovel_id]);
    saveDatabase();
    
    logAction(event.sender.id, inquilino.user_id, inquilino.user_name, 'Cadastro', `Cadastrou inquilino: ${inquilino.nome}`);
    
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inquilinos:update', async (event, inquilino) => {
  try {
    db.run(
      `UPDATE inquilinos SET nome = ?, cpf = ?, rg = ?, cpf_cnpj = ?, telefone = ?, email = ?,
       renda_aproximada = ?, data_inicio = ?, data_termino = ?, observacoes = ?
       WHERE id = ?`,
      [inquilino.nome, inquilino.cpf || '', inquilino.rg || '', inquilino.cpf_cnpj, 
       inquilino.telefone, inquilino.email, inquilino.renda_aproximada, inquilino.data_inicio,
       inquilino.data_termino || null, inquilino.observacoes || '', inquilino.id]
    );
    
    saveDatabase();
    logAction(event.sender.id, inquilino.userId, inquilino.userName, 'Edição', `Editou inquilino: ${inquilino.nome}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inquilinos:delete', async (event, { inquilinoId, userId, userName }) => {
  try {
    const result = db.exec('SELECT nome, imovel_id FROM inquilinos WHERE id = ?', [inquilinoId]);
    const inquilinos = resultToArray(result);
    const nome = inquilinos[0]?.nome;
    const imovelId = inquilinos[0]?.imovel_id;
    
    db.run('DELETE FROM inquilinos WHERE id = ?', [inquilinoId]);
    
    // Verificar se ainda há inquilinos no imóvel
    const countResult = db.exec('SELECT COUNT(*) as count FROM inquilinos WHERE imovel_id = ?', [imovelId]);
    const count = resultToArray(countResult)[0]?.count || 0;
    
    // Se não há mais inquilinos, marcar imóvel como disponível
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

ipcMain.handle('proprietarios:delete', async (event, { id, userId, userName }) => {
  try {
    const result = db.exec('SELECT * FROM proprietarios WHERE id = ?', [id]);
    const props = resultToArray(result);
    
    if (props.length === 0) {
      return { success: false, error: 'Proprietário não encontrado' };
    }
    
    const nome = props[0].nome;
    
    db.run('DELETE FROM proprietarios WHERE id = ?', [id]);
    
    saveDatabase();
    logAction(event.sender.id, userId, userName, 'Exclusão', `Excluiu proprietário: ${nome}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('boletos:create', async (event, boleto) => {
  try {
    const id = Date.now().toString();
    
    db.run(
      `INSERT INTO boletos (id, inquilino_id, acao, valor_total, forma_pagamento, data_vencimento, 
       data_inicio, data_termino, situacao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, boleto.inquilino_id, boleto.acao, boleto.valor_total, boleto.forma_pagamento, 
       boleto.data_vencimento, boleto.data_inicio || '', boleto.data_termino || '', 
       'Em aberto', boleto.observacoes || '']
    );
    
    saveDatabase();
    logAction(event.sender.id, boleto.user_id, boleto.user_name, 'Boleto', `Registrou boleto: ${boleto.acao} - R$ ${boleto.valor_total}`);
    
    return { success: true, id };
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
    
    if (!doc.file_path) {
      return { success: false, error: 'Caminho do arquivo não encontrado' };
    }
    
    const filePath = path.join(rootPath, doc.file_path);
    
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

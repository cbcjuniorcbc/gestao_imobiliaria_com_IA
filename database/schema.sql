-- ============================================
-- SCHEMA SQLite - Sistema de Gestão Imobiliária
-- ============================================

-- Habilitar WAL mode para melhor performance
PRAGMA journal_mode=WAL;

-- ============================================
-- Tabela: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('recepcao', 'admin')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_role ON usuarios(role);

-- ============================================
-- Tabela: proprietarios
-- ============================================
CREATE TABLE IF NOT EXISTS proprietarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT UNIQUE NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  endereco TEXT NOT NULL,
  metodo_recebimento TEXT,
  observacoes TEXT,
  pasta_path TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_proprietarios_nome ON proprietarios(nome);
CREATE INDEX idx_proprietarios_cpf_cnpj ON proprietarios(cpf_cnpj);

-- ============================================
-- Tabela: imoveis
-- ============================================
CREATE TABLE IF NOT EXISTS imoveis (
  id TEXT PRIMARY KEY,
  proprietario_id TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  endereco TEXT NOT NULL,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tipo TEXT NOT NULL CHECK(tipo IN ('Venda', 'Locação', 'Ponto Comercial')),
  valor REAL NOT NULL,
  publicado_internet INTEGER DEFAULT 0,
  situacao TEXT NOT NULL CHECK(situacao IN ('Disponível', 'Locado', 'Vendido', 'Manutenção')),
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (proprietario_id) REFERENCES proprietarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_imoveis_proprietario ON imoveis(proprietario_id);
CREATE INDEX idx_imoveis_codigo ON imoveis(codigo);
CREATE INDEX idx_imoveis_situacao ON imoveis(situacao);
CREATE INDEX idx_imoveis_tipo ON imoveis(tipo);
CREATE INDEX idx_imoveis_bairro ON imoveis(bairro);
CREATE INDEX idx_imoveis_cidade ON imoveis(cidade);
CREATE INDEX idx_imoveis_estado ON imoveis(estado);

-- ============================================
-- Tabela: imovel_anexos
-- ============================================
CREATE TABLE IF NOT EXISTS imovel_anexos (
  id TEXT PRIMARY KEY,
  imovel_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('foto', 'documento')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE CASCADE
);

CREATE INDEX idx_imovel_anexos_imovel_id ON imovel_anexos(imovel_id);
CREATE INDEX idx_imovel_anexos_file_type ON imovel_anexos(file_type);

-- ============================================
-- Tabela: inquilinos
-- ============================================
CREATE TABLE IF NOT EXISTS inquilinos (
  id TEXT PRIMARY KEY,
  imovel_id TEXT NOT NULL,
  proprietario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  cpf_cnpj TEXT UNIQUE NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  renda_aproximada REAL,
  data_inicio TEXT NOT NULL,
  data_termino TEXT,
  dia_vencimento INTEGER DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK(status IN ('Ativo', 'Inativo')),
  observacoes TEXT,
  pasta_path TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE CASCADE,
  FOREIGN KEY (proprietario_id) REFERENCES proprietarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_inquilinos_imovel ON inquilinos(imovel_id);
CREATE INDEX idx_inquilinos_proprietario ON inquilinos(proprietario_id);
CREATE INDEX idx_inquilinos_nome ON inquilinos(nome);

-- ============================================
-- Tabela: documentos
-- ============================================
CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('proprietario', 'inquilino', 'imovel')),
  owner_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_documentos_owner ON documentos(owner_type, owner_id);

-- ============================================
-- Tabela: boletos
-- ============================================
CREATE TABLE IF NOT EXISTS boletos (
  id TEXT PRIMARY KEY,
  inquilino_id TEXT NOT NULL,
  acao TEXT NOT NULL,
  valor_total REAL NOT NULL,
  forma_pagamento TEXT NOT NULL,
  data_vencimento TEXT NOT NULL,
  data_inicio TEXT,
  data_termino TEXT,
  situacao TEXT NOT NULL CHECK(situacao IN ('À gerar', 'Em aberto', 'Pago')),
  data_geracao TEXT,
  data_pagamento TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (inquilino_id) REFERENCES inquilinos(id) ON DELETE CASCADE
);

CREATE INDEX idx_boletos_inquilino ON boletos(inquilino_id);
CREATE INDEX idx_boletos_situacao ON boletos(situacao);
CREATE INDEX idx_boletos_vencimento ON boletos(data_vencimento);

-- ============================================
-- Tabela: logs_acoes
-- ============================================
CREATE TABLE IF NOT EXISTS logs_acoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  acao_tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_usuario ON logs_acoes(usuario_id);
CREATE INDEX idx_logs_timestamp ON logs_acoes(timestamp);
CREATE INDEX idx_logs_tipo ON logs_acoes(acao_tipo);

-- ============================================
-- Tabela: contratos_avulsos
-- ============================================
CREATE TABLE IF NOT EXISTS contratos_avulsos (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  registrado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_contratos_data ON contratos_avulsos(data);
CREATE INDEX idx_contratos_registrado_por ON contratos_avulsos(registrado_por);

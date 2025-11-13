-- ============================================
-- SEED DATA - Sistema de Gestão Imobiliária
-- Dados de exemplo para testes
-- ============================================

-- Limpar dados existentes (cuidado em produção!)
DELETE FROM contratos_avulsos;
DELETE FROM logs_acoes;
DELETE FROM boletos;
DELETE FROM documentos;
DELETE FROM inquilinos;
DELETE FROM imoveis;
DELETE FROM proprietarios;
DELETE FROM usuarios;

-- ============================================
-- Usuário admin inicial (sem senha)
-- Configure a senha após o primeiro login
-- ============================================
INSERT INTO usuarios (id, username, password_hash, role) VALUES
('1', 'admin', '', 'admin');

-- ============================================
-- Proprietários
-- ============================================
INSERT INTO proprietarios (id, nome, cpf_cnpj, telefone, email, endereco, metodo_recebimento, observacoes, pasta_path) VALUES
('1', 'João Silva', '123.456.789-00', '(11) 98765-4321', 'joao.silva@email.com', 'Rua das Flores, 123 - São Paulo/SP', 'PIX', 'Proprietário desde 2020', '/Proprietario_Joao_Silva'),
('2', 'Maria Santos', '987.654.321-00', '(11) 91234-5678', 'maria.santos@email.com', 'Av. Paulista, 456 - São Paulo/SP', 'Transferência Bancária', '', '/Proprietario_Maria_Santos'),
('3', 'Pedro Costa', '456.789.123-00', '(11) 99876-1234', 'pedro.costa@email.com', 'Rua Vergueiro, 789 - São Paulo/SP', 'Boleto', 'Proprietário VIP', '/Proprietario_Pedro_Costa');

-- ============================================
-- Imóveis
-- ============================================
INSERT INTO imoveis (id, proprietario_id, codigo, endereco, rua, numero, bairro, cidade, estado, cep, tipo, valor, publicado_internet, situacao, observacoes) VALUES
('1', '1', '1001', 'Rua Aurora, 789 - Apt 45 - São Paulo/SP', 'Rua Aurora', '789', 'Centro', 'São Paulo', 'SP', '01000-000', 'Locação', 2500.00, 0, 'Locado', '2 quartos, 1 vaga'),
('2', '1', '1002', 'Rua Consolação, 321 - São Paulo/SP', 'Rua Consolação', '321', 'Consolação', 'São Paulo', 'SP', '01300-000', 'Locação', 3800.00, 0, 'Locado', '3 quartos, 2 vagas'),
('3', '2', '1003', 'Av. Brasil, 1500 - Sala 12 - São Paulo/SP', 'Av. Brasil', '1500', 'Centro', 'São Paulo', 'SP', '01430-000', 'Ponto Comercial', 4200.00, 0, 'Disponível', 'Sala comercial 60m²'),
('4', '3', '1004', 'Rua Oscar Freire, 500 - Apt 101 - São Paulo/SP', 'Rua Oscar Freire', '500', 'Jardins', 'São Paulo', 'SP', '01422-000', 'Locação', 5500.00, 0, 'Locado', 'Alto padrão, 3 quartos');

-- ============================================
-- Inquilinos
-- ============================================
INSERT INTO inquilinos (id, imovel_id, proprietario_id, nome, cpf, rg, cpf_cnpj, telefone, email, renda_aproximada, data_inicio, data_termino, observacoes, pasta_path) VALUES
('1', '1', '1', 'Carlos Oliveira', '456.789.123-00', '12.345.678-9', '456.789.123-00', '(11) 99876-5432', 'carlos.oliveira@email.com', 5000.00, '2024-03-01', '2025-03-01', 'Contrato de 12 meses', '/Proprietario_Joao_Silva/Inquilino_Carlos_Oliveira'),
('2', '2', '1', 'Ana Costa', '789.123.456-00', '98.765.432-1', '789.123.456-00', '(11) 98765-1234', 'ana.costa@email.com', 7500.00, '2024-02-15', NULL, '', '/Proprietario_Joao_Silva/Inquilino_Ana_Costa'),
('3', '4', '3', 'Roberto Lima', '321.654.987-00', '45.678.912-3', '321.654.987-00', '(11) 97654-3210', 'roberto.lima@email.com', 12000.00, '2024-01-10', '2025-01-10', 'Pagamento pontual', '/Proprietario_Pedro_Costa/Inquilino_Roberto_Lima');

-- ============================================
-- Boletos
-- ============================================
INSERT INTO boletos (id, inquilino_id, acao, valor_total, forma_pagamento, data_vencimento, data_inicio, data_termino, situacao, data_pagamento, observacoes) VALUES
-- Boletos pagos
('1', '1', 'Aluguel', 2500.00, 'Boleto', '2024-10-10', '2024-10-01', '2024-10-31', 'Pago', '2024-10-08', ''),
('2', '1', 'Aluguel', 2500.00, 'Boleto', '2024-11-10', '2024-11-01', '2024-11-30', 'Pago', '2024-11-09', ''),
('3', '2', 'Aluguel', 3800.00, 'PIX', '2024-10-05', '2024-10-01', '2024-10-31', 'Pago', '2024-10-04', ''),
-- Boleto em aberto (vencimento próximo)
('4', '1', 'Aluguel', 2500.00, 'Boleto', '2024-12-10', '2024-12-01', '2024-12-31', 'Em aberto', NULL, ''),
('5', '3', 'Aluguel', 5500.00, 'Boleto', '2024-12-10', '2024-12-01', '2024-12-31', 'Em aberto', NULL, ''),
-- Boleto atrasado
('6', '2', 'Aluguel', 3800.00, 'PIX', '2024-11-05', '2024-11-01', '2024-11-30', 'Em aberto', NULL, 'Aguardando pagamento');

-- ============================================
-- Logs de ações (recepção)
-- ============================================
INSERT INTO logs_acoes (id, usuario_id, usuario_nome, acao_tipo, descricao) VALUES
('1', '2', 'recep', 'Cadastro', 'Cadastrou inquilino: Carlos Oliveira'),
('2', '2', 'recep', 'Pagamento', 'Marcou boleto como pago: Carlos Oliveira - R$ 2.500,00'),
('3', '2', 'recep', 'Cadastro', 'Cadastrou boleto: Ana Costa - R$ 3.800,00'),
('4', '2', 'recep', 'Edição', 'Editou dados do inquilino: Ana Costa');

-- ============================================
-- Contratos avulsos
-- ============================================
INSERT INTO contratos_avulsos (id, data, descricao, valor, registrado_por) VALUES
('1', '2024-11-05', 'Contrato de assessoria imobiliária - Cliente externo', 1500.00, 'recep'),
('2', '2024-11-06', 'Serviço de vistoria técnica', 800.00, 'recep'),
('3', '2024-11-07', 'Consultoria em avaliação de imóvel', 2000.00, 'admin');

-- ============================================
-- Verificação de integridade
-- ============================================
-- Contar registros inseridos
SELECT 'usuarios' as tabela, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'proprietarios', COUNT(*) FROM proprietarios
UNION ALL
SELECT 'imoveis', COUNT(*) FROM imoveis
UNION ALL
SELECT 'inquilinos', COUNT(*) FROM inquilinos
UNION ALL
SELECT 'boletos', COUNT(*) FROM boletos
UNION ALL
SELECT 'logs_acoes', COUNT(*) FROM logs_acoes
UNION ALL
SELECT 'contratos_avulsos', COUNT(*) FROM contratos_avulsos;

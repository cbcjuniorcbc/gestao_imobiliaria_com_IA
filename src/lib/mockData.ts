import { User, Proprietario, Imovel, Inquilino, Boleto, LogAcao, ContratoAvulso } from '@/types';

// Mock users (senhas: admin123 e recep123)
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    role: 'admin',
    criado_em: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    username: 'recep',
    role: 'recepcao',
    criado_em: '2024-01-01T00:00:00Z'
  }
];

export const mockProprietarios: Proprietario[] = [
  {
    id: '1',
    nome: 'João Silva',
    cpf_cnpj: '123.456.789-00',
    telefone: '(11) 98765-4321',
    email: 'joao.silva@email.com',
    endereco: 'Rua das Flores, 123 - São Paulo/SP',
    metodo_recebimento: 'PIX',
    observacoes: 'Proprietário desde 2020',
    pasta_path: '/Proprietario_Joao_Silva',
    criado_em: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    nome: 'Maria Santos',
    cpf_cnpj: '987.654.321-00',
    telefone: '(11) 91234-5678',
    email: 'maria.santos@email.com',
    endereco: 'Av. Paulista, 456 - São Paulo/SP',
    metodo_recebimento: 'Transferência Bancária',
    observacoes: '',
    pasta_path: '/Proprietario_Maria_Santos',
    criado_em: '2024-02-10T14:30:00Z'
  }
];

export const mockImoveis: Imovel[] = [
  {
    id: '1',
    proprietario_id: '1',
    endereco: 'Rua Aurora, 789 - Apt 45 - São Paulo/SP',
    rua: 'Rua Aurora',
    numero: '789',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01000-000',
    tipo: 'Locação',
    valor: 2500.00,
    situacao: 'Locado',
    observacoes: '2 quartos, 1 vaga',
    criado_em: '2024-01-20T09:00:00Z'
  },
  {
    id: '2',
    proprietario_id: '1',
    endereco: 'Rua Consolação, 321 - São Paulo/SP',
    rua: 'Rua Consolação',
    numero: '321',
    bairro: 'Consolação',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01300-000',
    tipo: 'Locação',
    valor: 3800.00,
    situacao: 'Locado',
    observacoes: '3 quartos, 2 vagas',
    criado_em: '2024-01-25T11:00:00Z'
  },
  {
    id: '3',
    proprietario_id: '2',
    endereco: 'Av. Brasil, 1500 - Sala 12 - São Paulo/SP',
    rua: 'Av. Brasil',
    numero: '1500',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01430-000',
    tipo: 'Venda',
    valor: 420000.00,
    publicado_internet: 1,
    situacao: 'Disponível',
    observacoes: 'Sala comercial 60m²',
    criado_em: '2024-02-15T16:00:00Z'
  }
];

export const mockInquilinos: Inquilino[] = [
  {
    id: '1',
    imovel_id: '1',
    proprietario_id: '1',
    nome: 'Carlos Oliveira',
    cpf: '456.789.123-00',
    rg: '12.345.678-9',
    cpf_cnpj: '456.789.123-00',
    telefone: '(11) 99876-5432',
    email: 'carlos.oliveira@email.com',
    renda_aproximada: 5000.00,
    data_inicio: '2024-03-01',
    data_termino: '2025-03-01',
    observacoes: 'Contrato de 12 meses',
    pasta_path: '/Proprietario_Joao_Silva/Inquilino_Carlos_Oliveira',
    criado_em: '2024-02-28T10:00:00Z'
  },
  {
    id: '2',
    imovel_id: '2',
    proprietario_id: '1',
    nome: 'Ana Costa',
    cpf: '789.123.456-00',
    rg: '98.765.432-1',
    cpf_cnpj: '789.123.456-00',
    telefone: '(11) 98765-1234',
    email: 'ana.costa@email.com',
    renda_aproximada: 7500.00,
    data_inicio: '2024-02-15',
    observacoes: '',
    pasta_path: '/Proprietario_Joao_Silva/Inquilino_Ana_Costa',
    criado_em: '2024-02-10T14:00:00Z'
  }
];

export const mockBoletos: Boleto[] = [
  {
    id: '1',
    inquilino_id: '1',
    acao: 'Aluguel',
    valor_total: 2500.00,
    forma_pagamento: 'Boleto',
    data_vencimento: '2024-11-10',
    data_inicio: '2024-11-01',
    data_termino: '2024-11-30',
    situacao: 'Pago',
    data_pagamento: '2024-11-08',
    observacoes: '',
    criado_em: '2024-11-01T00:00:00Z'
  },
  {
    id: '2',
    inquilino_id: '1',
    acao: 'Aluguel',
    valor_total: 2500.00,
    forma_pagamento: 'Boleto',
    data_vencimento: '2024-12-10',
    data_inicio: '2024-12-01',
    data_termino: '2024-12-31',
    situacao: 'Em aberto',
    observacoes: '',
    criado_em: '2024-12-01T00:00:00Z'
  },
  {
    id: '3',
    inquilino_id: '2',
    acao: 'Aluguel',
    valor_total: 3800.00,
    forma_pagamento: 'PIX',
    data_vencimento: '2024-11-05',
    data_inicio: '2024-11-01',
    data_termino: '2024-11-30',
    situacao: 'Em aberto',
    observacoes: '',
    criado_em: '2024-11-01T00:00:00Z'
  }
];

export const mockLogs: LogAcao[] = [
  {
    id: '1',
    usuario_id: '2',
    usuario_nome: 'recep',
    acao_tipo: 'Cadastro',
    descricao: 'Cadastrou inquilino: Carlos Oliveira',
    timestamp: '2024-02-28T10:00:00Z'
  },
  {
    id: '2',
    usuario_id: '2',
    usuario_nome: 'recep',
    acao_tipo: 'Pagamento',
    descricao: 'Marcou boleto como pago: Carlos Oliveira - R$ 2.500,00',
    timestamp: '2024-11-08T14:30:00Z'
  }
];

export const mockContratosAvulsos: ContratoAvulso[] = [
  {
    id: '1',
    data: '2024-11-07',
    descricao: 'Contrato de assessoria imobiliária',
    valor: 1500.00,
    registrado_por: 'recep',
    criado_em: '2024-11-07T09:00:00Z'
  }
];

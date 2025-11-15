export type UserRole = 'recepcao' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  criado_em: string;
}

export interface Proprietario {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  metodo_recebimento?: string;
  observacoes?: string;
  pasta_path: string;
  criado_em: string;
}

export interface ImovelAnexo {
  id: string;
  imovel_id: string;
  file_name: string;
  file_path: string;
  file_type: 'foto' | 'documento';
  created_at: string;
  url?: string; // Adicionado para o frontend
}

export interface Imovel {
  id: string;
  proprietario_id: string;
  codigo: string;
  endereco: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipo: 'Venda' | 'Locação' | 'Ponto Comercial';
  valor: number;
  publicado_internet?: number;
  situacao: 'Disponível' | 'Locado' | 'Vendido' | 'Manutenção';
  anexos?: ImovelAnexo[]; // Updated to use ImovelAnexo
  observacoes?: string;
  criado_em: string;
}

export interface Inquilino {
  id: string;
  imovel_id: string;
  proprietario_id: string;
  nome: string;
  cpf?: string;
  rg?: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  renda_aproximada?: number;
  data_inicio: string;
  data_termino?: string;
  dia_vencimento?: number;
  status: 'Ativo' | 'Inativo';
  observacoes?: string;
  pasta_path: string;
  criado_em: string;
}

export interface Foto {
  path: string;
  base64?: string;
}

export interface Documento {
  id: string;
  owner_type: 'proprietario' | 'inquilino' | 'imovel';
  owner_id: string;
  filename: string;
  path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Boleto {
  id: string;
  inquilino_id: string;
  acao: string;
  valor_total: number;
  forma_pagamento: string;
  data_vencimento: string;
  data_inicio?: string;
  data_termino?: string;
  situacao: 'À gerar' | 'Em aberto' | 'Pago';
  data_geracao?: string;
  data_pagamento?: string;
  observacoes?: string;
  criado_em: string;
}

export interface LogAcao {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  acao_tipo: string;
  descricao: string;
  timestamp: string;
}

export interface ContratoAvulso {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  registrado_por: string;
  criado_em: string;
}

export interface DashboardStats {
  total_imoveis: number;
  imoveis_locados: number;
  boletos_em_aberto: number;
  boletos_atrasados: number;
  contratos_avulsos_hoje: number;
  valor_total_em_aberto: number;
}

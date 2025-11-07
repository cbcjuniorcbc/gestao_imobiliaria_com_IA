export {};

declare global {
  interface Window {
    electronAPI?: {
      // ==================== AUTENTICAÇÃO ====================
      login: (credentials: { username: string; password: string }) => Promise<{ 
        success: boolean; 
        user?: any; 
        error?: string;
      }>;

      // ==================== USUÁRIOS ====================
      getUsuarios: () => Promise<{ success: boolean; users?: any[]; error?: string }>;
      createUsuario: (data: { username: string; password: string; role: string }) => Promise<{ success: boolean; userId?: string; message?: string }>;
      updatePassword: (data: { userId: number; newPassword: string }) => Promise<{ success: boolean; message?: string }>;

      // ==================== PROPRIETÁRIOS ====================
      getProprietarios: () => Promise<any[]>;
      getProprietarioById: (id: string) => Promise<any>;
      createProprietario: (data: any) => Promise<any>;
      updateProprietario: (id: string, data: any) => Promise<{ success: boolean }>;
      deleteProprietario: (id: string) => Promise<{ success: boolean }>;

      // ==================== IMÓVEIS ====================
      getImoveis: () => Promise<any[]>;
      getImoveisByProprietario: (proprietarioId: string) => Promise<any[]>;
      getImovelById: (id: string) => Promise<any>;
      createImovel: (data: any) => Promise<any>;
      updateImovel: (id: string, data: any) => Promise<{ success: boolean }>;
      deleteImovel: (id: string) => Promise<{ success: boolean }>;

      // ==================== INQUILINOS ====================
      getInquilinos: () => Promise<any[]>;
      getInquilinosByImovel: (imovelId: string) => Promise<any[]>;
      getInquilinoById: (id: string) => Promise<any>;
      createInquilino: (data: any) => Promise<any>;
      updateInquilino: (id: string, data: any) => Promise<{ success: boolean }>;
      deleteInquilino: (id: string) => Promise<{ success: boolean }>;

      // ==================== BOLETOS ====================
      getBoletos: () => Promise<any[]>;
      getBoletosByInquilino: (inquilinoId: string) => Promise<any[]>;
      createBoleto: (data: any) => Promise<any>;
      updateBoleto: (id: string, data: any) => Promise<{ success: boolean }>;
      marcarBoletoPago: (id: string, dataPagamento: string) => Promise<{ success: boolean }>;
      deleteBoleto: (id: string) => Promise<{ success: boolean }>;

      // ==================== DOCUMENTOS ====================
      uploadDocument: (params: { 
        filePath: string;
        ownerType: 'proprietario' | 'inquilino';
        ownerId: string;
        uploadedBy: string;
      }) => Promise<any>;
      getDocumentos: (ownerType: string, ownerId: string) => Promise<any[]>;
      deleteDocumento: (id: string) => Promise<{ success: boolean }>;
      openDocumento: (filePath: string) => Promise<void>;

      // ==================== LOGS DE AÇÕES ====================
      createLog: (data: {
        usuario_id: string;
        usuario_nome: string;
        acao_tipo: string;
        descricao: string;
      }) => Promise<any>;
      getLogs: (filters?: { 
        dataInicio?: string; 
        dataFim?: string; 
        usuarioId?: string;
      }) => Promise<any[]>;

      // ==================== CONTRATOS AVULSOS ====================
      getContratosAvulsos: (filters?: { 
        dataInicio?: string; 
        dataFim?: string;
      }) => Promise<any[]>;
      createContratoAvulso: (data: any) => Promise<any>;
      updateContratoAvulso: (id: string, data: any) => Promise<{ success: boolean }>;
      deleteContratoAvulso: (id: string) => Promise<{ success: boolean }>;

      // ==================== DASHBOARD ====================
      getDashboardStats: () => Promise<{
        total_imoveis: number;
        imoveis_locados: number;
        boletos_em_aberto: number;
        boletos_atrasados: number;
        contratos_avulsos_hoje: number;
        valor_total_em_aberto: number;
      }>;

      // ==================== CONFIGURAÇÕES ====================
      selectRootPath: () => Promise<string | null>;
      getRootPath: () => Promise<string>;
      setRootPath: (path: string) => Promise<{ success: boolean }>;
      createBackup: () => Promise<{ success: boolean; path?: string }>;
      openExternalLink: (url: string) => Promise<void>;

      // ==================== SISTEMA ====================
      getAppVersion: () => Promise<string>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
    };
  }
}

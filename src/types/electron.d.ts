// Type definitions for Electron API
// Updated with database configuration functions
export {};

declare global {
  interface Window {
    electronAPI?: {
      // Autenticação
      login: (credentials: { username: string; password: string }) => Promise<{ 
        success: boolean; 
        user?: any; 
        error?: string;
      }>;
      
      // Usuários
      getUsuarios: () => Promise<{ success: boolean; users?: any[]; error?: string }>;
      createUsuario: (data: { username: string; password: string; role: string }) => Promise<{ success: boolean; userId?: string; message?: string }>;
      updatePassword: (data: { userId: string; newPassword: string }) => Promise<{ success: boolean; message?: string }>;
      deleteUsuario: (data: { userId: string }) => Promise<{ success: boolean; message?: string }>;
      
      // Proprietários
      getProprietarios: () => Promise<any>;
      createProprietario: (data: any) => Promise<any>;
      updateProprietario: (data: any) => Promise<any>;
      deleteProprietario: (data: any) => Promise<any>;
      
      // Imóveis
      getImoveis: () => Promise<any>;
      getImoveisByProprietario: (id: string) => Promise<any>;
      getImovelById: (id: string) => Promise<any>;
      createImovel: (data: any) => Promise<any>;
      updateImovel: (data: any) => Promise<any>;
      deleteImovel: (data: any) => Promise<any>;
      
      // Inquilinos
      getInquilinos: () => Promise<any>;
      getInquilinosByImovel: (id: string) => Promise<any>;
      getInquilinoById: (id: string) => Promise<any>;
      createInquilino: (data: any) => Promise<any>;
      updateInquilino: (data: any) => Promise<any>;
      deleteInquilino: (data: any) => Promise<any>;
      
      // Boletos
      getBoletos: () => Promise<any>;
      getBoletosByInquilino: (id: string) => Promise<any>;
      marcarBoletoPago: (data: any) => Promise<any>;
      marcarBoletoGerado: (data: any) => Promise<any>;
      deleteBoleto: (data: any) => Promise<any>;
      criarBoletosInquilino: (data: { inquilinoId: string; userId: string; userName: string }) => Promise<any>;
      createBoleto: (data: any) => Promise<any>;
      
      // Documentos
      getDocumentosByOwner: (data: { ownerType: string; ownerId: string }) => Promise<any>;
      uploadDocumento: (data: any) => Promise<any>;
      downloadDocumento: (documentoId: string) => Promise<any>;
      
      // Logs
      getLogs: () => Promise<any>;
      getLogsByDateRange: (startDate: string, endDate: string) => Promise<any>;
      
      // Database status
      getDatabaseStatus: () => Promise<any>;
      
      // Contratos Avulsos
      getContratosAvulsos: () => Promise<any>;
      createContratoAvulso: (data: any) => Promise<any>;
      
      // Dashboard
      getDashboardStats: () => Promise<any>;
      
      // Configurações
      selectRootPath: () => Promise<any>;
      getDbPath: () => Promise<string>;
      selectDbFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
      restartApp: () => Promise<{ success: boolean }>;
    };
  }
}

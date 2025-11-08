/// <reference types="vite/client" />

// Electron API Type Definitions
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
      
      // Proprietários
      getProprietarios: () => Promise<any>;
      createProprietario: (data: any) => Promise<any>;
      
      // Imóveis
      getImoveis: () => Promise<any>;
      getImoveisByProprietario: (id: string) => Promise<any>;
      getImovelById: (id: string) => Promise<any>;
      
      // Inquilinos
      getInquilinos: () => Promise<any>;
      getInquilinosByImovel: (id: string) => Promise<any>;
      getInquilinoById: (id: string) => Promise<any>;
      
      // Boletos
      getBoletos: () => Promise<any>;
      getBoletosByInquilino: (id: string) => Promise<any>;
      marcarBoletoPago: (data: any) => Promise<any>;
      deleteBoleto: (data: any) => Promise<any>;
      
      // Documentos
      getDocumentosByOwner: (data: { ownerType: string; ownerId: string }) => Promise<any>;
      uploadDocumento: (data: any) => Promise<any>;
      
      // Logs
      getLogs: () => Promise<any>;
      
      // Contratos Avulsos
      getContratosAvulsos: () => Promise<any>;
      createContratoAvulso: (data: any) => Promise<any>;
      deleteContratoAvulso: (data: any) => Promise<any>;
      
      // Dashboard
      getDashboardStats: () => Promise<any>;
      
      // Configurações
      selectRootPath: () => Promise<any>;
    };
  }
}

export {};
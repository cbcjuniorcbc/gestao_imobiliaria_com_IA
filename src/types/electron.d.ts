// Type definitions for Electron API
export {};

declare global {
  interface Window {
    electronAPI: {
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
      getImoveisByProprietario: (id: string) => Promise<any>;
      
      // Boletos
      getBoletosByInquilino: (id: string) => Promise<any>;
      marcarBoletoPago: (data: any) => Promise<any>;
      
      // Documentos
      uploadDocumento: (data: any) => Promise<any>;
      
      // Configurações
      selectRootPath: () => Promise<any>;
    };
  }
}

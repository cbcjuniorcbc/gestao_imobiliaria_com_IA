/// <reference types="vite/client" />

// Tipos para Electron API
interface ElectronAPI {
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; user?: any }>;
  getProprietarios: () => Promise<any[]>;
  createProprietario: (data: any) => Promise<any>;
  updateProprietario: (id: string, data: any) => Promise<boolean>;
  deleteProprietario: (id: string) => Promise<boolean>;
  uploadDocument: (file: File, ownerType: string, ownerId: string) => Promise<any>;
  selectRootPath: () => Promise<string | null>;
  // Adicionar mais métodos conforme necessário
}

interface Window {
  electronAPI?: ElectronAPI;
}

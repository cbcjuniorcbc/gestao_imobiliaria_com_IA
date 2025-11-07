const { contextBridge, ipcRenderer } = require('electron');

// Expor API segura para o React
contextBridge.exposeInMainWorld('electronAPI', {
  // Autenticação
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  
  // Usuários
  getUsuarios: () => ipcRenderer.invoke('usuarios:getAll'),
  createUsuario: (data) => ipcRenderer.invoke('usuarios:create', data),
  updatePassword: (data) => ipcRenderer.invoke('usuarios:updatePassword', data),
  
  // Proprietários
  getProprietarios: () => ipcRenderer.invoke('proprietarios:getAll'),
  createProprietario: (data) => ipcRenderer.invoke('proprietarios:create', data),
  
  // Imóveis
  getImoveisByProprietario: (id) => ipcRenderer.invoke('imoveis:getByProprietario', id),
  
  // Boletos
  getBoletosByInquilino: (id) => ipcRenderer.invoke('boletos:getByInquilino', id),
  marcarBoletoPago: (data) => ipcRenderer.invoke('boletos:marcarPago', data),
  
  // Documentos
  uploadDocumento: (data) => ipcRenderer.invoke('documentos:upload', data),
  
  // Configurações
  selectRootPath: () => ipcRenderer.invoke('config:selectRootPath'),
});

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
  getImoveis: () => ipcRenderer.invoke('imoveis:getAll'),
  getImoveisByProprietario: (id) => ipcRenderer.invoke('imoveis:getByProprietario', id),
  getImovelById: (id) => ipcRenderer.invoke('imoveis:getById', id),
  
  // Inquilinos
  getInquilinos: () => ipcRenderer.invoke('inquilinos:getAll'),
  getInquilinosByImovel: (id) => ipcRenderer.invoke('inquilinos:getByImovel', id),
  getInquilinoById: (id) => ipcRenderer.invoke('inquilinos:getById', id),
  
  // Boletos
  getBoletos: () => ipcRenderer.invoke('boletos:getAll'),
  getBoletosByInquilino: (id) => ipcRenderer.invoke('boletos:getByInquilino', id),
  marcarBoletoPago: (data) => ipcRenderer.invoke('boletos:marcarPago', data),
  
  // Documentos
  getDocumentosByOwner: (data) => ipcRenderer.invoke('documentos:getByOwner', data),
  uploadDocumento: (data) => ipcRenderer.invoke('documentos:upload', data),
  
  // Logs
  getLogs: () => ipcRenderer.invoke('logs:getAll'),
  
  // Contratos Avulsos
  getContratosAvulsos: () => ipcRenderer.invoke('contratos_avulsos:getAll'),
  createContratoAvulso: (data) => ipcRenderer.invoke('contratos_avulsos:create', data),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  
  // Configurações
  selectRootPath: () => ipcRenderer.invoke('config:selectRootPath'),
});

const { contextBridge, ipcRenderer } = require('electron');

// Expor API segura para o React
contextBridge.exposeInMainWorld('electronAPI', {
  // Autenticação
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  
  // Usuários
  getUsuarios: () => ipcRenderer.invoke('usuarios:getAll'),
  createUsuario: (data) => ipcRenderer.invoke('usuarios:create', data),
  updatePassword: (data) => ipcRenderer.invoke('usuarios:updatePassword', data),
  deleteUsuario: (data) => ipcRenderer.invoke('usuarios:delete', data),
  
  // Proprietários
  getProprietarios: () => ipcRenderer.invoke('proprietarios:getAll'),
  createProprietario: (data) => ipcRenderer.invoke('proprietarios:create', data),
  
  // Inquilinos
  getInquilinos: () => ipcRenderer.invoke('inquilinos:getAll'),
  getInquilinoById: (id) => ipcRenderer.invoke('inquilinos:getById', id),
  getInquilinosByImovel: (id) => ipcRenderer.invoke('inquilinos:getByImovel', id),
  createInquilino: (data) => ipcRenderer.invoke('inquilinos:create', data),
  updateInquilino: (data) => ipcRenderer.invoke('inquilinos:update', data),
  deleteInquilino: (data) => ipcRenderer.invoke('inquilinos:delete', data),
  
  // Imóveis
  getImoveisByProprietario: (id) => ipcRenderer.invoke('imoveis:getByProprietario', id),
  getImoveis: () => ipcRenderer.invoke('imoveis:getAll'),
  getImovelById: (id) => ipcRenderer.invoke('imoveis:getById', id),
  createImovel: (data) => ipcRenderer.invoke('imoveis:create', data),
  updateImovel: (data) => ipcRenderer.invoke('imoveis:update', data),
  deleteImovel: (data) => ipcRenderer.invoke('imoveis:delete', data),
  
  // Boletos
  getBoletosByInquilino: (id) => ipcRenderer.invoke('boletos:getByInquilino', id),
  getBoletos: () => ipcRenderer.invoke('boletos:getAll'),
  marcarBoletoPago: (data) => ipcRenderer.invoke('boletos:marcarPago', data),
  marcarBoletoGerado: (data) => ipcRenderer.invoke('boletos:marcarGerado', data),
  deleteBoleto: (data) => ipcRenderer.invoke('boletos:delete', data),
  
  // Documentos
  uploadDocumento: (data) => ipcRenderer.invoke('documentos:upload', data),
  
  // Fotos de Imóveis
  uploadFotosImovel: (data) => ipcRenderer.invoke('imoveis:uploadFotos', data),
  getFotoImovel: (fotoPath) => ipcRenderer.invoke('imoveis:getFoto', { fotoPath }),
  deleteFotoImovel: (data) => ipcRenderer.invoke('imoveis:deleteFoto', data),
  
  // Configurações
  selectRootPath: () => ipcRenderer.invoke('config:selectRootPath'),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
});
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
  updateProprietario: (data) => ipcRenderer.invoke('proprietarios:update', data),
  deleteProprietario: (data) => ipcRenderer.invoke('proprietarios:delete', data),
  
  // Imóveis
  getImoveis: () => ipcRenderer.invoke('imoveis:getAll'),
  getImoveisByProprietario: (id) => ipcRenderer.invoke('imoveis:getByProprietario', id),
  getImovelById: (id) => ipcRenderer.invoke('imoveis:getById', id),
  createImovel: (data) => ipcRenderer.invoke('imoveis:create', data),
  updateImovel: (data) => ipcRenderer.invoke('imoveis:update', data),
  deleteImovel: (data) => ipcRenderer.invoke('imoveis:delete', data),
  
  // Inquilinos
  getInquilinos: () => ipcRenderer.invoke('inquilinos:getAll'),
  getInquilinosByImovel: (id) => ipcRenderer.invoke('inquilinos:getByImovel', id),
  getInquilinoById: (id) => ipcRenderer.invoke('inquilinos:getById', id),
  createInquilino: (data) => ipcRenderer.invoke('inquilinos:create', data),
  updateInquilino: (data) => ipcRenderer.invoke('inquilinos:update', data),
  deleteInquilino: (data) => ipcRenderer.invoke('inquilinos:delete', data),
  
  // Boletos
  getBoletos: () => ipcRenderer.invoke('boletos:getAll'),
  getBoletosByInquilino: (id) => ipcRenderer.invoke('boletos:getByInquilino', id),
  marcarBoletoPago: (data) => ipcRenderer.invoke('boletos:marcarPago', data),
  marcarBoletoGerado: (data) => ipcRenderer.invoke('boletos:marcarGerado', data),
  createBoleto: (data) => ipcRenderer.invoke('boletos:create', data),
  deleteBoleto: (data) => ipcRenderer.invoke('boletos:delete', data),
  criarBoletosInquilino: (data) => ipcRenderer.invoke('boletos:criarBoletosInquilino', data),
  
  // Documentos
  getDocumentosByOwner: (data) => ipcRenderer.invoke('documentos:getByOwner', data),
  uploadDocumento: (data) => ipcRenderer.invoke('documentos:upload', data),
  downloadDocumento: (documentoId) => ipcRenderer.invoke('documentos:download', { documentoId }),
  
  // Fotos de Imóveis
  uploadFotosImovel: (data) => ipcRenderer.invoke('imoveis:uploadFotos', data),
  getFotoImovel: (fotoPath) => ipcRenderer.invoke('imoveis:getFoto', { fotoPath }),
  deleteFotoImovel: (data) => ipcRenderer.invoke('imoveis:deleteFoto', data),
  
  // Logs
  getLogs: () => ipcRenderer.invoke('logs:getAll'),
  getLogsByDateRange: (startDate, endDate) => ipcRenderer.invoke('logs:getByDateRange', { startDate, endDate }),
  
  // Database status
  getDatabaseStatus: () => ipcRenderer.invoke('database:getStatus'),
  
  // Contratos Avulsos
  getContratosAvulsos: () => ipcRenderer.invoke('contratos_avulsos:getAll'),
  createContratoAvulso: (data) => ipcRenderer.invoke('contratos_avulsos:create', data),
  deleteContratoAvulso: (data) => ipcRenderer.invoke('contratos_avulsos:delete', data),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  
  // Configurações
  selectRootPath: () => ipcRenderer.invoke('config:selectRootPath'),
  getDbPath: () => ipcRenderer.invoke('config:getDbPath'),
  selectDbFolder: () => ipcRenderer.invoke('config:selectDbFolder'),
  restartApp: () => ipcRenderer.invoke('config:restartApp'),
});

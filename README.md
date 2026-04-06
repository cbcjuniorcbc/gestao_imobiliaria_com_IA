# 🏢 Sistema de Gestão Imobiliária

Sistema desktop completo para gestão de imóveis, proprietários, inquilinos e controle financeiro.

## 📋 Sobre o Projeto

Este é um sistema de gestão imobiliária desenvolvido com React + Vite, preparado para ser convertido em aplicativo desktop com Electron + SQLite.

### ✨ Funcionalidades

#### 👥 Controle de Usuários
- **Dois níveis de acesso**: Recepção e Administrador
- Sistema de autenticação seguro (bcrypt)
- Permissões granulares por funcionalidade

#### 🏠 Gestão Completa
- **Proprietários**: Cadastro com documentos e histórico
- **Imóveis**: Múltiplos imóveis por proprietário, controle de status
- **Inquilinos**: Vinculação a imóveis, contratos e documentação
- **Documentos**: Upload e organização em pastas estruturadas

#### 💰 Controle Financeiro
- **Boletos**: Histórico completo (não emite, apenas controla)
- **Pagamentos**: Baixa manual, controle de vencimentos
- **Cálculos automáticos**: Dias a vencer, dias em atraso
- **Contratos avulsos**: Registro de serviços extras

#### 📊 Relatórios e Logs
- **Dashboard**: Indicadores em tempo real
- **Logs automáticos**: Todas as ações da recepção
- **Relatórios**: Exportação em PDF (por dia/semana/mês)
- **Busca e filtros**: Em todas as telas

### 🔐 Segurança

- Senhas com hash bcrypt
- Sistema de lock para prevenir acesso simultâneo ao banco
- Validação de permissões no frontend e backend
- Backup configurável

### 📁 Estrutura de Pastas

O sistema cria automaticamente:

```
/<pasta_raiz>/
  database.db
  .db.lock
  /Proprietario_Nome_Sobrenome/
    documento1.pdf
    documento2.pdf
    /Inquilino_Nome_Sobrenome/
      contrato.pdf
      documentos.pdf
```

---

## 🚀 Como Usar (Versão Web - Desenvolvimento)

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <url-do-repositório>
cd gestao-imobiliaria

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev
```

Acesse: http://localhost:8080

### Credenciais de Teste

- **Admin**: `admin` / `admin123`
- **Recepção**: `recep` / `recep123`

---

## 💻 Converter para Executável Desktop

Para transformar este projeto em um aplicativo desktop (.exe) com SQLite local:

👉 **Siga o tutorial completo**: [TUTORIAL_ELECTRON.md](./TUTORIAL_ELECTRON.md)

### Resumo rápido:

```bash
# 1. Instalar dependências do Electron
npm install --save-dev electron electron-builder
npm install better-sqlite3 bcrypt

# 2. Criar estrutura Electron (ver tutorial)
# 3. Configurar package.json (ver tutorial)
# 4. Rodar em desenvolvimento
npm run electron:dev

# 5. Gerar executável
npm run electron:build
```

---

## 🗄️ Banco de Dados

### Schema SQLite
Veja o schema completo em: [database/schema.sql](./database/schema.sql)

### Tabelas:
- `usuarios` - Controle de acesso
- `proprietarios` - Donos de imóveis
- `imoveis` - Propriedades gerenciadas
- `inquilinos` - Locatários
- `boletos` - Histórico de pagamentos
- `documentos` - Arquivos anexados
- `logs_acoes` - Auditoria de ações
- `contratos_avulsos` - Serviços extras

### Seed Data
Dados de exemplo para testes: [database/seed.sql](./database/seed.sql)

---

## 🎨 Design System

O projeto usa um design system completo baseado em tokens semânticos:

### Cores Principais
- **Primary**: Azul profissional (`210 100% 45%`)
- **Success**: Verde (`142 76% 36%`)
- **Warning**: Laranja (`38 92% 50%`)
- **Destructive**: Vermelho (`0 84% 60%`)
- **Info**: Azul claro (`199 89% 48%`)

### Componentes
- Todos os componentes shadcn/ui customizados
- Tokens CSS reutilizáveis
- Suporte a dark mode

---

## 📱 Responsividade

O sistema é totalmente responsivo:
- Desktop (1400px+)
- Tablet (768px - 1400px)
- Mobile (< 768px)

---

## 🔄 Sincronização com Google Drive

### Configuração
1. Instale o Google Drive for Desktop
2. No app, escolha uma pasta dentro do Drive como pasta raiz
3. O sistema criará automaticamente o `database.db` lá

### ⚠️ ATENÇÃO
- **NUNCA** abra o app simultaneamente em duas máquinas
- Feche o app antes de sincronizar em caso de conflito
- O sistema usa arquivo `.db.lock` para prevenir corrupção
- Faça backups regulares (configurável no app)

---

## 📦 Build e Distribuição

### Gerar Instalador

```bash
npm run electron:build
```

Gera em `release/`:
- `Gestão Imobiliária Setup.exe` (NSIS installer)
- `Gestão Imobiliária.exe` (portable)

### Configuração do Instalador
- Permite escolher pasta de instalação
- Cria atalhos (Desktop + Menu Iniciar)
- Desinstalador automático

---

## 🧪 Testes

### Dados de Teste
O seed inclui:
- 2 usuários (admin e recepção)
- 3 proprietários
- 4 imóveis
- 3 inquilinos
- 6 boletos (pagos, em aberto, atrasados)
- Logs de ações
- Contratos avulsos

---

## 📝 Notas Técnicas

### Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Desktop**: Electron (quando convertido)
- **Database**: SQLite (better-sqlite3)
- **Segurança**: bcrypt, IPC seguro

### Arquitetura
- Context API para estado global
- React Router para navegação
- IPC seguro (quando Electron)
- Prepared statements para queries

### Performance
- SQLite em WAL mode
- Índices otimizados
- Lazy loading de componentes
- Build otimizado com Vite

---

## 🐛 Troubleshooting

### Problema: Banco não abre
**Solução**: Verifique se não há arquivo `.db.lock` travado

### Problema: node-gyp error ao instalar
**Solução**: 
```bash
npm install --global windows-build-tools
```

### Problema: App não abre após build
**Solução**: Verifique se `"main": "electron/main.js"` está correto no `package.json`

Mais soluções: [TUTORIAL_ELECTRON.md](./TUTORIAL_ELECTRON.md#-solução-de-problemas-comuns)

---

## 📚 Documentação

- [Tutorial Electron completo](./TUTORIAL_ELECTRON.md)
- [Schema do banco](./database/schema.sql)
- [Seed data](./database/seed.sql)
- [Tipos TypeScript](./src/types/index.ts)

---

## 🤝 Contribuindo

Este é um projeto base. Para customizar:
1. Modifique as cores em `src/index.css`
2. Adicione novos componentes em `src/components/`
3. Estenda o schema em `database/schema.sql`
4. Adicione handlers IPC em `electron/main.js`

---

## 📄 Licença

Projeto proprietário - Todos os direitos reservados

---

## 🎯 Roadmap Futuro

- [ ] Exportação Excel/CSV
- [ ] Gráficos e dashboards avançados
- [ ] Integração com APIs de bancos (geração de boletos)
- [ ] Notificações de vencimento
- [ ] Backup automático na nuvem
- [ ] Versão multi-tenant (SaaS)
- [ ] App mobile companion

---

## 💡 Suporte

Para dúvidas sobre:
- **Electron**: Ver [TUTORIAL_ELECTRON.md](./TUTORIAL_ELECTRON.md)
- **React/Vite**: Documentação oficial
- **SQLite**: https://www.sqlite.org/docs.html

---

**Versão**: 1.0.0
**Desenvolvido com**: ❤️ e ☕
**Orquestrado por**: Cleber Junior

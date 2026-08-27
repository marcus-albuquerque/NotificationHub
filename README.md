# NotificationHub

Sistema de notificações para agricultura inteligente que processa eventos de sensores IoT, aplica regras de negócio e envia notificações aos produtores.

## 📋 Visão Geral

O **NotificationHub** é uma plataforma completa que gerencia o ciclo de vida de eventos de sensores agrícolas. O sistema valida dados, detecta duplicatas, aplica regras de notificação baseadas em limiares e dispara alertas aos produtores via WhatsApp (ou outros canais).

**Características principais:**
- ✅ Recebimento de eventos REST com validação completa
- ✅ Detecção de duplicatas com Redis
- ✅ Motor de regras com 6 regras pré-configuradas
- ✅ Sistema de notificações com retry automático
- ✅ Interface web com React + Tailwind
- ✅ Testes completos com Jest e property-based testing (fast-check)

## 🛠️ Tecnologias

### Backend
- **Node.js 18+** com TypeScript
- **Express.js** - Framework web
- **PostgreSQL 14+** - Banco de dados principal
- **Redis 6+** - Cache e detecção de duplicatas
- **Bull** - Fila de tarefas para retry de notificações

### Frontend
- **React 19** com TypeScript
- **Vite** - Build tool (dev server ultra rápido)
- **Tailwind CSS** - Estilização utilitária
- **TanStack Query** - Gerenciamento de estado do servidor
- **React Router 7** - Navegação entre páginas
- **Axios** - Cliente HTTP

### Testes
- **Jest** - Framework de testes
- **Supertest** - Testes de API HTTP
- **fast-check** - Property-based testing
- **ts-jest** - Suporte TypeScript no Jest

## 📁 Estrutura do Projeto

NotificationHub/
├── client/                          # Frontend React com Vite
│   ├── src/
│   │   ├── api/                    # Cliente HTTP tipado para backend
│   │   │   └── client.ts           # Instância axios com interceptadores
│   │   ├── components/
│   │   │   └── Layout.tsx          # Layout principal com navegação
│   │   ├── pages/
│   │   │   ├── FarmsPage.tsx       # Lista de fazendas
│   │   │   ├── EventsPage.tsx      # Histórico de eventos com paginação
│   │   │   ├── NotificationsPage.tsx # Lista de notificações
│   │   │   └── SimulatorPage.tsx   # Simulador de eventos
│   │   ├── App.tsx                 # Componente raiz
│   │   └── main.tsx                # Entrada da aplicação
│   ├── index.html                  # Template HTML
│   ├── vite.config.ts              # Configuração Vite
│   ├── tailwind.config.js          # Configuração Tailwind
│   └── package.json
│
├── src/                            # Backend Node.js/Express
│   ├── config/
│   │   ├── database.ts             # Conexão PostgreSQL
│   │   ├── redis.ts                # Conexão Redis
│   │   └── queue.ts                # Configuração Bull queue
│   ├── services/
│   │   ├── event-receiver.ts       # Recebimento de eventos
│   │   ├── data-validator.ts       # Validação de eventos
│   │   ├── duplicate-detector.ts   # Detecção de duplicatas
│   │   ├── rule-engine.ts          # Motor de regras
│   │   ├── notification-generator.ts # Geração de notificações
│   │   ├── notification-provider.ts  # Interface de provedores
│   │   ├── mock-whatsapp-provider.ts # Provider mock para testes
│   │   ├── notification-dispatcher.ts # Envio de notificações
│   │   └── event-processor.ts      # Orquestrador do pipeline
│   ├── types/
│   │   └── index.ts                # Tipos TypeScript compartilhados
│   ├── utils/
│   │   ├── logger.ts               # Logging estruturado
│   │   └── cache-key.ts            # Geração de chaves Redis
│   ├── __tests__/
│   │   ├── config/
│   │   │   └── queue.test.ts       # Testes da fila
│   │   ├── services/
│   │   │   ├── mock-whatsapp-provider.test.ts
│   │   │   ├── notification-dispatcher.test.ts
│   │   │   └── notification-provider.test.ts
│   │   └── duplicate-detector.test.ts
│   ├── app.ts                      # Configuração Express
│   ├── index.ts                    # Entrada da aplicação
│   └── app.test.ts                 # Testes básicos
│
├── database/
│   ├── migrations/
│   │   └── 001_create_tables.sql   # Schema do banco
│   ├── seeds/
│   │   └── 001_seed_demo_data.sql  # Dados de demonstração
│   ├── init.sh                     # Script de inicialização (Linux/Mac)
│   ├── init.bat                    # Script de inicialização (Windows)
│   ├── migrate.js                  # Runner de migrations
│   ├── SCHEMA_REFERENCE.md         # Documentação do schema
│   └── SETUP_GUIDE.md              # Guia de configuração do banco
│
├── .env.example                    # Template de variáveis de ambiente
├── .eslintrc.json                  # Configuração ESLint
├── .prettierrc.json                # Configuração Prettier
├── tsconfig.json                   # Configuração TypeScript
├── jest.config.js                  # Configuração Jest
├── package.json                    # Dependencies do backend
└── README.md                       # Este arquivo


## ⚙️ Pré-requisitos

Certifique-se de ter instalado:

- **Node.js 18+** - [Baixar aqui](https://nodejs.org/)
- **PostgreSQL 14+** - [Baixar aqui](https://www.postgresql.org/)
- **Redis 6+** - [Baixar aqui](https://redis.io/) ou via Docker

Verificar instalação:
\`\`\`bash
node --version      # v18.x.x ou superior
npm --version       # 9.x.x ou superior
psql --version      # PostgreSQL 14+
redis-cli --version # redis-cli 6+
\`\`\`

## 📦 Instalação

### 1. Clone o repositório

\`\`\`bash
git clone <seu-repositorio-url>
cd NotificationHub
\`\`\`

### 2. Configure as variáveis de ambiente

Copie o arquivo \`.env.example\` para \`.env\`:

\`\`\`bash
cp .env.example .env
\`\`\`

Edite o arquivo \`.env\` com suas configurações:

\`\`\`env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notificationhub
DB_USER=postgres
DB_PASSWORD=sua_senha_segura
DB_POOL_SIZE=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Bull Queue (fila de retry)
BULL_QUEUE_CONCURRENCY=5
BULL_QUEUE_ATTEMPTS=3
BULL_QUEUE_BACKOFF=300000

# Logging
LOG_LEVEL=info
\`\`\`

### 3. Instale as dependências

**Backend:**
\`\`\`bash
npm install
\`\`\`

**Frontend:**
\`\`\`bash
cd client
npm install
\`\`\`

### 4. Configure o banco de dados

Execute as migrations e seeds:

**Windows:**
\`\`\`bash
cd database
init.bat
\`\`\`

**Linux/Mac:**
\`\`\`bash
cd database
./init.sh
\`\`\`

Isso irá:
- Criar o banco de dados \`notificationhub\`
- Executar todas as migrations
- Carregar dados de demonstração

## 🚀 Executando o Projeto

### Backend (Node.js + Express)

**Desenvolvimento (com hot-reload):**
\`\`\`bash
npm run dev
\`\`\`

O backend estará disponível em \`http://localhost:3000\`

**Build para produção:**
\`\`\`bash
npm run build
npm start
\`\`\`

### Frontend (React + Vite)

**Desenvolvimento (com Vite dev server):**
\`\`\`bash
cd client
npm run dev
\`\`\`

O frontend estará disponível em \`http://localhost:5174\`

**Build para produção:**
\`\`\`bash
cd client
npm run build
\`\`\`

## 📡 API Endpoints

### Saúde do Sistema

**GET /health**

Verifica se o servidor está funcionando.

\`\`\`bash
curl http://localhost:3000/health
\`\`\`

Resposta:
\`\`\`json
{
  "success": true,
  "data": { "status": "ok" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
\`\`\`

### Receber Evento

**POST /api/events**

Envia um evento de sensor para o sistema.

\`\`\`bash
curl -X POST http://localhost:3000/api/events \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventId": "evt-001",
    "farmId": "farm-001",
    "deviceId": "device-001",
    "sensorType": "AIR_TEMPERATURE",
    "value": 36,
    "unit": "°C",
    "timestamp": "2024-01-15T10:30:00Z"
  }'
\`\`\`

Resposta de sucesso (200):
\`\`\`json
{
  "success": true,
  "data": { "eventId": "evt-001" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
\`\`\`

Resposta de erro (400):
\`\`\`json
{
  "success": false,
  "error": "Campo obrigatório 'farmId' está vazio",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
\`\`\`

### Tipos de Sensores Suportados

| Sensor | Descrição | Exemplo de Valor |
|--------|-----------|------------------|
| \`AIR_TEMPERATURE\` | Temperatura do ar | 25 (°C) |
| \`AIR_HUMIDITY\` | Umidade relativa do ar | 60 (%) |
| \`SOIL_MOISTURE\` | Umidade do solo | 45 (%) |
| \`WATER_RESERVOIR_LEVEL\` | Nível do reservatório de água | 80 (%) |
| \`SILO_LEVEL\` | Nível do silo | 70 (%) |
| \`EQUIPMENT_STATUS\` | Status do equipamento | "OK" ou "FAILURE" |

## 📊 Regras de Notificação

O sistema inclui 6 regras de negócio pré-configuradas:

| Regra | Sensor | Condição | Ação |
|-------|--------|----------|------|
| \`HIGH_AIR_TEMPERATURE\` | AIR_TEMPERATURE | valor > 35°C | Alerta de temperatura alta |
| \`LOW_AIR_HUMIDITY\` | AIR_HUMIDITY | valor < 30% | Alerta de umidade baixa |
| \`LOW_SOIL_MOISTURE\` | SOIL_MOISTURE | valor < 20% | Alerta para irrigar |
| \`LOW_WATER_RESERVOIR\` | WATER_RESERVOIR_LEVEL | valor < 15% | Alerta de reservatório baixo |
| \`LOW_SILO_LEVEL\` | SILO_LEVEL | valor < 15% | Alerta de silo vazio |
| \`EQUIPMENT_FAILURE\` | EQUIPMENT_STATUS | valor = "FAILURE" | Alerta de equipamento com falha |

Quando uma regra é disparada, uma notificação é automaticamente gerada e enviada ao produtor via WhatsApp.

## 🧪 Testes

### Rodar todos os testes

\`\`\`bash
npm test
\`\`\`

### Testes com coverage

\`\`\`bash
npm run test:coverage
\`\`\`

### Testes em modo watch (desenvolvimento)

\`\`\`bash
npm run test:watch
\`\`\`

### Testes específicos

\`\`\`bash
npm test -- event-receiver.test
npm test -- duplicate-detector.test
npm test -- mock-whatsapp-provider.test
\`\`\`

## 💻 Qualidade de Código

### Executar linter

\`\`\`bash
npm run lint
\`\`\`

### Corrigir problemas automaticamente

\`\`\`bash
npm run lint:fix
\`\`\`

### Formatar código

\`\`\`bash
npm run format
\`\`\`

### Verificar formatação

\`\`\`bash
npm run format:check
\`\`\`

## 📚 Dados de Demonstração

O sistema carrega automaticamente dados de demo na inicialização:

**Fazenda:**
- Nome: "Boa Esperança"
- ID: farm-001

**Produtor:**
- Nome: "João Silva"
- Telefone: +5535999999999
- Associado à: Boa Esperança

**Dispositivos:**
- device-001: Sensor de temperatura
- device-002: Sensor de umidade do ar
- device-003: Sensor de umidade do solo
- device-004: Sensor de nível de água
- device-005: Sensor de nível de silo
- device-006: Sensor de status de equipamento

Você pode enviar eventos para qualquer um destes dispositivos e testar o sistema.

## 🔧 Arquitetura e Fluxo

### Pipeline de Processamento de Eventos

\`\`\`
1. Receber Evento (EventReceiver)
   ↓
2. Validar Dados (DataValidator)
   ↓
3. Detectar Duplicatas (DuplicateDetector)
   ├─ Se duplicata: Descartar
   └─ Se novo: Continuar
   ↓
4. Aplicar Regras (RuleEngine)
   ├─ Se nenhuma regra dispara: Registrar "sem alertas"
   └─ Se regra dispara: Continuar
   ↓
5. Gerar Notificações (NotificationGenerator)
   ↓
6. Enviar Notificações (NotificationDispatcher)
   ├─ Se sucesso: Registrar "enviado"
   └─ Se falha: Adicionar à fila de retry (Bull)
   ↓
7. Registrar no Histórico (EventHistory)
\`\`\`

### Sistema de Retry

Quando uma notificação falha ao ser enviada:
1. É adicionada à fila Bull
2. Aguarda 5 minutos
3. Tenta enviar novamente
4. Máximo de 3 tentativas
5. Após falha final, registra no histórico com status "failed"

### Cache de Duplicatas

- **TTL:** 5 minutos
- **Chave:** Hash(farmId + deviceId + sensorType + valor)
- **Armazenamento:** Redis
- **Benefício:** Evita processar eventos duplicados

## 📖 Documentação Adicional

- [Schema do Banco de Dados](./database/SCHEMA_REFERENCE.md)
- [Guia de Setup do Banco](./database/SETUP_GUIDE.md)
- [Plano de Implementação](./database/INDEX.md)

## 🚀 Próximos Passos

- [ ] Implementar mais endpoints de API (GET farms, producers, history)
- [ ] Adicionar testes E2E com Playwright ou Cypress
- [ ] Configurar Docker e docker-compose para deploy local
- [ ] Implementar provider real de WhatsApp
- [ ] Adicionar dashboard de monitoramento em tempo real
- [ ] Implementar autenticação e autorização
- [ ] Configurar CI/CD com GitHub Actions
- [ ] Preparar documentação para deploy em produção

## 📝 Licença

MIT

## 👤 Autor

Desenvolvido por Marcus Albuquerque como um sistema MVP para notificações em agricultura inteligente.

---




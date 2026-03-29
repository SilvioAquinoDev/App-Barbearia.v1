# 🚀 Guia de Instalação Local - Barbershop Manager

## 📋 Pré-requisitos atualizados


Antes de começar, certifique-se de ter instalado:

### Obrigatórios:
- **Node.js** (v18 ou superior) - [Download](https://nodejs.org/)
- **Python** (v3.9 ou superior) - [Download](https://www.python.org/)
- **Git** - [Download](https://git-scm.com/)
- **Yarn** - `npm install -g yarn`

### Recomendados:
- **VS Code** - [Download](https://code.visualstudio.com/)
- **Expo Go** (app no celular) - [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## 📦 1. Clonar o Repositório

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# Entre na pasta do projeto
cd SEU_REPOSITORIO
```

---

## 🔧 2. Configurar o Backend

### 2.1. Instalar Dependências Python

```bash
# Entre na pasta do backend
cd backend

# Criar ambiente virtual (recomendado)
python -m venv venv
py -3.11 -m venv venv311

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependências
python.exe -m pip install --upgrade pip
pip install -r requirements.txt
pip install psycopg_binary
pip install psycopg 
pip install pydantic_settings 
pip install sqlalchemy 
pip uninstall greenlet -y 
pip install greenlet==3.0.3
pip install uvicorn
pip install fastapi
pip install httpx
pip install pydantic[email]
pip install exponent_server_sdk
pip install python-multipart


```

# Add no inicio do arquivo database.py
   import asyncio
   import sys

   # No Windows, força o uso do SelectorEventLoopPolicy
   if sys.platform == 'win32':
      asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())



### 2.2. Configurar NeonDB

**IMPORTANTE:** O backend precisa de um banco PostgreSQL (NeonDB)

1. **Criar conta no NeonDB:**
   - Acesse: https://neon.tech
   - Crie uma conta gratuita
   - Clique em "Create Project"
   - Escolha uma região próxima a você

2. **Obter Connection String:**
   - No dashboard do projeto, vá em "Connection Details"
   - Copie a connection string (formato: `postgresql://user:pass@host/db`)

3. **Atualizar .env:**
   ```bash
   # Edite o arquivo backend/.env
   
   # Cole a connection string (IMPORTANTE: adicione +asyncpg após postgresql)
   DATABASE_URL=postgresql+asyncpg://user:password@ep-xxxxx.neon.tech/neondb
   
   # Mantenha as outras configurações
   SECRET_KEY=change-this-to-a-secure-random-key-in-production
   DEBUG=true
   EXPO_ACCESS_TOKEN=
   ```

### 2.3. Inicializar o Banco de Dados

```bash
# O backend criará as tabelas automaticamente ao iniciar
# mas você pode testar a conexão primeiro:
python -c "from database import init_db; import asyncio; asyncio.run(init_db())"
```

### 2.4. Rodar o Backend

```bash
# Certifique-se de estar na pasta backend com venv ativo
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Você verá:
# INFO:     Uvicorn running on http://0.0.0.0:8001
# INFO:     Application startup complete.
```

**Testar:**
- Abra: http://localhost:8001/api/health
- Docs: http://localhost:8001/docs

---

## 📱 3. Configurar o App Mobile (Expo)

### 3.1. Instalar Dependências

```bash
# Volte para a raiz do projeto
cd ..

# Entre na pasta frontend
cd frontend

# Instalar dependências
yarn install

# Se der erro, tente:
npm install
```

### 3.2. Configurar Variáveis de Ambiente

```bash
# Edite frontend/.env

# Se estiver rodando tudo localmente:
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Se o backend estiver em outro lugar:
EXPO_PUBLIC_BACKEND_URL=https://seu-backend.com
```

### 3.3. Rodar o App Mobile

```bash
# Dependencias para as Notificações Push
npx expo install expo-notifications expo-device expo-constants
# Certifique-se de estar na pasta frontend
npx expo start

# Você verá um QR Code no terminal
```

**Opções para testar:**

1. **No Celular (Recomendado):**
   - Instale o app "Expo Go" no seu celular
   - Escaneie o QR Code
   - O app abrirá no Expo Go

2. **No Navegador:**
   - Pressione `w` no terminal
   - Abrirá no navegador (funcionalidades limitadas)

3. **Emulador Android:**
   - Pressione `a` no terminal
   - Precisa ter Android Studio instalado

4. **Simulador iOS (apenas macOS):**
   - Pressione `i` no terminal
   - Precisa ter Xcode instalado

---

## 🌐 4. Configurar o App Web (Cliente)

### 4.1. Instalar Dependências

```bash
# Volte para a raiz do projeto
cd ..

# Entre na pasta web-client
cd web-client

# Instalar dependências
yarn install

# Se der erro, tente:
npm install
```

### 4.2. Configurar Variáveis de Ambiente (Opcional)

```bash
# Crie um arquivo .env na pasta web-client
touch .env

# Adicione (opcional, tem fallback no código):
VITE_API_URL=http://localhost:8001/api
```

### 4.3. Rodar o App Web

```bash
# Certifique-se de estar na pasta web-client
yarn dev

# Você verá:
# VITE ready in XXX ms
# ➜  Local:   http://localhost:3001/
```

**Testar:**
- Abra: http://localhost:3001
- Você verá a home page
- Navegue para /agendar para testar o agendamento público

---

## 🧪 5. Testando o Sistema Completo

### 5.1. Fluxo de Teste Completo

**Passo 1: Verificar Backend**
```bash
# Em um terminal, teste:
curl http://localhost:8001/api/health

# Deve retornar:
# {"status":"healthy","service":"Barbershop Manager API","version":"1.0.0"}
```

**Passo 2: Criar Serviços (via Swagger)**
1. Abra: http://localhost:8001/docs
2. Primeiro faça login (veja seção 5.2)
3. Use o endpoint `POST /api/services` para criar serviços:
   ```json
   {
     "name": "Corte de Cabelo",
     "description": "Corte masculino completo",
     "price": 50.00,
     "duration_minutes": 30
   }
   ```

**Passo 3: Testar Agendamento Web**
1. Abra: http://localhost:3001/agendar
2. Escolha um serviço
3. Selecione data e hora
4. Preencha seus dados
5. Confirme o agendamento

**Passo 4: Verificar no App Mobile**
1. Abra o app no celular (Expo Go)
2. Faça login com Google
3. Promova-se para barbeiro (tela de Perfil)
4. Veja o agendamento em "Agendamentos"
5. Confirme o agendamento

### 5.2. Como Fazer Login (OAuth)

**No App Mobile:**
1. Clique em "Entrar com Google"
2. Você será redirecionado para auth.emergentagent.com
3. Faça login com sua conta Google
4. Será redirecionado de volta para o app

**No App Web:**
1. Vá em /login
2. Clique em "Entrar com Google"
3. Mesmo fluxo acima

**Importante:** O OAuth do Emergent Auth funciona em localhost também!

---

## 🐛 6. Troubleshooting

### Problema: Backend não conecta ao banco

**Erro:** `[Errno -2] Name or service not known`

**Solução:**
```bash
# Verifique se a DATABASE_URL está correta no backend/.env
# Formato correto:
DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/dbname

# Certifique-se de ter +asyncpg após postgresql
# Teste a conexão:
python -c "from database import engine; import asyncio; asyncio.run(engine.connect())"
```

### Problema: Expo não inicia

**Erro:** `Command not found: expo`

**Solução:**
```bash
# Instale o Expo CLI globalmente
npm install -g expo-cli

# Ou use npx:
npx expo start
```

### Problema: Mobile não conecta ao backend

**Erro:** Requisições falham com timeout

**Solução:**
```bash
# 1. Certifique-se de que o backend está rodando
curl http://localhost:8001/api/health

# 2. Se estiver testando no celular, use o IP da sua máquina
# Descubra seu IP:
# Windows: ipconfig
# macOS/Linux: ifconfig

# 3. Atualize frontend/.env:
EXPO_PUBLIC_BACKEND_URL=http://SEU_IP:8001
# Exemplo: EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8001

# 4. Reinicie o Expo
```

### Problema: Erro CORS no navegador

**Erro:** `CORS policy blocked`

**Solução:** O backend já tem CORS habilitado para `*`. Se ainda der erro:
```python
# Verifique em backend/server.py se tem:
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Problema: "Module not found" no mobile/web

**Solução:**
```bash
# Delete node_modules e reinstale
rm -rf node_modules
yarn install

# Limpe cache do Expo
npx expo start -c
```

### Problema: Porta já em uso

**Erro:** `Port 8001 already in use`

**Solução:**
```bash
# Mude a porta do backend
uvicorn server:app --reload --port 8002

# Atualize a URL nos apps:
# frontend/.env e web-client/.env
```

---

## 📂 7. Estrutura de Pastas Local

Depois de clonar e configurar, sua estrutura será:

```
seu-repositorio/
├── backend/
│   ├── venv/              (criado por você)
│   ├── routes/
│   ├── server.py
│   ├── .env               (configure aqui)
│   └── requirements.txt
│
├── frontend/              (App Mobile)
│   ├── app/
│   ├── src/
│   ├── node_modules/      (criado pelo yarn)
│   ├── .env               (configure aqui)
│   └── package.json
│
└── web-client/            (App Web)
    ├── src/
    ├── node_modules/      (criado pelo yarn)
    ├── .env               (opcional)
    └── package.json
```

---

## ✅ 8. Checklist de Instalação

Use este checklist para garantir que tudo está funcionando:

### Backend:
- [ ] Python instalado (`python --version`)
- [ ] Dependências instaladas (`pip list`)
- [ ] NeonDB configurado no .env
- [ ] Backend rodando (`http://localhost:8001/api/health`)
- [ ] Swagger acessível (`http://localhost:8001/docs`)

### Mobile:
- [ ] Node.js instalado (`node --version`)
- [ ] Expo instalado (`npx expo --version`)
- [ ] Dependências instaladas (`ls node_modules`)
- [ ] .env configurado
- [ ] Expo rodando (`npx expo start`)
- [ ] QR Code visível
- [ ] Expo Go instalado no celular

### Web:
- [ ] Dependências instaladas (`ls node_modules`)
- [ ] Vite rodando (`yarn dev`)
- [ ] Site acessível (`http://localhost:3001`)
- [ ] Navegação funcionando

---

## 🎯 9. Próximos Passos

Depois de tudo funcionando:

1. **Criar dados de teste:**
   - Use o Swagger para criar serviços
   - Crie alguns produtos
   - Faça agendamentos de teste

2. **Testar fluxos:**
   - Agendamento público (web)
   - Login (mobile e web)
   - Gerenciamento (mobile)

3. **Configurar notificações (opcional):**
   - Criar projeto no Expo
   - Adicionar EXPO_ACCESS_TOKEN no backend/.env

4. **Personalizar:**
   - Mudar cores no código
   - Adicionar logo
   - Customizar textos

---

## 💡 Dicas Úteis

### Desenvolvimento Simultâneo

Recomendo abrir 3 terminais:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Linux/Mac
# ou venv\Scripts\activate  # Windows
uvicorn server:app --reload --port 8001
```

**Terminal 2 - Mobile:**
```bash
cd frontend
npx expo start
```

**Terminal 3 - Web:**
```bash
cd web-client
yarn dev
```

### Hot Reload

Todos os ambientes têm hot reload:
- **Backend:** `--reload` no uvicorn
- **Mobile:** Expo recarrega automaticamente
- **Web:** Vite recarrega automaticamente

Basta salvar os arquivos e as mudanças aparecem!

### Logs

Para ver logs detalhados:

```bash
# Backend - já aparece no terminal

# Mobile - console do Expo
# Aparece no terminal onde rodou 'expo start'

# Web - console do navegador
# F12 → Console
```

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs de cada serviço
2. Confirme que todas as dependências estão instaladas
3. Verifique as URLs/IPs nos arquivos .env
4. Teste cada parte individualmente (backend → mobile → web)

---

**Boa sorte! 🚀**

Qualquer dúvida durante a instalação, consulte este guia!

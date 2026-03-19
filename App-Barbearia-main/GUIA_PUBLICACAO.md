# Guia Completo de Publicação - Sistema Barbearia

## Visão Geral do Sistema
O sistema possui **3 componentes** que precisam ser publicados separadamente:

| Componente | Tecnologia | Para quem |
|---|---|---|
| **Backend (API)** | FastAPI + PostgreSQL (NeonDB) | Servidor central |
| **Web Client** | React + Vite | Clientes (agendamento) |
| **App Mobile** | Expo (React Native) | Barbeiro (gestão) |

> O banco de dados **já está na nuvem** (NeonDB), então não precisa de deploy separado.

---

## PARTE 1: Backend (API FastAPI)

### Opção A: Render.com (RECOMENDADO - Gratuito)

**Vantagens**: Deploy automático do GitHub, SSL grátis, fácil de configurar.
**Limitação**: No plano gratuito, o servidor "dorme" após 15 min sem requisições (demora ~30s para acordar).

#### Passo a Passo:

1. **Criar conta** em [render.com](https://render.com) (pode usar conta GitHub)

2. **Salvar o código no GitHub**:
   - No Emergent, use a opção "Save to Github" no chat
   - Isso criará um repositório com todo o código

3. **Criar um novo Web Service no Render**:
   - Vá em Dashboard > New > Web Service
   - Conecte seu repositório GitHub
   - Configure:
     ```
     Name: barbershop-api
     Region: Oregon (US West) ou o mais próximo
     Branch: main
     Root Directory: backend
     Runtime: Python 3
     Build Command: pip install -r requirements.txt
     Start Command: uvicorn server:app --host 0.0.0.0 --port 8001
     Instance Type: Free
     ```

4. **Configurar variáveis de ambiente** (na aba "Environment"):
   ```
   DATABASE_URL = postgresql+asyncpg://neondb_owner:npg_Z9VJg3sFYhyr@ep-shiny-moon-ai8b3te3-pooler.c-4.us-east-1.aws.neon.tech/neondb
   SECRET_KEY = (gere uma chave segura aleatória)
   DEBUG = false
   ```

5. **Fazer deploy**: Clique em "Create Web Service" e aguarde o build

6. **Testar**: Acesse `https://barbershop-api.onrender.com/api/health`

---

### Opção B: Railway (Gratuito com créditos)

**Vantagens**: Mais rápido que Render, não "dorme". 
**Limitação**: $5 de crédito gratuito/mês (suficiente para apps pequenos).

#### Passo a Passo:

1. **Criar conta** em [railway.app](https://railway.app) (use conta GitHub)

2. **Novo projeto**:
   - Dashboard > New Project > Deploy from GitHub repo
   - Selecione o repositório

3. **Configurar**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

4. **Adicionar variáveis** (aba Variables):
   ```
   DATABASE_URL = (sua connection string do NeonDB)
   SECRET_KEY = (chave segura)
   DEBUG = false
   ```

5. **Gerar domínio público**: Settings > Generate Domain

---

### Opção C: Fly.io (Gratuito)

**Vantagens**: Não dorme, boa performance.
**Limitação**: Requer CLI e um pouco mais de configuração.

#### Passo a Passo:

1. **Instalar Fly CLI**: 
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Criar conta e login**: 
   ```bash
   fly auth signup
   ```

3. **Criar `Dockerfile`** na pasta `/backend`:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

4. **Deploy**:
   ```bash
   cd backend
   fly launch
   fly secrets set DATABASE_URL="sua_url" SECRET_KEY="sua_chave"
   fly deploy
   ```

---

## PARTE 2: Web Client (Site do Cliente)

### Opção A: Vercel (RECOMENDADO - Gratuito)

**Vantagens**: Melhor plataforma para React, SSL grátis, CDN global, deploy automático.

#### Passo a Passo:

1. **Criar conta** em [vercel.com](https://vercel.com) (use conta GitHub)

2. **Importar projeto**:
   - Dashboard > Add New > Project
   - Selecione o repositório GitHub
   - Configure:
     ```
     Root Directory: web-client
     Framework Preset: Vite
     Build Command: npm run build (ou yarn build)
     Output Directory: dist
     ```

3. **Configurar variável de ambiente**:
   ```
   VITE_API_URL = https://barbershop-api.onrender.com
   ```
   (Use a URL do seu backend já publicado)

4. **Deploy**: Clique "Deploy" e aguarde

5. **Resultado**: Seu site estará em `https://seu-projeto.vercel.app`

6. **Domínio personalizado** (opcional/gratuito):
   - Vá em Settings > Domains
   - Adicione um domínio próprio (ex: `agendamento.suabarbearia.com.br`)

---

### Opção B: Netlify (Gratuito)

#### Passo a Passo:

1. **Criar conta** em [netlify.com](https://netlify.com)

2. **Novo site do Git**:
   - Sites > Add new site > Import from Git
   - Conecte o GitHub e selecione o repo
   - Configure:
     ```
     Base directory: web-client
     Build command: npm run build
     Publish directory: web-client/dist
     ```

3. **Variáveis de ambiente**: Site settings > Environment variables
   ```
   VITE_API_URL = https://barbershop-api.onrender.com
   ```

---

### Opção C: Cloudflare Pages (Gratuito)

**Vantagens**: CDN mais rápido do mundo, sem limites de banda.

1. Criar conta em [pages.cloudflare.com](https://pages.cloudflare.com)
2. Conectar GitHub > Selecionar repo
3. Build: `cd web-client && npm run build` | Output: `web-client/dist`
4. Adicionar variável `VITE_API_URL`

---

## PARTE 3: App Mobile (Expo)

### Para Testes (Gratuito)

#### Opção 1: Expo Go (Mais fácil)
Os testadores instalam o app **Expo Go** da Play Store/App Store e escaneiam o QR code.

```bash
cd frontend
npx expo start
```

#### Opção 2: Expo EAS Build (APK/IPA gratuito)
Gera um APK (Android) ou IPA (iOS) que pode ser compartilhado diretamente.

1. **Instalar EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login no Expo**:
   ```bash
   eas login
   ```

3. **Configurar build** (cria `eas.json`):
   ```bash
   eas build:configure
   ```

4. **Editar `eas.json`** para gerar APK:
   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         },
         "distribution": "internal"
       },
       "production": {
         "android": {},
         "ios": {}
       }
     }
   }
   ```

5. **Gerar APK (Android)**:
   ```bash
   eas build --platform android --profile preview
   ```
   
6. **Resultado**: Você receberá um link para baixar o APK

7. **Atualizar URL do backend no app**:
   No arquivo `frontend/.env`, mude para a URL do backend publicado:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://barbershop-api.onrender.com
   ```

### Para Publicação nas Lojas

#### Google Play Store
- **Custo**: $25 (taxa única, pagamento vitalício)
- **Tempo para aprovação**: 1-7 dias

1. Criar conta de desenvolvedor em [play.google.com/console](https://play.google.com/console)
2. Gerar build de produção:
   ```bash
   eas build --platform android --profile production
   ```
3. Baixar o `.aab` gerado
4. Criar novo app no Google Play Console
5. Upload do `.aab`
6. Preencher informações (descrição, capturas de tela, política de privacidade)
7. Submeter para revisão

#### Apple App Store
- **Custo**: $99/ano
- **Tempo para aprovação**: 1-3 dias

1. Criar conta Apple Developer em [developer.apple.com](https://developer.apple.com)
2. Gerar build:
   ```bash
   eas build --platform ios --profile production
   ```
3. Submeter via EAS:
   ```bash
   eas submit --platform ios
   ```

---

## PARTE 4: Configurações Finais Pós-Deploy

### 1. Atualizar CORS no Backend
Após publicar, atualize o `server.py` para aceitar apenas seus domínios:

```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://seu-projeto.vercel.app",
        "https://agendamento.suabarbearia.com.br",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Atualizar URL do Backend no App Mobile
No `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://barbershop-api.onrender.com
```

### 3. Atualizar URL da API no Web Client
Certifique-se que a variável `VITE_API_URL` aponta para o backend publicado.

### 4. Configurar Domínio Personalizado (Opcional)
- Registre um domínio (ex: no [Registro.br](https://registro.br) - R$40/ano)
- Configure DNS para apontar para Vercel/Netlify

---

## Resumo das Opções Gratuitas Recomendadas

| Componente | Plataforma | Custo | URL |
|---|---|---|---|
| **Backend** | Render.com | Grátis | render.com |
| **Web Client** | Vercel | Grátis | vercel.com |
| **Banco de Dados** | NeonDB | Grátis (já configurado) | neon.tech |
| **App Mobile (teste)** | Expo EAS | Grátis (30 builds/mês) | expo.dev |
| **Google Play** | Google | $25 (único) | play.google.com |
| **Apple Store** | Apple | $99/ano | apple.com |

### Custo Total Mínimo para Publicar:
- **Apenas web + backend**: **R$ 0** (totalmente gratuito)
- **Com app Android na Play Store**: **~R$ 130** (taxa única)
- **Com app iOS na App Store**: **~R$ 500/ano** (opcional)

---

## Ordem Recomendada de Deploy:
1. Primeiro publique o **Backend** (pois todos dependem dele)
2. Depois o **Web Client** (configurando a URL do backend)
3. Por último o **App Mobile** (configurando a URL do backend e gerando builds)

---

## Dicas Importantes:
- Sempre use **HTTPS** em produção
- Mude a `SECRET_KEY` para algo seguro e único
- Nunca exponha senhas ou chaves no código (use variáveis de ambiente)
- O plano gratuito do Render "dorme" após 15min - para manter ativo, use [UptimeRobot](https://uptimerobot.com) (gratuito) para fazer ping a cada 5min
- Faça backup regular do banco de dados NeonDB

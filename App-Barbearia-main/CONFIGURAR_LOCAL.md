# 🔧 Configurar para Rodar no SEU Computador

## ⚠️ Problema Identificado

Você está tentando usar o app localmente, mas ele está configurado para o preview do Emergent:
```
https://barber-mgmt-5.preview.emergentagent.com
```

Precisa configurar para usar seu backend local!

---

## ✅ Solução Passo a Passo

### 1️⃣ Descubra o IP da Sua Máquina

**No Windows:**
```bash
ipconfig
```
Procure por "IPv4 Address" - algo como: `192.168.1.100`

**No Mac/Linux:**
```bash
ifconfig
# ou
ip addr
```
Procure por "inet" - algo como: `192.168.1.100`

### 2️⃣ Atualize o Arquivo .env do Frontend

**Opção A: Testando no MESMO computador (emulador ou web)**

Edite `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Mantenha o resto:
EXPO_TUNNEL_SUBDOMAIN=barber-mgmt-5
EXPO_PACKAGER_HOSTNAME=https://barber-mgmt-5.preview.emergentagent.com
EXPO_USE_FAST_RESOLVER=1
METRO_CACHE_ROOT=/app/frontend/.metro-cache
```

**Opção B: Testando no CELULAR físico**

Edite `frontend/.env`:
```env
# Substitua pelo IP que você descobriu
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8001

# Mantenha o resto:
EXPO_TUNNEL_SUBDOMAIN=barber-mgmt-5
EXPO_PACKAGER_HOSTNAME=https://barber-mgmt-5.preview.emergentagent.com
EXPO_USE_FAST_RESOLVER=1
METRO_CACHE_ROOT=/app/frontend/.metro-cache
```

### 3️⃣ Limpar Cache e Reiniciar

No diretório `frontend/`:

```bash
# Limpar cache do Expo
npx expo start -c

# Ou se já estiver rodando:
# Ctrl+C para parar
# Depois:
npx expo start -c
```

### 4️⃣ Testar o Backend

Antes de tudo, certifique-se que o backend está rodando:

```bash
# No navegador ou terminal:
curl http://localhost:8001/api/health

# Deve retornar:
# {"status":"healthy",...}
```

### 5️⃣ Fazer Login Novamente

Agora quando você fizer login:
1. ✅ Será redirecionado corretamente
2. ✅ O session_id será enviado para SEU backend local
3. ✅ Seus dados serão salvos no NeonDB
4. ✅ Você conseguirá virar barbeiro e criar serviços

---

## 🧪 Como Testar se Está Funcionando

### Teste 1: Verificar URL da API

No código `frontend/src/services/api.ts`, adicione um log temporário:

```typescript
console.log('🔗 API URL:', api.defaults.baseURL);
```

Quando o app iniciar, você deve ver:
```
🔗 API URL: http://localhost:8001/api
```

### Teste 2: Testar Requisição Manual

No terminal do seu computador:

```bash
# Se estiver usando localhost:
curl http://localhost:8001/api/services

# Se estiver usando IP:
curl http://192.168.1.100:8001/api/services
```

Deve retornar uma lista vazia `[]` (ainda não tem serviços).

---

## 🔍 Resolver Problemas do Botão "Tornar-se Barbeiro"

Se o botão não funcionar depois de configurar:

### Opção 1: Usar o Swagger (Recomendado)

1. Abra: http://localhost:8001/docs
2. Primeiro faça login pelo app mobile
3. No Swagger, vá em `POST /api/auth/promote-to-barber`
4. Clique em "Try it out"
5. Clique em "Execute"

Isso vai promover seu usuário para barbeiro diretamente!

### Opção 2: Atualizar Diretamente no Banco

No console do NeonDB:

1. Acesse: https://console.neon.tech
2. Vá em "SQL Editor"
3. Execute:
   ```sql
   -- Listar usuários
   SELECT * FROM users;
   
   -- Promover para barbeiro (substitua o email)
   UPDATE users 
   SET role = 'barber' 
   WHERE email = 'seu-email@gmail.com';
   ```

---

## 🎯 Checklist de Configuração Local

- [ ] Backend rodando em `http://localhost:8001`
- [ ] NeonDB configurado e conectado
- [ ] IP da máquina descoberto (se usar celular)
- [ ] `frontend/.env` atualizado com URL correta
- [ ] Expo reiniciado com cache limpo (`-c`)
- [ ] Teste de health check funcionando
- [ ] Login realizado
- [ ] Promovido para barbeiro
- [ ] Consegue criar serviços

---

## 📱 Fluxo Completo de Teste

### Passo 1: Backend
```bash
# Já está rodando aqui no Emergent
# Teste:
curl http://localhost:8001/api/health
```

### Passo 2: Configurar Frontend

```bash
cd seu-repositorio/frontend

# Editar .env com URL correta

# Instalar dependências (se ainda não fez)
yarn install

# Rodar com cache limpo
npx expo start -c
```

### Passo 3: Abrir App

- **No celular:** Escanear QR Code com Expo Go
- **No navegador:** Pressionar `w` no terminal
- **No emulador Android:** Pressionar `a` no terminal

### Passo 4: Login

1. Clicar em "Entrar com Google"
2. Autorizar
3. **Observar os logs no terminal do Expo**
4. Você deve ver: ✅ Login completado com sucesso!

### Passo 5: Virar Barbeiro

**Opção A - Pelo App:**
1. Ir em "Perfil"
2. Clicar "Tornar-se Barbeiro"

**Opção B - Pelo Swagger:**
1. Abrir http://localhost:8001/docs
2. POST /api/auth/promote-to-barber

### Passo 6: Criar Serviço

1. Ir na aba "Serviços"
2. Clicar "Adicionar Serviço"
3. Preencher:
   - Nome: "Corte de Cabelo"
   - Descrição: "Corte masculino"
   - Preço: 50
   - Duração: 30 minutos
4. Salvar

---

## 🚨 Erros Comuns

### Erro: "Network request failed"

**Causa:** App não consegue acessar o backend

**Solução:**
1. Verifique se o backend está rodando
2. Se estiver no celular, use o IP (não localhost)
3. Certifique-se que celular e computador estão na mesma rede Wi-Fi

### Erro: "401 Unauthorized"

**Causa:** Token de autenticação inválido ou não enviado

**Solução:**
1. Faça logout e login novamente
2. Limpe o cache: `npx expo start -c`
3. Verifique se o session_id foi capturado nos logs

### Erro: "403 Forbidden"

**Causa:** Você não é barbeiro ainda

**Solução:**
1. Use o Swagger para promover: POST /api/auth/promote-to-barber
2. Ou atualize direto no banco de dados

---

## 💡 Dica Final

Para ver TODOS os logs do que está acontecendo:

**No terminal do Expo:**
```
Veja as mensagens com emojis:
🔐 = Login
📡 = Requisições
✅ = Sucesso
❌ = Erro
```

**No terminal do Backend:**
```bash
# Ver requisições chegando:
sudo supervisorctl tail -f backend
```

Você deve ver algo como:
```
INFO: POST /api/auth/session?session_id=xxx - 200 OK
INFO: GET /api/auth/me - 200 OK
INFO: POST /api/auth/promote-to-barber - 200 OK
```

---

**Me envie os logs se ainda não funcionar!** 🔍

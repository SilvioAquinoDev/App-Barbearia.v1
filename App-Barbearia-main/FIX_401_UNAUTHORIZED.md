# 🔴 Erro 401 Unauthorized - Sessão Não Criada

## ❌ Problema Identificado

```
INFO: GET /api/auth/me HTTP/1.1 401 Unauthorized
```

Isso significa que o app está tentando verificar se está logado, mas **não encontra o token de autenticação**.

## 🔍 Análise

O que deveria acontecer:

1. ✅ Usuário clica em "Entrar com Google"
2. ✅ Autoriza o app
3. ✅ Retorna com `session_id` na URL
4. ❌ **App deveria chamar `POST /api/auth/session?session_id=xxx`** ← ISSO NÃO ESTÁ ACONTECENDO!
5. ❌ Sem esse passo, não cria sessão
6. ❌ Então `GET /api/auth/me` retorna 401

## 🎯 Causa Raiz

O app **não está enviando o session_id para o backend** depois do OAuth.

Possíveis motivos:
1. App está configurado com URL errada (está usando o preview em vez do local)
2. O session_id não está sendo capturado da URL
3. O redirect URL está incorreto

## ✅ Soluções

### Solução 1: Verificar se POST /api/auth/session está sendo chamado

Nos logs do backend, você deveria ver:

```
🔐 [AUTH] Recebido session_id: xxx
POST /api/auth/session?session_id=xxx - 200 OK
```

**Se NÃO aparecer essa linha**, o problema está no app não enviando o session_id!

### Solução 2: Configurar URL Correta no App

**Para rodar LOCALMENTE no seu computador:**

#### Opção A: Testando no mesmo computador

Edite `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

#### Opção B: Testando no celular

1. Descubra o IP da sua máquina:
```bash
# Windows:
ipconfig

# Mac/Linux:
ifconfig
```

2. Edite `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8001
```
(Substitua pelo seu IP)

3. **IMPORTANTE:** Reinicie o Expo com cache limpo:
```bash
npx expo start -c
```

### Solução 3: Teste Manual para Confirmar

Vamos testar manualmente se a API funciona:

#### Passo 1: Obter um session_id

1. Abra no navegador:
```
https://auth.emergentagent.com/?redirect=http://localhost:8001/callback
```

2. Faça login com Google

3. Você será redirecionado para uma URL tipo:
```
http://localhost:8001/callback#session_id=cutflow-8
```

4. **Copie o session_id** (a parte depois de `#session_id=`)

#### Passo 2: Testar o endpoint manualmente

No terminal:
```bash
# Substitua SEU_SESSION_ID pelo ID que você copiou
curl -X POST "http://localhost:8001/api/auth/session?session_id=SEU_SESSION_ID" -v
```

**Resposta esperada:**
```json
{
  "user": {
    "user_id": "user_abc123",
    "email": "seu@email.com",
    "name": "Seu Nome",
    "role": "client"
  },
  "session_token": "session_xyz789"
}
```

#### Passo 3: Testar com o token

```bash
# Copie o session_token da resposta acima
# Teste o endpoint /me:
curl -H "Authorization: Bearer session_xyz789" http://localhost:8001/api/auth/me

# Deve retornar seus dados do usuário!
```

Se funcionar manualmente, o problema está no app não enviando o session_id!

---

## 🔧 Solução 4: Adicionar Logs no App

Vamos adicionar logs temporários para ver o que está acontecendo.

### No App Mobile:

Edite `frontend/src/contexts/AuthContext.tsx` e adicione este log no início da função `login`:

```typescript
const login = async () => {
  console.log('🔐 [APP] Iniciando login...');
  console.log('🔗 [APP] Backend URL:', REDIRECT_URL);
  
  try {
    // ... resto do código
```

### Verificar no Terminal do Expo

Quando você clicar em "Entrar com Google", deve aparecer:

```
🔐 [APP] Iniciando login...
🔗 [APP] Backend URL: http://localhost:8001
🔄 [APP] Resultado do OAuth: {...}
✅ [APP] Session ID encontrado: xxx
📡 [APP] Chamando backend...
✅ [APP] Login completado!
```

Se aparecer erro ou não aparecer "📡 Chamando backend...", o problema está aí!

---

## 🎯 Checklist de Verificação

- [ ] Backend rodando: `curl http://localhost:8001/api/health`
- [ ] `frontend/.env` tem `EXPO_PUBLIC_BACKEND_URL=http://localhost:8001`
- [ ] Expo reiniciado com cache limpo: `npx expo start -c`
- [ ] Logs do backend abertos: `sudo supervisorctl tail -f backend`
- [ ] Tentou fazer login
- [ ] Viu se apareceu `POST /api/auth/session` nos logs

---

## 🐛 Diagnóstico por Logs

### Cenário 1: Não aparece POST /api/auth/session

**Problema:** App não está enviando session_id

**Solução:**
1. Verificar EXPO_PUBLIC_BACKEND_URL no .env
2. Reiniciar Expo com cache limpo
3. Se no celular, usar IP da máquina (não localhost)

### Cenário 2: Aparece POST mas retorna erro

**Problema:** Session_id inválido ou expirado

**Solução:**
1. Tente fazer login novamente
2. O session_id expira em alguns minutos
3. Verifique os logs detalhados do backend

### Cenário 3: Aparece POST e retorna 200, mas ainda dá 401

**Problema:** Token não está sendo salvo no app

**Solução:**
1. Limpar dados do app
2. Verificar AsyncStorage
3. Fazer logout e login novamente

---

## 💡 Atalho Rápido - Solução Temporária

Se quiser testar o resto do app enquanto resolve a autenticação:

### Criar usuário manualmente no banco:

1. Acesse: https://console.neon.tech
2. SQL Editor:

```sql
-- Criar usuário teste
INSERT INTO users (user_id, email, name, role, created_at)
VALUES ('user_teste', 'teste@email.com', 'Usuário Teste', 'barber', NOW());

-- Criar sessão
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
VALUES ('user_teste', 'token_teste_123', NOW() + INTERVAL '7 days', NOW());
```

3. No app, adicione manualmente o token:

```typescript
// Temporário - só para testar
await AsyncStorage.setItem('session_token', 'token_teste_123');
global.authToken = 'token_teste_123';
```

Isso permite testar o resto do app enquanto resolve o login!

---

## 🚀 Próximo Passo

**Me envie:**

1. ✅ Conteúdo do seu `frontend/.env`
2. ✅ Logs do terminal do Expo quando clica em "Entrar"
3. ✅ Logs do backend quando tenta fazer login
4. ✅ Está testando no celular ou no navegador/emulador?

Com essas informações eu te dou a solução exata! 🔍

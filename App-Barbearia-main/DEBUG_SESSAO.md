# 🔍 Debug - Sessão Não Salvando no Banco

## ⚠️ Problema

A sessão não está sendo salva no NeonDB quando você faz login.

## 🧪 Como Coletar Logs para Debug

### Passo 1: Abrir Terminal de Logs do Backend

**Se estiver rodando localmente no seu PC:**

```bash
# Windows (PowerShell ou CMD):
cd caminho\do\seu\projeto\backend
python -m uvicorn server:app --reload --port 8001

# Deixe esse terminal aberto para ver os logs
```

**Se estiver rodando aqui no Emergent:**

```bash
# Ver logs em tempo real:
sudo supervisorctl tail -f backend

# Ou em outro terminal:
sudo supervisorctl tail -f backend stdout
```

### Passo 2: Tentar Fazer Login

1. Abra o app mobile ou web
2. Clique em "Entrar com Google"
3. Autorize o app
4. **IMPORTANTE: NÃO FECHE O TERMINAL!**

### Passo 3: Ver os Logs

No terminal do backend, você deve ver mensagens com emojis:

**Exemplo de logs esperados se funcionar:**
```
🔐 [AUTH] Recebido session_id: 80e33a0d-2f30-4623...
📡 [AUTH] Chamando Emergent Auth para validar session_id...
✅ [AUTH] Dados do usuário recebidos: seu@email.com
💾 [AUTH] Criando/atualizando usuário no banco...
✅ [AUTH] Usuário criado/atualizado: seu@email.com (role: client)
✅ [AUTH] Session token gerado: session_abc123...
🎉 [AUTH] Login completado com sucesso para seu@email.com
INFO: POST /api/auth/session?session_id=xxx - 200 OK
```

**Se der erro, você verá:**
```
🔐 [AUTH] Recebido session_id: 80e33a0d-2f30-4623...
📡 [AUTH] Chamando Emergent Auth para validar session_id...
❌ [AUTH] Erro no login: HTTPException: Invalid session_id
❌ [AUTH] Traceback: ...detalhes do erro...
INFO: POST /api/auth/session?session_id=xxx - 401 Unauthorized
```

### Passo 4: Me Enviar os Logs

**Copie e cole TODA a saída** que apareceu no terminal quando você tentou fazer login.

---

## 🔍 Verificações Importantes

### Verificação 1: A requisição está chegando no backend?

Veja se aparece esta linha nos logs:
```
INFO: POST /api/auth/session?session_id=xxx
```

**Se NÃO aparecer:**
- ❌ O app não está chamando seu backend local
- ✅ Solução: Configurar EXPO_PUBLIC_BACKEND_URL corretamente

**Se aparecer:**
- ✅ O app está chamando seu backend
- Continue para próxima verificação

### Verificação 2: O session_id está sendo recebido?

Veja se aparece:
```
🔐 [AUTH] Recebido session_id: xxx
```

**Se NÃO aparecer:**
- ❌ O session_id não está sendo enviado
- Problema no app mobile/web

**Se aparecer:**
- ✅ Session ID está chegando
- Continue para próxima verificação

### Verificação 3: O Emergent Auth está validando?

Veja se aparece:
```
✅ [AUTH] Dados do usuário recebidos: email@example.com
```

**Se aparecer erro:**
```
❌ [AUTH] Erro no login: HTTPException: Invalid session_id
```
- ❌ O session_id é inválido ou expirado
- Tente fazer login novamente

**Se aparecer sucesso:**
- ✅ Emergent Auth validou
- Continue para próxima verificação

### Verificação 4: O banco está salvando?

Veja se aparece:
```
✅ [AUTH] Usuário criado/atualizado: email@example.com
✅ [AUTH] Session token gerado: xxx
```

**Se aparecer erro antes disso:**
- ❌ Problema ao salvar no banco
- Verifique conexão com NeonDB

**Se aparecer sucesso:**
- ✅ Salvou no banco!
- Próxima verificação

### Verificação 5: Verificar no Banco de Dados

Acesse: https://console.neon.tech

Execute no SQL Editor:
```sql
-- Ver todos os usuários
SELECT user_id, email, name, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- Ver todas as sessões
SELECT id, user_id, session_token, expires_at, created_at 
FROM user_sessions 
ORDER BY created_at DESC;
```

**Se não tiver nenhum registro:**
- ❌ Não salvou no banco
- Veja os logs do backend para saber o erro

**Se tiver registros:**
- ✅ Salvou no banco!
- O problema pode ser no app não guardando o token

---

## 🐛 Possíveis Problemas e Soluções

### Problema 1: Requisição não chega no backend

**Sintoma:** Não aparece `POST /api/auth/session` nos logs

**Causa:** App está usando URL errada

**Solução:**

No seu computador, edite `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

Ou se no celular:
```env
EXPO_PUBLIC_BACKEND_URL=http://SEU_IP:8001
```

Reinicie o Expo:
```bash
npx expo start -c
```

### Problema 2: Session ID inválido

**Sintoma:** Erro "Invalid session_id"

**Causa:** Session ID expirou ou está incorreto

**Solução:**
1. Limpe o cache do navegador/app
2. Faça logout do Google
3. Tente fazer login novamente

### Problema 3: Erro ao conectar com banco

**Sintoma:** Erro ao criar usuário no banco

**Causa:** Problemas com NeonDB

**Solução:**
```bash
# Teste a conexão:
curl http://localhost:8001/api/health

# Deve retornar:
{"status":"healthy",...}
```

Se não funcionar, verifique DATABASE_URL no `.env`

### Problema 4: Token não está sendo guardado

**Sintoma:** Salvou no banco mas app volta para login

**Causa:** App não está salvando o token localmente

**Solução:** Ver logs do app mobile/web

---

## 📱 Logs do App Mobile

No terminal onde você rodou `npx expo start`, você também verá logs:

```
🔐 Iniciando login...
✅ Session ID encontrado: xxx
📡 Chamando backend...
✅ Resposta do backend: {...}
✅ Login completado com sucesso!
```

Se não ver esses logs, o problema está no app!

---

## 🧪 Teste Manual da API

Você pode testar manualmente se a API funciona:

### 1. Fazer login e pegar um session_id

1. Vá em: https://auth.emergentagent.com/?redirect=http://localhost:8001/callback
2. Faça login com Google
3. Você será redirecionado para uma URL com `#session_id=xxx`
4. Copie o session_id

### 2. Testar o endpoint

No terminal:
```bash
# Substitua SESSION_ID_AQUI pelo ID que você copiou
curl -X POST "http://localhost:8001/api/auth/session?session_id=SESSION_ID_AQUI" -v

# Você deve ver:
# 200 OK
# E um JSON com user e session_token
```

### 3. Verificar no banco

```sql
SELECT * FROM users;
SELECT * FROM user_sessions;
```

Se aparecer o usuário, a API funciona!

---

## 🎯 Checklist de Debug

- [ ] Backend rodando (`curl http://localhost:8001/api/health`)
- [ ] NeonDB configurado e conectado
- [ ] Frontend/.env com URL correta
- [ ] Tentou fazer login
- [ ] Viu logs no terminal do backend
- [ ] Copiou e enviou os logs completos
- [ ] Verificou se usuário apareceu no banco

---

## 💡 Próximo Passo

**Tente fazer login agora** e me envie:

1. ✅ Logs completos do backend (com os emojis 🔐📡✅❌)
2. ✅ Logs do terminal do Expo (se estiver usando mobile)
3. ✅ Resultado da query SQL no NeonDB

Com esses logs eu consigo identificar exatamente onde está o problema!

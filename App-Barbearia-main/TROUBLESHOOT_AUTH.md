# 🔍 Troubleshooting - Autenticação OAuth

## Problema: Volta para tela de login após autorizar

### 📋 Checklist de Verificação

#### 1. Backend está rodando?
```bash
# Teste se o backend está respondendo
curl http://localhost:8001/api/health

# Deve retornar:
# {"status":"healthy",...}
```

#### 2. NeonDB está configurado?
```bash
# Verifique o arquivo backend/.env
# Deve ter uma linha como:
DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/dbname
```

### 🔍 Como Debugar

#### Ver Logs no Mobile (IMPORTANTE)

**No Expo (Terminal onde rodou `npx expo start`):**

1. Abra o app no celular/emulador
2. Tente fazer login
3. Volte para o terminal do Expo
4. Você verá os logs com 🔐 e ✅ mostrando o que aconteceu

**Exemplo de logs esperados:**
```
🔐 Iniciando login...
Redirect URL: https://seu-app.com/auth-callback
Auth URL: https://auth.emergentagent.com/?redirect=...
🔄 Resultado do OAuth: {type: "success", url: "..."}
✅ URL de retorno: https://seu-app.com/auth-callback#session_id=abc123
📝 Session ID do hash: abc123
✅ Session ID encontrado: abc123
📡 Chamando backend...
✅ Resposta do backend: {user: {...}, session_token: "..."}
✅ Login completado com sucesso!
```

**Se der erro, você verá:**
```
❌ Session ID não encontrado na URL
ou
❌ Erro no login: [detalhes do erro]
```

#### Ver Logs do Backend

**No terminal onde rodou uvicorn:**

```bash
# Você verá as requisições chegando
INFO: POST /api/auth/session?session_id=abc123
INFO: 200 OK
```

**Se der erro 500:**
```bash
# Veja os logs de erro
# Provavelmente é problema com o banco de dados
```

### 🐛 Problemas Comuns

#### 1. Session ID não está na URL

**Sintoma:** Log mostra "❌ Session ID não encontrado na URL"

**Causa:** O Emergent Auth não está retornando o session_id

**Solução:**
- Verifique se você está usando a conta Google correta
- Tente fazer logout do Google e logar novamente
- Verifique se a URL de redirect está correta

#### 2. Backend retorna 500

**Sintoma:** Log mostra erro ao chamar backend

**Causa:** Banco de dados não está configurado

**Solução:**
```bash
# 1. Configure o NeonDB no backend/.env
DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/db

# 2. Reinicie o backend
# Ctrl+C e rode novamente:
uvicorn server:app --reload --port 8001
```

#### 3. Backend retorna 401

**Sintoma:** "401 Unauthorized"

**Causa:** Session ID inválido ou expirado

**Solução:**
- Tente fazer login novamente
- Verifique se o session_id está sendo enviado corretamente

#### 4. Volta para login mas sem erro nos logs

**Sintoma:** Nenhum erro aparece, mas não faz login

**Causa:** O token não está sendo salvo no AsyncStorage

**Solução:** 
Adicione mais logs para ver se está salvando:

```typescript
// No AuthContext.tsx, adicione após AsyncStorage.setItem:
console.log('💾 Token salvo:', session_token);

// E no checkAuth, adicione:
const token = await AsyncStorage.getItem('session_token');
console.log('🔍 Token recuperado:', token ? 'Existe' : 'Não existe');
```

### 🧪 Teste Manual Completo

**Passo 1: Limpar dados**
```typescript
// No app, adicione um botão temporário para limpar:
import AsyncStorage from '@react-native-async-storage/async-storage';

const limparDados = async () => {
  await AsyncStorage.clear();
  console.log('✅ Dados limpos');
};
```

**Passo 2: Verificar backend**
```bash
# No navegador, teste manualmente:
http://localhost:8001/docs

# Vá em POST /api/auth/session
# Clique em "Try it out"
# Coloque um session_id qualquer (vai dar erro mas é só pra testar)
```

**Passo 3: Testar OAuth no navegador**
```bash
# Abra no navegador:
https://auth.emergentagent.com/?redirect=http://localhost:3001/callback

# Faça login
# Veja para onde redireciona
# Copie o session_id da URL
```

### 📱 Teste Específico para Mobile

Se estiver testando no **celular físico**:

1. **Verifique se o backend está acessível:**

   No celular, abra o navegador e acesse:
   ```
   http://SEU_IP:8001/api/health
   ```
   
   Se não carregar, o celular não consegue acessar o backend!

2. **Atualize o .env:**
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://SEU_IP:8001
   ```

3. **Reinicie o Expo:**
   ```bash
   # Ctrl+C e:
   npx expo start -c
   ```

### 🔧 Solução Alternativa Temporária

Se nada funcionar, teste com **autenticação mock** temporária:

```typescript
// No AuthContext.tsx, adicione:
const loginMock = async () => {
  const mockUser = {
    user_id: 'mock_user_1',
    email: 'teste@email.com',
    name: 'Usuário Teste',
    role: 'barber'
  };
  
  const mockToken = 'mock_token_123';
  
  await AsyncStorage.setItem('session_token', mockToken);
  global.authToken = mockToken;
  setUser(mockUser);
  
  console.log('✅ Login mock realizado');
};

// Use loginMock() em vez de login() para testar o resto do app
```

### ✅ Como Saber que Funcionou

Quando o login estiver funcionando, você verá:

1. **Nos logs do Expo:** ✅ Login completado com sucesso!
2. **No app:** Redirecionado para o Dashboard (tabs)
3. **No backend:** Logs mostrando POST /api/auth/session - 200 OK
4. **AsyncStorage:** Token salvo com sucesso

### 📞 Próximos Passos

1. **Rode o app e tente logar**
2. **Copie TODOS os logs que aparecem**
3. **Me envie os logs** para eu ver exatamente onde está falhando

Logs importantes:
- Terminal do Expo (onde tem os 🔐 ✅ ❌)
- Terminal do Backend (requisições HTTP)
- Qualquer erro que aparecer no app

Com os logs eu consigo identificar exatamente onde está o problema!

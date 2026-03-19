# 🚀 ATALHO RÁPIDO - Promover para Barbeiro

## Situação Atual

Você fez login mas não consegue:
- ❌ Virar barbeiro pelo botão
- ❌ Criar serviços

## ✅ Solução Rápida no Banco de Dados

### Passo 1: Acessar o NeonDB Console

1. Acesse: https://console.neon.tech
2. Faça login
3. Selecione seu projeto "neondb"
4. Clique em "SQL Editor" no menu lateral

### Passo 2: Ver seus Dados

Cole e execute este SQL:

```sql
-- Ver todos os usuários
SELECT user_id, email, name, role 
FROM users;
```

Você verá algo como:
```
user_id          | email            | name          | role
-----------------+------------------+---------------+--------
user_abc123      | seu@email.com    | Seu Nome      | client
```

### Passo 3: Promover para Barbeiro

Cole e execute este SQL (substitua pelo seu email):

```sql
-- Promover para barbeiro
UPDATE users 
SET role = 'barber' 
WHERE email = 'seu-email@gmail.com';
```

### Passo 4: Verificar

Execute novamente:

```sql
-- Confirmar a mudança
SELECT user_id, email, name, role 
FROM users 
WHERE email = 'seu-email@gmail.com';
```

Agora deve aparecer:
```
role
--------
barber
```

### Passo 5: Fazer Logout e Login no App

1. No app mobile, vá em "Perfil"
2. Clique em "Sair"
3. Faça login novamente
4. Agora você é barbeiro! ✅

---

## 🎯 Testar se Funcionou

Depois de fazer login novamente como barbeiro:

### Teste 1: Criar Serviço

1. Vá na aba "Serviços"
2. Clique em "Adicionar Serviço"
3. Preencha:
   - Nome: Corte de Cabelo
   - Descrição: Corte masculino
   - Preço: 50
   - Duração: 30
4. Salvar

Se funcionar, você verá o serviço na lista!

### Teste 2: Abrir Caixa

1. Vá na aba "Caixa"
2. Clique em "Abrir Caixa"
3. Informe saldo inicial: 0
4. Confirmar

Se funcionar, você verá "Caixa Aberto"!

---

## 🔍 Se Ainda Não Funcionar

### Verificar no Swagger

1. Abra: http://localhost:8001/docs
2. Vá em `GET /api/auth/me`
3. Clique "Try it out" e "Execute"

Deve retornar seus dados com `"role": "barber"`

### Logs para Debug

Quando tentar criar um serviço, veja os logs:

**No terminal do Expo:**
```
Deve aparecer a requisição sendo feita
```

**No terminal do Backend:**
```bash
sudo supervisorctl tail -f backend

# Deve ver:
INFO: POST /api/services - 201 Created
# Se ver 401 ou 403, ainda tem problema de auth
```

---

## 💡 Resumo das Soluções

| Problema | Solução Rápida |
|----------|---------------|
| Não é barbeiro | Atualizar no SQL do NeonDB |
| App usa preview | Atualizar frontend/.env com localhost |
| Botão não funciona | Promover direto no banco |
| Não cria serviço | Verificar se é barbeiro no /auth/me |

---

## 🎉 Depois que Promover

Você poderá:
- ✅ Criar, editar e deletar serviços
- ✅ Criar, editar e deletar produtos  
- ✅ Abrir e fechar caixa
- ✅ Ver e gerenciar agendamentos
- ✅ Confirmar e cancelar agendamentos
- ✅ Ver relatórios financeiros

---

**Me avise quando conseguir promover para barbeiro!** 🚀

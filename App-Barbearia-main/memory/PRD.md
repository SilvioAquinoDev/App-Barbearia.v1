# Barbershop Manager - PRD

## Problema Original
Aplicativo completo de gerenciamento de barbearia: mobile (Expo), web client (Vite), backend (FastAPI/PostgreSQL). Arquitetura SaaS multi-tenant.

## Implementado

### Sessao 22/04/2026 - Popup Primeiro Acesso + Setup Completo
- [x] **Popup primeiro acesso (barbeiro)**: Redireciona para `/barbershop-setup` com campos: telefone pessoal + nome/telefone/endereco da barbearia + upload logo
- [x] **Popup primeiro acesso (cliente)**: Redireciona para `/first-access-setup` com campos: telefone + data nascimento
- [x] `PUT /api/auth/update-profile` - endpoint para salvar telefone/nascimento do usuario
- [x] `GET /api/auth/me` agora retorna `barbershop_id`
- [x] `index.tsx` - logica de redirecionamento: sem barbershop -> setup barbershop, sem phone -> setup perfil
- [x] `_layout.tsx` - rotas `client-edit` e `first-access-setup` registradas

### Sessao 22/04/2026 - Frontend + Auth + Pix
- [x] Google OAuth direto (mobile + web)
- [x] Editar Cliente (mobile) - botao + tela /client-edit
- [x] Tela Pagamento Pix (web) - /pagamento-pix
- [x] Supabase Storage, Multi-tenant, Mercado Pago, Relatorios Financeiros
- [x] Config serverless (vercel.json, render.yaml)

### Sessoes Anteriores
- [x] Notificacoes Multi-Canal, SaaS, Dashboard, Gestao tab, Fidelidade, Caixa, Agendamento

## Testes
- Iteration 13: 19/19 (100%)
- Iteration 12: 26/26 (100%)

## Credenciais .env (usuario configura)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- MERCADOPAGO_TOKEN
- SUPABASE_URL, SUPABASE_SERVICE_KEY (configurados)

## Backlog
### P1
- Guia configuracao app mobile em dispositivo fisico
### P2
- Exportacao de dados/relatorios

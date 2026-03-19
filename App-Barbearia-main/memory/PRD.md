# Barbershop Manager - PRD

## Problema Original
Aplicativo completo de gerenciamento de barbearia com app mobile (React Native/Expo), web client (React/Vite) e backend (FastAPI/PostgreSQL).

## Personas
- **Barbeiro**: Gerencia agendamentos, produtos, caixa, clientes, notificacoes
- **Cliente**: Agenda servicos, acompanha fidelidade, recebe notificacoes

## Requisitos Core
1. Autenticacao via Google OAuth (Emergent Auth)
2. Gestao de servicos, produtos, agendamentos
3. Sistema de caixa registradora
4. Programa de fidelidade
5. Promocoes
6. Notificacoes Push (Expo) e WhatsApp (WaSenderAPI)
7. Gestao de clientes (CRM basico)
8. Agendamento publico (sem login)
9. Dark mode (web e mobile)

## Arquitetura
```
/app
├── backend/          # FastAPI + PostgreSQL (NeonDB)
│   ├── server.py
│   ├── models.py
│   ├── schemas.py
│   ├── notification_service.py  # Push + WhatsApp unificado
│   └── routes/
│       ├── auth_routes.py
│       ├── appointment_routes.py
│       ├── clients_routes.py     # CRM de clientes
│       ├── public_routes.py      # Booking sem auth
│       ├── whatsapp_routes.py    # WaSenderAPI
│       └── ...
├── frontend/         # Expo React Native (Mobile)
│   └── app/(tabs)/
│       ├── clients.tsx           # Tela de clientes
│       └── ...
└── web-client/       # React Vite (Web para clientes)
    └── src/pages/
        ├── Dashboard.jsx         # Popup perfil (phone + birth_date)
        └── ...
```

## O que foi Implementado

### Sessao Atual (18/03/2026)
- [x] **Fix critico**: Corrigido erro de sintaxe em appointment_routes.py (parentese extra)
- [x] **Backend - Endpoint de perfil expandido**: PUT /api/auth/update-phone agora aceita `phone` E `birth_date`
- [x] **Backend - Notificacoes no booking publico**: POST /api/public/book agora dispara notificacoes Push + WhatsApp
- [x] **Mobile - Tela de Clientes**: Nova aba "Clientes" com listagem, busca, e detalhes (nome, email, telefone, nascimento, total de atendimentos)
- [x] **Web - Popup de Perfil Completo**: Dashboard agora solicita telefone E data de nascimento quando faltam dados
- [x] **Web Client servido via Nginx**: Build da app Vite servida em porta 80

### Sessoes Anteriores
- [x] Dark mode completo (web)
- [x] Upload de imagem para produtos (mobile)
- [x] Popup de telefone no dashboard (web)
- [x] Historico e fidelidade com busca automatica por email/telefone (web)
- [x] Refatoracao do notification_service.py (Push + WhatsApp unificado)
- [x] Endpoints de clientes (clients_routes.py)
- [x] WaSenderAPI setup/connect/qrcode/status/disconnect endpoints
- [x] Programa de fidelidade completo
- [x] Sistema de promocoes
- [x] Caixa registradora
- [x] Relatorios financeiros
- [x] Sistema de agendamento publico e autenticado
- [x] Disponibilidade de horarios (barber_availability)
- [x] Tela "Configurar Servidor" no mobile

## Testes
- Backend: 23/23 testes passaram (iteration_9.json)
- Web Client: Popup de perfil validado visualmente
- Mobile: Tela de clientes criada e layout atualizado

## Backlog Priorizado

### P0 (Critico)
- Nenhum

### P1 (Alta Prioridade)
- Agendamento Online com Pagamento Pix
- Guiar usuario sobre "Configurar Servidor" no mobile
- Login no dispositivo fisico

### P2 (Media)
- Implementar Arquitetura SaaS (SAAS_CHANGES.md)
- Melhorar Relatorios Financeiros
- Corrigir botoes de Cancelar Agendamento e Logout

### P3 (Baixa)
- Lembretes automaticos de agendamento
- Exportacao de dados/relatorios

## Integracoes 3rd Party
- **WaSenderAPI**: WhatsApp messaging (requer API Key do usuario)
- **Expo Push**: Notificacoes push (integrado)
- **NeonDB**: PostgreSQL hospedado
- **Emergent Google Auth**: Login social

# Barbershop Manager - PRD

## Problema Original
Aplicativo completo de gerenciamento de barbearia com app mobile (React Native/Expo), web client (React/Vite) e backend (FastAPI/PostgreSQL). Arquitetura SaaS com suporte a multiplas barbearias.

## Personas
- **Barbeiro/Dono**: Gerencia agendamentos, produtos, caixa, clientes, notificacoes, barbearia
- **Cliente**: Agenda servicos, acompanha fidelidade, recebe notificacoes

## Arquitetura
```
/app
├── backend/          # FastAPI + PostgreSQL (NeonDB)
│   ├── server.py          # App principal + serve web-client em /api/web/
│   ├── models.py          # User (c/ web_push_subscription), Barbershop, Appointment, Service, etc.
│   ├── notification_service.py  # Dispatcher unificado: Web Push, Expo Push, Evolution API
│   ├── services/
│   │   └── reminder_scheduler.py  # Loop background a cada 5min
│   └── routes/
│       ├── web_push_routes.py     # VAPID + subscribe/unsubscribe
│       ├── evolution_routes.py    # Setup, status, create-instance, pairing-code
│       ├── barbershop_routes.py   # SaaS: CRUD barbearia + logo + public-info
│       ├── clients_routes.py      # CRM + aniversariantes
│       ├── appointment_routes.py  # CRUD + notificacoes em background
│       ├── public_routes.py       # Booking publico
│       └── ...
├── frontend/         # Expo React Native (Mobile)
│   └── app/
│       ├── barbershop-setup.tsx   # Onboarding primeira vez
│       ├── evolution-settings.tsx # Configuracao WhatsApp Evolution API
│       ├── login.tsx              # Com logo da barbearia
│       └── (tabs)/
│           ├── index.tsx          # Dashboard com aniversariantes + info barbearia
│           ├── management.tsx     # Gestao consolidada (c/ link Evolution settings)
│           ├── clients.tsx
│           └── profile.tsx
└── web-client/       # React Vite (Web para clientes) - servido em /api/web/
    ├── public/
    │   └── sw.js              # Service Worker para Web Push
    └── src/
        ├── services/
        │   ├── api.js         # Axios com base /api
        │   └── pushService.js # Subscription Web Push + VAPID
        └── pages/
            ├── Home.jsx       # Info publica da barbearia
            └── Dashboard.jsx  # Push notification init + profile popup
```

## Implementado

### Sessao Atual (13/04/2026)
- [x] **Sistema de Notificacoes Multi-Canal Completo**:
  - Web Push (VAPID) - Service Worker + subscribe/unsubscribe
  - Expo Push - Envio via Expo Push API para barbeiros
  - Evolution API (WhatsApp) - Tratamento gracioso quando nao configurada
- [x] **Bugs criticos corrigidos**:
  - `notification_service.py`: Referencia a `apt.barber_id` inexistente → consulta todos barbeiros por role
  - `Dashboard.jsx`: `initPushNotifications()` nao definida → adicionada funcao
  - `.env` carregado APOS imports → movido antes dos imports (VAPID keys vazias)
  - `_send_notifications_bg`: Sessao DB do request fechada → cria propria sessao
  - `_send_notifications_bg`: Parametro `action` faltando no create_appointment
  - Codigo duplicado `send_whatsapp` → unificado com `send_evolution_message`
  - `public_routes.py`: Background task com sessao do request → propria sessao
- [x] Web-client servido via FastAPI em `/api/web/` (Expo ocupa porta 3000)
- [x] Coluna `web_push_subscription` adicionada na tabela `users` (migration)
- [x] Rebuild do web-client com base path `/api/web/`

### Sessoes Anteriores (20/03/2026)
- [x] Modelo Barbershop SaaS (CRUD + logo upload + public-info)
- [x] Onboarding barbearia no primeiro login do barbeiro
- [x] Dashboard com aniversariantes do mes + botao WhatsApp (wa.me)
- [x] Tabs consolidadas: Gestao (Caixa, Produtos, Agenda, Fidelidade, Relatorios, Promocoes, WhatsApp)
- [x] Perfil da Barbearia: logo upload, telefone, endereco, modal de edicao
- [x] Login com logo e nome da barbearia
- [x] Web Home e Dashboard com info da barbearia
- [x] Bug fixes criticos: crash removeNotificationSubscription, race condition interceptor 401
- [x] Tela de Clientes (mobile) com busca
- [x] Popup de perfil (phone + birth_date) no web
- [x] Dark mode, upload de imagem de produtos
- [x] WaSenderAPI endpoints (substituido por Evolution API)
- [x] Programa de fidelidade, promocoes, caixa registradora
- [x] Relatorios financeiros
- [x] Sistema de agendamento publico e autenticado

## Testes
- Backend iteration 11: 19/19 (100%) - Notificacoes, Web Push, Evolution API, Web-client
- Backend iteration 9-10: 100% (sessoes anteriores)

## Backlog

### P1
- Agendamento Online com Pagamento Pix
- Guiar usuario sobre "Configurar Servidor" no mobile

### P2
- Isolamento multi-tenant completo (barbershop_id em todas as tabelas)
- Melhorar Relatorios Financeiros (receita mensal, ticket medio, top servicos)
- Corrigir botoes "Cancelar Agendamento" e "Logout"

### P3
- Lembretes automaticos de agendamento (scheduler implementado, precisa testar c/ dados reais)
- Exportacao de dados/relatorios

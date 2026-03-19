# AgendaPro - Roadmap para SaaS

## Mudancas Necessarias para Transformar em SaaS

### 1. Multi-tenancy (CRITICO - Prioridade Maxima)
**O que e**: Cada barbearia/salao tem seus dados isolados no mesmo sistema.

**Mudancas no Banco de Dados:**
- Adicionar tabela `tenants` (id, nome, slug, logo, plano, status, created_at)
- Adicionar coluna `tenant_id` em TODAS as tabelas existentes:
  - appointments, services, products, cash_register, schedule, etc.
- Criar indice composto em todas as queries (tenant_id + filtros)
- Cada barbearia acessa apenas seus proprios dados

**Mudancas no Backend:**
- Middleware de identificacao do tenant (via subdominio ou token)
- Todas as queries filtram por `tenant_id` automaticamente
- Isolamento completo de dados entre tenants

**Estimativa**: 2-3 semanas de desenvolvimento

---

### 2. Sistema de Planos e Pagamentos (CRITICO)
**O que e**: Cobranca recorrente mensal via Stripe/Pix.

**Planos Sugeridos:**

| Plano | Preco | Recursos |
|-------|-------|----------|
| **Basico** | R$ 49/mes | 1 profissional, agendamentos ilimitados, caixa |
| **Profissional** | R$ 99/mes | 3 profissionais, fidelidade, relatorios, WhatsApp |
| **Premium** | R$ 199/mes | Ilimitado, Pix online, marca propria, suporte prioritario |

**Mudancas necessarias:**
- Integracao Stripe para cobranca recorrente
- Tabelas: `subscriptions`, `invoices`, `plans`
- Feature gating: limitar funcionalidades por plano
- Trial gratuito de 14 dias
- Dashboard de billing para o cliente

**Para venda unica:**
- Preco sugerido: R$ 1.500 - R$ 5.000 (dependendo do pacote)
- Inclui instalacao + 3 meses de suporte
- Sem atualizacoes futuras (a menos que pague manutencao)

**Estimativa**: 2-3 semanas

---

### 3. Registro e Onboarding (CRITICO)
**O que e**: Fluxo para novas barbearias se cadastrarem.

**Fluxo:**
1. Dono acessa site > Escolhe plano > Preenche dados da barbearia
2. Cria conta (Google ou email/senha)
3. Wizard de configuracao: servicos, horarios, profissionais
4. Recebe link publico de agendamento (ex: agendapro.com.br/suabarbearia)
5. Baixa o app mobile

**Mudancas:**
- Tela de registro com dados da empresa
- Wizard de onboarding (3-4 passos)
- Geracao automatica de slug/URL publica
- Email de boas-vindas

**Estimativa**: 1-2 semanas

---

### 4. Gestao de Equipe (IMPORTANTE)
**O que e**: Multiplos profissionais por estabelecimento.

**Mudancas:**
- Tabela `team_members` (id, tenant_id, user_id, role, specialties)
- Roles: owner (dono), barber (profissional), receptionist (recepcionista)
- Agendamentos vinculados a profissional especifico
- Agenda individual por profissional
- Cliente escolhe o profissional ao agendar

**Estimativa**: 2 semanas

---

### 5. Pagina Publica por Tenant (IMPORTANTE)
**O que e**: Cada barbearia tem sua propria pagina de agendamento.

**Formato:**
- `agendapro.com.br/barbearia-do-joao`
- Ou subdominio: `joao.agendapro.com.br`
- Mostra servicos, horarios, precos, fotos
- Agendamento online direto

**Mudancas:**
- Roteamento por slug no web-client
- Carregar dados do tenant dinamicamente
- Personalizacao visual (logo, cores, banner)

**Estimativa**: 1 semana

---

### 6. Painel Administrativo (IMPORTANTE)
**O que e**: Dashboard para voce gerenciar todos os clientes SaaS.

**Funcionalidades:**
- Lista de todos os tenants (barbearias)
- Metricas: MRR, churn, novos cadastros
- Gerenciar planos e assinaturas
- Suporte: acessar dados de um tenant
- Enviar comunicados/atualizacoes

**Estimativa**: 2 semanas

---

### 7. Infraestrutura de Producao (NECESSARIO)
**Mudancas:**
- Servidor dedicado ou VPS (DigitalOcean, AWS, Hetzner)
- Banco de dados robusto (RDS ou managed PostgreSQL)
- Redis para cache e sessoes
- Storage de arquivos (S3 para fotos)
- CDN para assets estaticos
- Monitoramento (Sentry, Datadog)
- Backups automaticos
- CI/CD pipeline

**Custo mensal estimado:**
- Servidor: R$ 50-200/mes
- Banco de dados: R$ 50-100/mes
- Storage: R$ 10-30/mes
- Dominio + SSL: R$ 40/ano
- **Total: ~R$ 150-350/mes**

---

### 8. Marketing e Vendas
- Dominio proprio (agendapro.com.br)
- Landing page profissional (ja criada!)
- SEO otimizado
- Google Ads / Meta Ads
- Parceria com distribuidores de produtos de barbearia
- Programa de indicacao (desconto para quem indica)

---

## Cronograma Estimado

| Fase | Duracao | Descricao |
|------|---------|-----------|
| **Fase 1** | 3-4 semanas | Multi-tenancy + Registro + Planos |
| **Fase 2** | 2-3 semanas | Pagamentos + Equipe + Pagina publica |
| **Fase 3** | 2 semanas | Admin panel + Infraestrutura |
| **Fase 4** | 1-2 semanas | Testes + Lancamento beta |
| **Total** | ~8-11 semanas | MVP SaaS pronto |

---

## Modelo de Receita Projetado

**Cenario conservador (12 meses):**
- Mes 1-3: 10 clientes x R$ 79 medio = R$ 790/mes
- Mes 4-6: 30 clientes x R$ 79 = R$ 2.370/mes
- Mes 7-12: 80 clientes x R$ 79 = R$ 6.320/mes
- **Receita anual estimada: ~R$ 45.000**

**Cenario otimista (12 meses):**
- 200+ clientes ao final do ano
- **Receita anual: ~R$ 150.000+**

**Para venda unica:**
- 10 vendas x R$ 3.000 = R$ 30.000
- Manutencao mensal opcional: R$ 200/mes por cliente

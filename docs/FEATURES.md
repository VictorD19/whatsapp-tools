# WhatsApp Sales Platform — Feature Roadmap

> Plataforma focada em vendas via WhatsApp com IA, CRM e automação.

---

## MVP — Lançamento (v1.0)

> Foco: entregar valor imediato nas 5 funcionalidades core de vendas.

### 1. Disparo em Massa
- Envio de mensagens para listas de contatos
- Suporte a texto, imagem, vídeo, documento e áudio
- Templates reutilizáveis de mensagens
- Personalização por variável (ex: {{nome}}, {{empresa}})
- Controle de intervalo entre mensagens (anti-ban)
- Relatório básico: enviados / entregues / falhas

### 2. Menções em Grupos
- Listar grupos vinculados ao número conectado
- Extrair membros de grupos
- Enviar mensagens mencionando @todos ou @específicos
- Agendamento de menções em grupos

### 3. Assistentes Virtuais (IA)
- Criação de assistentes por fluxo (SDR, atendimento, agendamento)
- Integração com LLM (ex: Claude, OpenAI)
- Respostas automáticas baseadas em contexto
- Transferência para atendente humano quando necessário
- Configuração de personalidade, tom e instruções do assistente
- Histórico de conversa como contexto para a IA

### 4. Atendimento por Chat (Inbox)
- Inbox centralizado de conversas
- Multi-atendente (vários agentes por conta)
- Transferência de conversa entre agentes
- Status da conversa: Aberta / Em atendimento / Resolvida
- Respostas rápidas (atalhos de texto)
- Notificação de nova mensagem em tempo real
- Responder/citar mensagens (reply/quote) — envio e recebimento
- Atualização automática de tabs e contadores via WebSocket (assumir, encerrar, nova conversa)

### 5. CRM
- Cadastro e gestão de contatos
- Tags e segmentação de contatos
- Histórico completo de conversas por contato
- Funil de vendas em Kanban (etapas customizáveis)
- Notas e anotações por contato
- Visualização de timeline do contato

### 6. Notificações em Tempo Real
- Central de notificações in-app com histórico completo (`/notifications`)
- Sino de notificações na topbar com contador de não lidas e dropdown
- Entrega em tempo real via WebSocket (sala `user:{userId}`)
- Processamento assíncrono via fila BullMQ (tolerante a falhas)
- Browser Notification API — push nativo quando a tab não está em foco
- Preferências por tipo de notificação (in-app e browser) em `/settings/notifications`
- Tipos cobertos: `NEW_MESSAGE`, `CONVERSATION_ASSIGNED`, `CONVERSATION_TRANSFERRED`, `CONVERSATIONS_IMPORTED`, `INSTANCE_CONNECTED`, `INSTANCE_DISCONNECTED`, `INSTANCE_BANNED`, `DEAL_WON`, `DEAL_LOST`, `DEAL_ASSIGNED`, `GROUP_EXTRACTION_COMPLETED`
- Integrações ativas: Inbox, Instances, Deal, Groups

---

## Fase 2 — Crescimento (v1.5)

### Contatos & Listas
- Importação de contatos via CSV/Excel
- Extração de contatos de grupos WhatsApp
- Deduplicação automática de contatos
- Blacklist / Opt-out (gerenciar descadastros)
- Listas segmentadas por tag, funil ou campanha

### Agendamento de Mensagens
- Agendar disparo por data e hora
- Programar mensagens individuais ou em massa
- Calendário visual de campanhas agendadas
- Fuso horário por conta/cliente

### Sequências & Follow-up Automático
- Criar sequências de mensagens (dia 1, 3, 7)
- Condições de parada (ex: se respondeu, parar sequência)
- Gatilhos por evento (respondeu, não respondeu, clicou em link)

---

## Fase 3 — Escala (v2.0)

### Gestão de Números & Anti-ban
- Múltiplos números por conta
- Warm-up automático de novos chips (aquecimento gradual)
- Monitor de saúde do número (detectar aviso de ban)
- Rotação de números em campanhas (balanceamento)

### Analytics & Relatórios
- Dashboard de campanhas (enviados, lidos, respondidos, convertidos)
- Taxa de conversão por campanha e por funil
- Relatório de atendimento (tempo médio de resposta, tickets)
- Relatório de performance por atendente
- Exportação de relatórios (CSV, PDF)

### Gestão de Equipe & Controle de Acesso
- Múltiplos usuários por conta
- Perfis: Admin, Supervisor, Agente
- Restrição de acesso por módulo
- Auditoria de ações (log de atividades)

---

## Fase 4 — Ecossistema (v2.5+)

### Integrações
- API pública REST com autenticação por token
- Webhooks configuráveis por evento
- Integração com Google Calendar (agendamentos)
- Integração com Google Sheets (sincronizar listas)
- Conector n8n / Zapier / Make
- Integração com e-commerce (pedidos, status)

### Construtor de Fluxo Visual
- Editor drag-and-drop de chatbots
- Blocos: mensagem, pergunta, condição, ação, IA, webhook
- Templates de fluxo prontos (SDR, suporte, agendamento)
- Teste de fluxo em tempo real

### Extras para Vendas
- Catálogo de produtos no WhatsApp
- Link de pagamento direto na conversa
- Integração com WhatsApp Pay
- Formulários de captura de lead via link

---

## Plataforma (todas as fases)

- Multi-tenant (múltiplos clientes/empresas)
- Multi-idioma: Português, English, Español
- Interface responsiva (desktop e mobile)
- Onboarding guiado para novos usuários
- Planos e billing (Freemium, Pro, Enterprise)

---

## Stack Técnica (referência)

| Camada | Tecnologia |
|---|---|
| WhatsApp Engine | Evolution API (Baileys) |
| Backend API | Node.js + Fastify ou NestJS |
| Banco de dados | PostgreSQL + Redis |
| IA / LLM | Claude API (Anthropic) |
| Filas | BullMQ (Redis) |
| Frontend | Next.js + TailwindCSS |
| Realtime | Socket.io |
| Infra | Docker + Docker Compose |
| Auth | JWT + RBAC |

---

## Fases resumidas

```
v1.0  MVP         → Disparos, Menções, IA, Chat, CRM
v1.5  Crescimento → Contatos, Agendamento, Follow-up
v2.0  Escala      → Multi-número, Analytics, Equipe
v2.5+ Ecossistema → Integrações, Fluxo visual, Extras
```

---

*Atualizado em: 2026-03-03*

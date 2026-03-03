# RULE: Protocolo obrigatório antes de implementar qualquer funcionalidade

Toda vez que for solicitada a implementação de qualquer funcionalidade — nova ou existente —
executar os passos abaixo na ordem, sem exceção. Não iniciar código antes de completar a análise.

---

## Passo 1 — Análise prévia (responder explicitamente antes de codar)

1. **Feature mapeada?** — Está no `FEATURES.md`? Em qual fase/versão?
2. **Módulo responsável?** — Qual módulo cuida disso? Já existe ou precisa criar?
3. **Banco de dados?** — Quais tabelas criar/alterar? Precisam de `tenantId` + índices?
4. **Fila necessária?** — A operação é async, pode falhar ou precisa de rate limit?
5. **Erros possíveis?** — Quais novos códigos registrar em `error-codes.ts`?
6. **WebSocket?** — O frontend precisa ser notificado em tempo real?
7. **Impacto multi-tenant?** — Há risco de dados vazarem entre tenants?

---

## Passo 2 — Checklist de conformidade (validar antes de finalizar)

- [ ] Módulo expõe apenas o `service` — nunca o `repository` para fora
- [ ] Todos os endpoints cobertos pelo `TenantGuard` (ou `@Public()` intencional)
- [ ] Todo `findMany/findFirst` filtra por `tenantId`
- [ ] Novos códigos de erro registrados em `error-codes.ts`
- [ ] Resposta segue envelope padrão `{ data, meta }` ou `{ error }`
- [ ] DTOs validados com Zod
- [ ] Operações longas/falháveis delegadas para fila BullMQ
- [ ] Teste unitário no `service` cobrindo fluxo principal
- [ ] Variáveis de ambiente novas documentadas no `.env.example`
- [ ] Migration com nome descritivo (`YYYYMMDD_descricao`)

---

## Passo 3 — Estrutura de arquivos esperada

Todo módulo novo deve seguir:

```
modules/nome/
├── nome.module.ts
├── nome.controller.ts
├── nome.service.ts
├── nome.repository.ts
├── dto/
├── entities/
├── queues/        ← apenas se usar fila
└── __tests__/
```

---

## Passo 4 — Schema Prisma base obrigatório

Toda tabela nova de negócio começa com:

```prisma
model Nome {
  id        String    @id @default(cuid())
  tenantId  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  tenant    Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

# RULE: Protocolo obrigatório antes de implementar qualquer funcionalidade

Toda vez que for solicitada a implementação de qualquer funcionalidade — nova ou existente —
executar os passos abaixo na ordem, sem exceção. Não iniciar código antes de completar a análise.

---

## Passo 0 — Issue obrigatória no GitHub

**Toda feature deve estar vinculada a uma issue antes de qualquer código ser escrito.**

1. Verificar se já existe uma issue relacionada no repositório (`gh issue list`)
2. Se não existir, criar antes de começar:

```bash
gh issue create \
  --title "feat: <título descritivo da feature>" \
  --body "## Descrição\n<o que será implementado e por quê>\n\n## Critérios de aceite\n- [ ] <critério 1>\n- [ ] <critério 2>" \
  --label "enhancement"
```

3. Registrar o número da issue e referenciá-la no commit (`closes #<número>`)

> **Nunca iniciar implementação sem issue.** Se a demanda chegou informalmente (mensagem, conversa),
> criar a issue primeiro — mesmo que seja simples — para manter rastreabilidade.

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
- [ ] Teste unitário no `service` cobrindo fluxo principal e cenários de erro
- [ ] Testes seguem o padrão existente (`*.service.spec.ts` em `__tests__/`)
- [ ] Mocks de dependências (repository, serviços externos, gateways)
- [ ] Cobertura mínima: happy path + validações + error cases de cada método público
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

## Passo 4 — Testes obrigatórios

Todo módulo DEVE ter testes unitários no service. Seguir o padrão de `inbox.service.spec.ts`:

```
modules/nome/__tests__/
└── nome.service.spec.ts
```

### Estrutura do teste
```typescript
describe('NomeService', () => {
  let service: NomeService
  let repository: jest.Mocked<NomeRepository>
  // ... outros mocks

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NomeService,
        { provide: NomeRepository, useValue: createMock<NomeRepository>() },
      ],
    }).compile()
    service = module.get(NomeService)
    repository = module.get(NomeRepository)
  })

  describe('metodoPublico', () => {
    it('deve retornar resultado esperado no happy path', () => {})
    it('deve lançar erro quando input inválido', () => {})
    it('deve lançar erro quando recurso não encontrado', () => {})
  })
})
```

### Cobertura mínima exigida
- ✅ Happy path de cada método público do service
- ✅ Cenários de erro (not found, duplicado, permissão)
- ✅ Validações de negócio (ex: último admin, deal já fechado)
- ✅ Edge cases relevantes (ex: soft delete, filtros por tenant)
- ❌ NÃO testar controller (testado via e2e)
- ❌ NÃO testar repository (acesso direto ao Prisma)

### Rodar testes
```bash
pnpm --filter @repo/api test              # todos os testes
pnpm --filter @repo/api test -- --coverage # com coverage
pnpm --filter @repo/api test -- nome.service  # teste específico
```

---

## Passo 5 — Schema Prisma base obrigatório

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

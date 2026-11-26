# Studio Flávia Prudêncio · Fisioterapia e Pilates

Sistema web do studio: site público com planos e pré-matrícula, portal do aluno (anamnese, cancelamento, reposição) e painel da recepção e da proprietária (grade diária, faltas, alunos, financeiro, funcionários, relatórios).

## Tecnologias

- Next.js 15 (App Router, React 19): telas e ações no servidor no mesmo projeto
- PostgreSQL com Drizzle ORM: Neon em produção (`DATABASE_URL`) e PGlite embutido em desenvolvimento e nos testes
- Autenticação: senhas com bcrypt e sessão em cookie assinado (JWT, `jose`), com o perfil conferido no servidor em cada página e ação
- Testes: Vitest (regras de negócio) e Playwright (ponta a ponta no navegador)

## Rodar localmente

```bash
npm install
cp .env.example .env.local      # preencha SESSION_SECRET
npm run seed                    # cria planos, horários e usuários de exemplo
npm run dev                     # http://localhost:3000
```

Sem `DATABASE_URL`, os dados ficam em `.data/pglite` e persistem entre reinícios.

Usuários criados pelo seed (senha inicial `studio2026`, ou o valor de `SEED_SENHA`):

| Perfil | E-mail |
|---|---|
| Proprietária | flavia@studio.local |
| Recepção | recepcao@studio.local |
| Aluna com anamnese | ana@studio.local |
| Aluno sem anamnese | bruno@studio.local |

## Testes

```bash
npm test            # regras de negócio RN01 a RN05, com os limites de 59, 60 e 61 minutos
npm run test:e2e    # navegador: requer o servidor rodando com o banco recém-populado (ver o cabeçalho do arquivo)
```

## Regras de negócio (em `src/lib/servicos.ts`)

| Regra | Como é garantida |
|---|---|
| RN01 | No máximo 4 alunos por horário: a contagem é feita no servidor, dentro de uma transação |
| RN02 | Cancelamento com menos de 60 min exige atestado: a antecedência é calculada pelo horário da aula e pelo relógio do servidor |
| RN03 | Presença por exceção: a recepção registra só as faltas, que aparecem no portal do aluno |
| RN04 | Reposição só com vaga: a aula é travada (`SELECT … FOR UPDATE`) para duas reservas não ocuparem a mesma última vaga |
| RN05 | Sem anamnese, o servidor recusa matrícula em horário e reposição |

## Publicação (Vercel + Neon)

1. Crie um banco no Neon e copie a URL de conexão.
2. Na Vercel, importe o repositório e defina `DATABASE_URL`, `SESSION_SECRET` e `NEXT_PUBLIC_WHATSAPP`.
3. As migrações rodam sozinhas na primeira conexão. Para popular, rode `npm run seed` localmente com a `DATABASE_URL` do Neon.

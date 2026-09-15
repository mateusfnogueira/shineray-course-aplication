---
name: readme
description: Gera ou atualiza README.md completo em português brasileiro para o monorepo MareApp ou para um app específico
type: skill
---

# Gerador de README — MareApp

Gere um README.md completo em **português brasileiro** para este repositório ou app. Analise os arquivos de código-fonte, a documentação em `mare_app_docs/` e os arquivos `.env.example` e `package.json` do app alvo antes de escrever qualquer linha. Nunca suponha versões ou configurações — leia os arquivos reais. Não traduza nomes de arquivos, variáveis de ambiente, comandos de terminal nem nomes de pacotes.

## Passos de análise obrigatórios

1. Leia os arquivos de contexto:
   - `mare_app_docs/context/project-overview.md` — visão geral do produto
   - `mare_app_docs/infra/tech-stack.md` — stack tecnológica com versões
   - `mare_app_docs/context/business-rules.md` — regras de negócio
   - `mare_app_docs/context/user-flows.md` — fluxos de usuário
2. Para o app alvo, leia:
   - `package.json` — versões exatas das dependências e scripts disponíveis
   - `.env.example` — todas as variáveis de ambiente
3. Para a API, leia os controllers para mapear endpoints reais.
4. Para o worker, leia `src/main.ts` para listar as filas registradas.

---

## Seções obrigatórias do README

### 1. Nome e Descrição do Projeto
- Nome do projeto/app e propósito principal
- Descrição do que faz e para quem serve
- Contexto dentro do monorepo MareApp

### 2. Stack Tecnológica
- Liste tecnologias, linguagens e frameworks com versões reais (do `package.json`)
- Para o monorepo raiz: tabela App → Framework → Versão → Porta

### 3. Arquitetura do Projeto
- Diagrama ASCII das comunicações entre os serviços
- Fontes de dados, filas e CDN envolvidos

### 4. Como Começar
- Pré-requisitos com versões exatas (Node.js, pnpm — do `engines` no `package.json` raiz)
- Instalação passo a passo com comandos copiáveis
- Configuração de `.env` a partir do `.env.example`
- Como subir a infraestrutura: `docker compose up -d` (raiz do monorepo)
- Migrações (`prisma migrate deploy`) e seed quando aplicável
- Como fazer o primeiro acesso para validar o setup

### 5. Estrutura de Pastas
- Árvore de diretórios em bloco de código
- Propósito de cada pasta/arquivo principal

### 6. Contratos e Payloads (Dados de Saída do Serviço)
- Tabela de endpoints: Método | Path | Autenticação | Descrição
- Estrutura dos eventos SSE (nome do evento, formato do payload JSON)
- Estrutura do JSON publicado no CDN (`menus/{accountId}/current.json`)
- DTOs de request/response principais

### 7. Pontos de Integração
- Como este app se comunica com os demais serviços
- Filas BullMQ: nome da fila, quem produz, quem consome, frequência
- Eventos SSE: quem emite e quem escuta
- CDN: path de upload, cache-control, quem consome
- Webhooks externos quando aplicável

### 8. Funcionalidades Principais
- Lista das features do app
- Fluxos de usuário passo a passo quando relevante
- Regras de negócio críticas

### 9. Fluxo de Desenvolvimento
- Como executar em modo dev (comando exato do `package.json`)
- Como buildar para produção
- Processos que precisam rodar simultaneamente em dev
- Alerta sobre o worker ser processo separado quando necessário

### 10. Padrões de Código
- Convenções do projeto
- Regras críticas: multi-tenant por `account_id`, validação no NestJS, audit log append-only
- Formato de commits (conventional commits)
- Tipagem compartilhada via `@mareapp/types`

### 11. Testes
- Testes unitários: comando exato
- Testes de integração: comando exato + pré-requisitos (banco PostgreSQL real, sem mocks de DB)
- Variáveis necessárias para rodar os testes

---

## Regras absolutas

- **Nunca suponha versões** — leia o `package.json` antes de escrever qualquer número de versão
- Todo o conteúdo em **português brasileiro**
- Não traduzir: nomes de arquivos, variáveis de ambiente, comandos shell, nomes de pacotes npm, termos técnicos (JWT, SSE, CDN, ORM, DTO, CI/CD, etc.)
- Usar tabelas para listas de configuração e endpoints
- Usar blocos de código com linguagem (`bash`, `json`, `typescript`)
- Conteúdo técnico e detalhado — o README é para desenvolvedores, não para usuários finais
- Incluir comandos prontos para copiar e colar

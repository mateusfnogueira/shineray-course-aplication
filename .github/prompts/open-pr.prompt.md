---
mode: 'agent'
description: 'Preparar e abrir um pull request para a branch atual'
---

Preparar e abrir um pull request para a branch atual.

## Passos

1. Executar `git diff main...HEAD` para revisar todas as mudanças
2. Verificar se todos os arquivos alterados seguem as convenções do projeto
3. Confirmar que nenhum secret ou arquivo `.env` está staged
4. Escrever o título do PR seguindo o formato conventional commits
5. Escrever o corpo do PR com:
   - **O quê**: o que foi alterado e por quê
   - **Como testar**: passos para verificar a feature ou correção
   - **Checklist**: migrations executadas, testes passando, filtro account_id verificado
6. Executar `gh pr create` com o título e corpo

## Template do corpo do PR

```
## O quê
<descreva a mudança>

## Por quê
<motivação ou issue vinculada>

## Como testar
1. ...
2. ...

## Checklist
- [ ] Testes passando (`npx turbo test`)
- [ ] Nenhum secret commitado
- [ ] Filtro `account_id` verificado nas novas queries
- [ ] Migration criada se o schema foi alterado
```

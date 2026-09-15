# /trim

Revisar e limpar o arquivo atual ou seleção por qualidade e simplicidade.

## Passos

1. Ler o arquivo alvo
2. Identificar:
   - Código morto ou variáveis não utilizadas
   - Lógica duplicada que poderia ser extraída
   - Over-engineering ou abstrações desnecessárias
   - `account_id` scope guards ausentes
   - Tipos `any` que podem ser substituídos
3. Aplicar mudanças mínimas e focadas — não refatorar além do necessário
4. Não adicionar comentários em código que é auto-evidente

## Restrições
- Não alterar comportamento — apenas estrutura e clareza
- Manter as mudanças mínimas e revisáveis
- Preferir editar código existente a criar novas abstrações

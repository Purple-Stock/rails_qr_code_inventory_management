# Guia para Agentes e Contribuidores

Este documento orienta como trabalhar neste repositório (humano ou agente).
Seja conciso, faça mudanças focadas e valide antes de abrir PR.

## Estilo de commit
- Uma única linha, imperativa e curta, sem ponto final.
- Exemplos: `Atualiza AGENTS.md com checklist` · `Corrige validação de item`

## Checklist rápido antes do PR
1. Escopo pequeno e focado (sem mudanças não relacionadas).
2. Código e docs alinhados ao padrão do projeto (Rubocop).
3. Segurança verificada (Brakeman) e dependências auditadas (Importmap).
4. Banco de testes preparado e suite executada.
5. PR com resumo, citações de arquivos e seção de Testes.

## Comandos de verificação
Execute localmente na raiz do projeto:
1. `bin/rubocop` — lint/estilo Ruby
2. `bin/brakeman --no-pager` — verificação de segurança Rails
3. `bin/importmap audit` — auditoria de importmap
4. `bin/rails db:test:prepare` — prepara banco de teste
5. `bin/rails test` — executa a suíte de testes

Observações:
- Se algo falhar por falta de dependências (Ruby, gems, DB, etc.), documente na seção “Testes” do PR.
- Para corrigir estilo automaticamente: `bin/rubocop -A` (use com critério, evite mudanças massivas não relacionadas).
- Para rodar um teste específico: `bin/rails test TEST=path/do_teste.rb`.

## Fluxo de trabalho sugerido
- Pequenos PRs atômicos: uma mudança por PR facilita revisão e reversão.
- Cite trechos relevantes: referencie caminhos de arquivos e, quando útil, números de linha.
- Não altere lockfiles ou configs a menos que necessários e justificados.
- Mantenha mensagens de erro, decisões e trade-offs registradas no PR.

## Template de PR

Título: uma linha imperativa curta

Resumo
- O que foi alterado e por quê, em 2–4 frases.

Mudanças Notáveis (com citações)
- `app/models/...`: descrição sucinta do impacto
- `app/controllers/...`: descrição sucinta do impacto

Testes
- Resultado dos comandos:
  - `bin/rubocop`: OK/erros (resumo)
  - `bin/brakeman --no-pager`: OK/avisos (resumo)
  - `bin/importmap audit`: OK/erros (resumo)
  - `bin/rails db:test:prepare`: OK/erros (resumo)
  - `bin/rails test`: OK/quantidade de testes (resumo)
- Se não foi possível rodar localmente, explique claramente a limitação (ex.: “Ambiente sem Ruby/gems/DB”).

Riscos e Mitigações
- Pontos de risco (ex.: migrações, performance) e plano de rollback.

Notas
- Contexto adicional, decisões e referências.

## Dicas de ambiente
- Inicialização local: `bin/setup` e, para desenvolvimento, `bin/dev`.
- Este projeto usa Rails + PostgreSQL; garanta que o DB esteja acessível e variáveis de ambiente configuradas.
- Para entender o domínio/BD, consulte `schema_llm.md` e o `README.md`.

## Quando algo falhar
- Não force mudanças grandes para “fazer passar”. Prefira abrir uma issue ou detalhar a limitação no PR.
- Documente mensagens de erro e passos tentados. Transparência acelera a revisão.

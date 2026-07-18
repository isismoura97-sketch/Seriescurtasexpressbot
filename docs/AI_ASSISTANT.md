# Express IA

## Objetivo

A Express IA é uma camada opcional para tarefas editoriais e descoberta de séries. Ela não participa de autenticação, pagamentos, publicação, concessão de acesso ou entrega de conteúdo.

## Arquitetura

```text
Mini App / painel da proprietária
  -> API interna da Edge Function
  -> validação de identidade e permissão
  -> sanitização e minimização do contexto
  -> serviço de IA e cache backend
  -> adapter OpenAI
  -> validação estruturada da resposta
  -> revisão humana ou consulta ao catálogo real
```

Os módulos ficam em `supabase/functions/bot-unificado/ai/`. Os prompts são centralizados e versionados em `ai/prompts.ts`. O frontend nunca chama o provedor diretamente.

## Funcionalidades da primeira versão

- sugestões de SEO, sinopse curta, sinopse completa e título alternativo;
- sugestões limitadas de tags e categorias;
- textos para Telegram, compartilhamento e chamada promocional;
- revisão ortográfica e variações editoriais;
- comparação antes/depois, aplicação manual, cópia de textos avulsos, descarte e restauração local;
- busca conversacional opcional sobre séries reais e publicadas;
- painel de flags, modelo, limites e consumo estimado.

Atendimento automatizado e streaming possuem flags reservadas, mas não foram ativados. Respostas curtas usam uma chamada completa porque streaming aumentaria complexidade sem benefício proporcional nesta fase.

## Segurança e privacidade

- `AI_API_KEY` existe somente nos segredos da Edge Function.
- O modelo não acessa o Supabase diretamente.
- O contexto usa lista explícita de campos editoriais permitidos.
- Senhas, tokens, e-mails de clientes, dados financeiros e referências privadas de mídia não são enviados.
- Títulos, sinopses e perguntas são tratados como dados não confiáveis.
- A saída usa JSON Schema e passa por validação no backend.
- SQL, comandos, preços, permissões e estados de pagamento nunca vêm da resposta do modelo.
- Logs guardam tarefa, modelo, tokens, latência, custo estimado, status e hash; não guardam prompt ou resposta integral.
- A busca registra somente tamanho da consulta, quantidade de resultados e modo de execução.

## Feature flags

Todas começam como `false`:

```env
AI_ENABLED=false
AI_EDITORIAL_ENABLED=false
AI_SEARCH_ENABLED=false
AI_SUPPORT_ENABLED=false
AI_STREAMING_ENABLED=false
```

As flags persistidas em `ai_settings` podem ser controladas pelo painel. Variáveis de ambiente, quando definidas, têm precedência e funcionam como bloqueio ou liberação operacional.

## Configuração

Variáveis principais:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-5.6-luna
AI_API_KEY=
AI_DAILY_REQUEST_LIMIT_PER_USER=10
AI_DAILY_REQUEST_LIMIT_PER_ADMIN=100
AI_MONTHLY_BUDGET_CENTS=
AI_MAX_INPUT_CHARACTERS=8000
AI_MAX_OUTPUT_TOKENS=1200
AI_REQUEST_TIMEOUT=25000
```

Para configurar a chave sem colocá-la no Git:

```bash
supabase secrets set AI_API_KEY=valor_da_chave --project-ref uyyeascxvnrkjtlygdoe
```

Não ative `AI_ENABLED` antes de configurar orçamento, preço estimado por milhão de tokens e monitoramento. O backend recusa a ativação pelo painel sem orçamento mensal e, quando existe uma chave externa, sem as duas tarifas de tokens. Os custos só são estimados quando `AI_INPUT_COST_PER_MILLION_CENTS` e `AI_OUTPUT_COST_PER_MILLION_CENTS` estão configurados com os valores atuais do provedor.

## Banco de dados

A migração `20260718020241_add_ai_assistant_foundation.sql` cria:

- `ai_settings`: identidade, flags e limites;
- `ai_usage_logs`: telemetria mínima de uso;
- `ai_response_cache`: cache backend com expiração;
- `ai_editorial_history`: sugestão, revisão e conteúdo aplicado;
- `ai_settings_audit`: auditoria das alterações de configuração.

As tabelas possuem RLS, sem políticas públicas, e privilégios somente para `service_role`.

## Fallbacks

- IA desligada: a interface pública fica oculta e o produto continua normal.
- Sem chave: o painel usa templates editoriais seguros.
- Provedor indisponível ou resposta inválida: uma resposta inválida pode ser corrigida uma vez; depois é usado fallback determinístico.
- Busca assistida indisponível: filtros tradicionais processam a consulta.
- Limite diário ou orçamento atingido: novas chamadas externas são bloqueadas sem afetar catálogo, pagamentos ou entrega.

## Ativação gradual

1. Aplicar a migração com todas as flags desligadas.
2. Publicar a Edge Function e validar `action=ai-status`.
3. Configurar `AI_API_KEY` e os custos atuais como segredos.
4. Ativar apenas `ai_enabled` e `ai_editorial_enabled` para uso da proprietária.
5. Revisar histórico, erros, latência e custo por alguns dias.
6. Ativar `ai_search_enabled` somente depois da validação editorial.
7. Manter `ai_support_enabled` e `ai_streaming_enabled` desligadas nesta versão.

## Testes

```bash
node --check series-app/app.js
deno check supabase/functions/bot-unificado/index.ts
deno test --allow-env supabase/functions/bot-unificado/index_test.ts
node scripts/account-auth-check.mjs
node scripts/miniapp-functional-check.mjs
```

Também execute o build da Vercel e o smoke em modo web e Telegram antes de ativar uma flag em produção.

## Limitações conhecidas

- A IA não consulta compras nem dados privados da conta nesta versão.
- O painel de IA está integrado à área da proprietária existente, sem criar uma segunda autenticação administrativa.
- Alertas externos de orçamento não são enviados; o orçamento bloqueia chamadas e o painel exibe o consumo registrado.
- O custo permanece desconhecido até as tarifas do provedor serem configuradas.

# Roadmap de entrega, seguranca e operacao

Este documento registra a evolucao incremental solicitada para contas, entrega, seguranca, operacao e gestao. Ele nao declara como concluido o que ainda nao foi implementado.

## Estado atual validado

- Identidade privada baseada em `Telegram WebApp initData` validado no backend.
- Compras aprovadas conciliadas no backend antes da liberacao.
- Entitlements privados e bloqueio de compra duplicada.
- Entrega protegida pelo bot com idempotencia, fila de falhas e reprocessamento seguro.
- Carrinho, cupons, Pix, Mercado Pago e Telegram Stars calculados e validados no backend.
- Biblioteca, compras, favoritos, progresso e preferencias ligados ao Telegram ID autenticado.
- CMS administrativo protegido por proprietaria, senha e validacao no backend.
- Catalogo web publico sem liberacao de conteudo privado fora do fluxo autorizado.
- Logs operacionais e funil com eventos idempotentes e consentimento para recuperacao de checkout.
- Conta web vinculada ao Telegram, portabilidade e exclusao segura do login web.
- Indicacoes com atribuicao unica e conversao somente por pagamento aprovado.

## Proxima prioridade: ledger de creditos e recompensa

Objetivo: criar um historico contabil imutavel antes de ativar qualquer recompensa por indicacao.

Estado tecnico em 2026-08-16: a fundacao do ledger foi aplicada no Supabase e a integracao idempotente com aprovacao, estorno e chargeback esta preparada. A recompensa continua desativada ate a definicao da regra comercial.

- Definir evento elegivel, valor, prazo e limite da recompensa.
- Criar ledger de credito e debito sem depender apenas de um campo de saldo.
- Reverter recompensa em estorno, chargeback ou fraude confirmada.
- Impedir autoindicacao, repeticao de beneficio e saldo negativo indevido.
- Manter a interface sem promessa de credito enquanto a regra estiver desativada.

## Prioridade seguinte: administracao e comunicacao

Estado tecnico em 2026-08-16: a tabela legada de sessoes administrativas foi endurecida para acesso exclusivo do backend; RBAC formal e segundo fator continuam pendentes.

Comunicacao em 2026-08-16: a confirmação de compra por e-mail foi preparada com marcador idempotente no pedido; falhas de envio não interrompem pagamento ou entrega.

Também foram preparados marcadores separados para avisos de falha, reembolso e chargeback; todos os e-mails transacionais permanecem opt-in.

- RBAC para proprietaria, suporte e operacao.
- Segundo fator para funcoes administrativas sensiveis.
- E-mails transacionais de verificacao, compra, falha, reembolso e seguranca.
- Preferencias de notificacao e trilha de auditoria.
- Painel de direitos e disponibilidade de conteudo sem expor midia protegida.

## Conformidade e resiliencia

- Fluxos LGPD de exportacao, correcao e exclusao com retencao financeira adequada.
- Inventario de dados pessoais e politica de retencao por finalidade.
- Ambientes separados para desenvolvimento, homologacao e producao.
- Runbooks de incidente, rotacao de segredos e restauracao de backup.
- Teste periodico de recuperacao e conciliacao de pagamentos.

## Regras permanentes

- Nunca liberar serie paga por estado do frontend.
- Nunca registrar secrets, signed URLs ou File_ID em analytics e logs publicos.
- Nunca inventar metricas, disponibilidade, avaliacoes ou direitos de exibicao.
- Nunca executar migracao destrutiva sem reversao e validacao.
- Implementar uma etapa por vez e manter pagamento e entrega cobertos pelo smoke funcional.

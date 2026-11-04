# adaptadores/boomit/

Tudo o que é específico da Plataforma Boomit:

- `FonteBoomit` com `FonteMock` (lê `fixtures/boomit/` e valida contra o contrato) e
  `FonteApi` (Edge Function `copiloto-export` da Boomit), escolhidas por `BOOMIT_FONTE`;
- normalizador (regras R1–R11, `docs/02` §3.3): snapshot bruto → `contexto_*`;
- tradução de `contexto_*`, registros e combinados em `ItemDeContexto` para o motor.

Entra no Checkpoint 2 (FonteMock e normalizador) e no Checkpoint 3 (tradução para o motor).
O adaptador pode importar o motor; o contrário é proibido.

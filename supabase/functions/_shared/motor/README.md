# motor/

Núcleo de IA genérico: tipos e schema de saída, montagem do pacote de contexto em camadas,
guardrails, verificação determinística, simulação e debrief, combinados, lente e skills.

**Regra de isolamento:** nada aqui importa `adaptadores/**` nem o app (`src/**`), e nenhum
arquivo menciona a plataforma de origem dos dados. Garantido por `no-restricted-imports`
(`eslint.config.js`) e pelo teste `tests/motor-isolado.test.ts`.

O motor recebe contexto só pela interface `ItemDeContexto` (`contexto.ts`).

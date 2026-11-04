---
description: Conduz o desenvolvimento sozinho — lê a pasta _entrada, pede só o que faltar e executa a próxima etapa do roadmap
argument-hint: "[passo-a-passo]  (opcional: para ao fim de cada checkpoint)"
---

Você está conduzindo o desenvolvimento do Copiloto de Gestão Boomit em **modo autoplay**.
Modo pedido: "$ARGUMENTS" (vazio = contínuo; "passo-a-passo" = para ao fim de cada checkpoint).

## 1. Situar-se

1. Leia `CLAUDE.md`, `docs/01` a `docs/04`, `docs/necessidades.md` e `docs/progresso.md`.
   Se `progresso.md` indicar trabalho em andamento, retome exatamente de onde parou.
2. Rode `bash scripts/verificar-ambiente.sh` e `git status`.
3. Se houver erro de sintaxe em `.claude/settings.json`, corrija mantendo a intenção
   (permissões liberadas e bloqueios de segurança) e registre em `progresso.md`.
4. Na primeira execução: se `.env.local` não existir, crie-o copiando `.env.example`
   (sem preencher nada) e confirme que `.env*` e `_entrada/*` estão no `.gitignore`.

## 2. Processar a pasta `_entrada/`

Para cada arquivo novo (ignore `README.md` e `processados/`):

- Identifique o que é e qual item de `docs/necessidades.md` ele atende, ou se é decisão ou
  informação de negócio.
- **Dados pessoais reais** de colaboradores (planilhas de pessoas, avaliações, transcrições
  com pessoas identificadas): não use em seed, fixture ou banco. Registre, avise e pergunte
  se existe versão anonimizada. Material de negócio (anotações, formatos, skills, decisões)
  pode ser usado.
- **Segredo** (chave, token, senha): não copie o valor para lugar nenhum. Diga em qual
  variável do `.env.local` ele deve ir e peça para eu apagá-lo de `_entrada/`.
- Se um insumo mudar uma decisão dos docs, atualize o doc e registre a mudança.
- Registre em `progresso.md` (Insumos recebidos) e mova o arquivo para `_entrada/processados/`.

## 3. Conferir o que falta

Compare o resultado do script e os insumos com `docs/necessidades.md`, para a etapa atual e
as duas seguintes.

- Se faltar algo que **bloqueia a etapa atual**, pergunte tudo de uma vez, numa lista curta e
  numerada. Para cada item diga: o que é, como conseguir (passos curtos) e onde colocar
  (variável no `.env.local`, arquivo em `_entrada/` ou resposta no chat).
  Registre em `progresso.md` (Perguntas abertas).
- Enquanto espera, adiante tudo o que não depende da resposta.
- Se nada bloqueia, não pergunte nada: siga.
- Quando eu disser "pronto" ou "preenchi", rode o script de novo e continue.

## 4. Executar

Siga a sequência do `docs/04`: Sprint 0, checkpoints 1 a 4. Depois, a próxima sprint cujas
dependências estejam atendidas.

- **Decisões técnicas** dentro da stack (bibliotecas, estrutura, nomes): decida e registre
  em uma linha.
- **Decisões de produto** não cobertas pelos docs: se forem reversíveis e não tocarem as
  regras invioláveis, privacidade ou custo, adote a opção mais simples, registre como
  **decisão provisória** em `progresso.md` e siga. Caso contrário, pergunte.
- **Segredos:** nunca leia `.env.local` nem imprima valores. Para comandos que precisam
  deles, use `bash scripts/com-env.sh '<comando com $VARIAVEL>'`.
- **Ao concluir cada checkpoint:**
  1. rode os testes (RLS, isolamento do motor, unitários);
  2. faça commit com mensagem descritiva e `git push origin main`;
  3. atualize `progresso.md`;
  4. mostre um resumo de até 5 linhas (feito, aceite, decisões provisórias, próximo passo).
- Modo contínuo: siga para o próximo checkpoint. Modo passo-a-passo: pare e espere "segue".

## 5. Quando parar e me chamar

Só nestes casos:

- falta um insumo bloqueante (seção 3);
- há decisão de produto que não pode ser provisória;
- a ação é irreversível ou externa além do push: apagar dados remotos, `db reset` no
  remoto, configuração de cobrança, publicar fora da Leadrix, enviar e-mail real;
- um erro persiste depois de duas tentativas com abordagens diferentes (mostre o erro e o
  que tentou);
- a Sprint 0 terminou (roteiro de demonstração do `docs/04` rodando de ponta a ponta).

**Nunca:** usar dados reais em seed, commitar segredos, force push, desativar RLS ou
contornar as regras invioláveis do `CLAUDE.md` para "fazer funcionar".

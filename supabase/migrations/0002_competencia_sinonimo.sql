-- 0002 · Semente de competencia_sinonimo (R1, docs/02 §3.3)
-- Gerada a partir de supabase/functions/_shared/adaptadores/boomit/sinonimos.ts.
-- O teste do normalizador confere que esta lista e a do código continuam iguais.
-- RLS: a tabela já tem RLS e política de leitura desde a 0001 (escrita só via service role).
insert into competencia_sinonimo (chave_normalizada, competencia_canonica, categoria) values
  ('inovacao', 'Inovação', 'digital_crescimento'),
  ('criatividade', 'Criatividade', 'digital_crescimento'),
  ('foco', 'Foco', 'digital_crescimento'),
  ('flexibilidade', 'Flexibilidade', 'digital_crescimento'),
  ('agilidade', 'Agilidade', 'digital_crescimento'),
  ('curiosidade', 'Curiosidade', 'digital_crescimento'),
  ('construcao de planos', 'Construção de Planos', 'digital_crescimento'),
  ('riscos calculados', 'Riscos Calculados', 'digital_crescimento'),
  ('tomada de decisao', 'Tomada de Decisão', 'digital_crescimento'),
  ('comunicacao objetiva', 'Comunicação Objetiva', 'digital_crescimento'),
  ('experiencia profissional', 'Experiência Profissional', 'taticas_estrategicas'),
  ('adaptabilidade', 'Adaptabilidade', 'taticas_estrategicas'),
  ('resolucao de problemas', 'Resolução de Problemas', 'taticas_estrategicas'),
  ('conhecimento tecnico', 'Conhecimento Técnico', 'taticas_estrategicas'),
  ('estrategia de negocios', 'Estratégia de Negócios', 'taticas_estrategicas'),
  ('trabalho em equipe', 'Trabalho em Equipe', 'taticas_estrategicas'),
  ('conhecimento do setor', 'Conhecimento do Setor', 'taticas_estrategicas'),
  ('compreensao estrategica', 'Compreensão Estratégica', 'taticas_estrategicas'),
  ('comunicacao', 'Comunicação', 'taticas_estrategicas'),
  ('comunicacao eficaz', 'Comunicação', 'taticas_estrategicas'),
  ('comunicacaoefetiva', 'Comunicação', 'taticas_estrategicas'),
  ('comunicacao efetiva', 'Comunicação', 'taticas_estrategicas'),
  ('colaboracao', 'Colaboração', 'outras'),
  ('comunicacao e influencia', 'Comunicação e Influência', 'outras'),
  ('comunicacao eficaz influencia', 'Comunicação e Influência', 'outras'),
  ('direcionamento para resultados', 'Direcionamento para Resultados', 'outras'),
  ('gestao de mudancas', 'Gestão de Mudanças', 'outras'),
  ('gestao mudancas', 'Gestão de Mudanças', 'outras'),
  ('influencia', 'Influência', 'outras'),
  ('melhoria continua', 'Melhoria Contínua', 'outras'),
  ('planejamento estrategico', 'Planejamento Estratégico', 'outras'),
  ('proatividade', 'Proatividade', 'outras'),
  ('produtividade', 'Produtividade', 'outras'),
  ('qualidade do trabalho', 'Qualidade do Trabalho', 'outras'),
  ('qualidade trabalho', 'Qualidade do Trabalho', 'outras'),
  ('resiliencia', 'Resiliência', 'outras')
on conflict (chave_normalizada) do update
  set competencia_canonica = excluded.competencia_canonica,
      categoria = excluded.categoria;

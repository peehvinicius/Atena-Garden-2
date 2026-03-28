# Atena Garden v11 — mudanças principais

## Gemini reduzido a texto curto com cache
- Gemini removido de reconhecimento de planta por foto.
- Gemini removido de reconhecimento de semente por foto.
- Gemini removido de reconhecimento de item do estoque por foto.
- Gemini removido de diagnóstico por imagem.
- Gemini removido da medição de luminosidade por imagem.
- Gemini mantido apenas para um bloco diário de textos curtos do jardim.
- A análise em texto usa cache diário: se já foi gerada no dia, o app reutiliza e não chama o Gemini novamente.
- O prompt enviado ao Gemini foi encurtado e passou a levar só dados essenciais do jardim.
- A geração via Gemini acontece em bloco único para o jardim inteiro, em vez de múltiplas chamadas por planta.

## IA local / regras locais
- Scan de planta por foto passou a usar análise local básica.
- Diagnóstico visual passou a usar análise local básica.
- Identificação de semente por foto passou a usar análise local básica.
- Identificação de item do estoque por foto passou a usar análise local básica.
- Medição de luminosidade passou a usar análise local básica.

## Clima e cache
- Clima passou a usar cache diário local.
- Se o clima do dia já foi buscado, o app reutiliza os dados no mesmo dia.
- O bloco diário do jardim usa esse clima em cache e evita novas chamadas repetidas.

## Novo bloco diário do jardim
- Botânico do Dia.
- Prioridade de Hoje.
- Checklist Inteligente.
- Conselhos de manutenção.
- Dicas de rotina do dia.
- Análise de risco simples.
- Orientação para germinação.
- Ajuda para replantio.
- Sugestão de manejo por estação/clima.
- Revisão semanal curta.
- Conselhos para plantas novas.
- Conselhos para plantas antigas.
- Ajuda para escolher uso do estoque.
- Texto explicativo/resumo do jardim.

## Estrutura mantida
- Estrutura geral do app mantida.
- Armazenamento local mantido.
- Histórico de fotos mantido.
- Tempo de vida das plantas mantido.
- Personalização técnica de substrato, drenagem, filtragem e vaso mantida.
- Sugestões baseadas no estoque mantidas.

## Deploy
- Build validado localmente.
- Dist gerada e pronta para GitHub Pages.

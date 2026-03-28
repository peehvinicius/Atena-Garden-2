# Atena Garden v12 — alterações desta versão

## Compatibilidade local entre cadastros e ambientes
- Adicionado motor local de compatibilidade **planta × ambiente**.
- Cada planta agora mostra:
  - compatibilidade do ambiente atual
  - melhor ambiente sugerido
  - motivo da sugestão
  - botão para mover direto para o ambiente sugerido
- Adicionado motor local de compatibilidade **germinação/semente × ambiente**.
- Cada germinação agora mostra:
  - ambiente atual
  - melhor ambiente sugerido
  - compatibilidade do ambiente atual
  - botão para aplicar o ambiente sugerido
- Adicionado motor local de compatibilidade **estoque × ambiente**.
- Cada item do estoque agora mostra:
  - local atual de guarda
  - melhor ambiente sugerido para armazenamento
  - compatibilidade do local atual
  - botão para aplicar o ambiente sugerido

## Estoque
- Corrigida a principal limitação do estoque: agora é possível **editar o item depois de cadastrado**.
- A mesma ficha agora serve para **criar e editar** item do estoque.
- A ficha de estoque agora permite:
  - nome
  - categoria
  - quantidade
  - unidade
  - observações
  - foto manual
  - categorias múltiplas de uso no app
  - ambiente/local onde o item é guardado
- Adicionado botão de **editar** em cada card do estoque.
- Mantida a identificação local básica por foto para pré-preencher a ficha.

## Germinação / sementes
- A germinação manual agora pode registrar o **ambiente atual**.
- A transferência para planta no jardim agora começa sugerindo melhor ambiente com base na compatibilidade local.
- As fichas continuam com foto manual e técnicas/observações.

## IA e lógica local
- Mantido o modelo da v11: **Gemini não é usado para imagem**.
- As sugestões de ambiente desta versão são **100% locais**, sem depender do Gemini.
- O sistema usa os dados já cadastrados de:
  - luz do ambiente
  - cobertura
  - chuva
  - período de sol
  - status da planta
  - frequência de rega
  - tipo/categoria do item
  - fase de germinação

## Dados e persistência
- Adicionados campos opcionais de ambiente para:
  - itens do estoque
  - germinações
- Mantido o armazenamento local e backup por JSON.
- Mantido o deploy do GitHub Pages usando a pasta `dist` pronta.

## Validação
- `npm run lint` ✅
- `npm run build` ✅

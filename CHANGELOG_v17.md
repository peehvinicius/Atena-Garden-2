# Atena Garden v17

## O que entrou nesta versão

### Planejamento do jardim
- Nova visão em **Minhas Plantas** com filtros rápidos:
  - **Todas**
  - **Hoje**
  - **Semana**
  - **Em observação**
- Cartões de coleção mostrando:
  - favoritas
  - em observação
  - novas
  - candidatas a replantio
- Painel com três blocos novos:
  - **Hoje**
  - **Semana**
  - **Em observação**

### Cadastro inteligente por nome
- Mantido e refinado o preenchimento por nome popular da planta.
- O cadastro continua sugerindo automaticamente, quando houver correspondência:
  - nome científico
  - rega
  - substrato
  - drenagem
  - filtragem
  - vaso
  - observações de categoria/luz

### Ficha da planta mais forte
- Adicionado **fase da planta**:
  - Recém-chegada
  - Adaptação
  - Crescimento
  - Manutenção
  - Recuperação
  - Em observação
- Adicionado **nível de observação**.
- Linha do tempo ampliada com eventos:
  - cadastro
  - última rega
  - último replantio
  - análise de sintomas
  - histórico de fotos
- Mantido o histórico visual na ficha.

### Ações novas por planta
- **Duplicar planta**
- **Exportar relatório individual** em Markdown
- Mantida edição, rega, replantio, exclusão e foto manual

### Ambientes mais úteis
- Cada ambiente agora mostra um resumo rápido com:
  - quantidade de plantas
  - luz
  - período de sol
- Bloco novo com **melhor uso do ambiente**
  - folhagens de interior
  - mudas/germinação
  - espécies de sol

### Sementes e germinação
- Cada germinação agora mostra:
  - **fase atual**
  - **checklist da fase**
- Mantida transferência para o jardim
- Mantidas sugestões de ambiente locais

### Estoque mais útil para decisão
- Busca local em **Estoque**
- Filtros rápidos:
  - **Todos**
  - **Favoritos**
  - **Para replantio**
  - **Para germinação**
- Cards-resumo do estoque mostrando contadores
- Itens do estoque agora podem ser **favoritados**
- Mantida edição completa do item, foto manual e sugestão de ambiente/local de guarda

## Varredura geral feita antes da entrega
- `npm run lint` ✅
- `npm run build` ✅
- Revisão de navegação e props alteradas ✅
- Build final gerada com `dist` atualizada ✅

## Observação honesta
- O pacote principal das melhorias entrou.
- A parte de **busca totalmente global única** para todas as abas ainda não virou um índice universal único; nesta versão a busca principal continua focando plantas e o estoque ganhou busca própria.
- O build gera apenas um **aviso de chunk grande** do Vite, mas a compilação conclui normalmente.

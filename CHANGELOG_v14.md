# Atena Garden v14

## Correções principais
- Corrigida a tela branca ao adicionar foto em planta, ambiente/local e outros formulários principais, com otimização local das imagens antes de salvar.
- Adicionado autopreenchimento local por nome da planta no cadastro manual, incluindo nome científico e cuidados básicos quando a planta for reconhecida pela base interna.
- Adicionado autopreenchimento local por nome do item no estoque, sugerindo categoria, unidade e usos no app.
- Ajustados textos da interface para remover a aparência de “IA por imagem” onde agora existe apenas leitura local básica.

## Melhorias técnicas
- O app agora comprime imagens antes de armazenar em base64 local.
- O salvamento em `localStorage` ganhou escrita protegida para evitar quebra brusca quando houver limite de armazenamento.
- Mantido o deploy por `dist` no GitHub Pages.

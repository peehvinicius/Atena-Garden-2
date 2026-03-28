# Atena Garden v13 — Correção do endereço manual do clima

## O que foi corrigido
- o endereço manual do jardim agora **salva de verdade** nas configurações
- o campo manual ganhou um **rascunho próprio**, para não se perder durante a edição
- o botão passou a salvar explicitamente como **Salvar endereço**
- a tela agora mostra **qual endereço está salvo**
- ao mudar para **modo manual**, o app usa o endereço salvo/rascunho em vez de depender só do GPS

## Clima manual mais confiável
- o modo manual **não cai silenciosamente no GPS** quando o endereço está vazio ou falha
- se o endereço estiver vazio, o app mostra **Endereço manual pendente**
- se o endereço não for encontrado, o app mostra **Endereço não encontrado**
- se houver erro na geocodificação, o app mostra **Falha ao localizar endereço**

## O que foi mantido
- cache diário do clima
- Gemini só para texto curto do jardim
- IA de imagem segue fora do Gemini
- deploy do GitHub Pages segue publicando pela `dist`

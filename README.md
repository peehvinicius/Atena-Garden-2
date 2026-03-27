# Atena Garden

PWA de gestão botânica com cadastro manual e por IA, clima em tempo real, sementes, estoque, histórico e backup local por importação/exportação.

## Rodar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Gemini

Você pode usar a IA de dois jeitos:

1. Colando a chave diretamente no app em **Configurações > IA**.
2. Definindo `VITE_GEMINI_API_KEY` em um arquivo `.env` antes do build.

## Publicação manual no Netlify

Depois do build, envie **somente a pasta `dist`**.


## GitHub Pages
Use a pasta `dist` como publicação estática ou publique pelo GitHub Pages com a workflow incluída.

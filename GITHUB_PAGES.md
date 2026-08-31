# GitHub Pages - Guia de Deploy

## Configuração do Workflow

O deploy automático está configurado no arquivo .github/workflows/github-pages.yml.

### Como ativar o GitHub Pages

1. Vá para o GitHub e acesse o repositório
2. Clique em **Settings**
3. No menu lateral, clique em **Pages**
4. Em **Source**, selecione **GitHub Actions**
5. Clique em **Save**

### URL do Deploy

Após a primeira execução do workflow, seu site estará disponível em:

`
https://<seu-usuario>.github.io/NotificationHub/
`

## Deploy Local

Para testar o build de produção localmente:

`ash
cd client
npm run build
npx serve ./dist
`

## Estrutura do Projeto

- **Frontend (React):** https://<usuario>.github.io/NotificationHub/
- **Backend (API):** Deploy separado necessário



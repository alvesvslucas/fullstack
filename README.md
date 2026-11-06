# Interface de login

Protótipo de tela de login com HTML, CSS e JavaScript. Contém campos de usuário e senha e uma área de mensagem de retorno.

## Estrutura

- `index.html`: formulário.
- `style/style.css`: estilos.
- `js/app.js`: tentativa de consulta de usuários em JSON.
- `bd/`: arquivo de dados presente no repositório.

## Como visualizar a interface

```bash
git clone https://github.com/alvesvslucas/fullstack.git
cd fullstack
```

Abra `index.html` em um navegador para visualizar a tela.

## Estado atual

A autenticação não está pronta: o script usa `fetch(users.json)` sem uma URL entre aspas e o arquivo de dados está em `bd/users.json`. O envio do formulário também registra os campos no console.

Antes de usar credenciais reais, é necessário remover esse registro e implementar autenticação no servidor, sem disponibilizar senhas em JSON público. Este repositório deve ser apresentado como protótipo de interface.


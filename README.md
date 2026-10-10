# FRONTIER FEEDBACK — RDR2 Mod Community

Site responsivo para receber feedback público sobre mods do Red Dead Redemption 2. Feito com React + TypeScript + Vite + Supabase.

## O que já funciona
- Catálogo de mods com busca, cards, versão e links opcionais para Nexus Mods.
- Cadastro e login por e-mail/senha via Supabase Auth.
- Avaliações de 1–5 estrelas e textos de 10–2000 caracteres.
- Atualização automática dos comentários usando Supabase Realtime.
- Edição e exclusão **apenas pelo autor**, garantidas por políticas RLS no banco de dados, não apenas na tela.
- 1 avaliação por usuário por mod, protegida por constraint no Postgres.
- Notas médias e ordenação por recência/nota; layout responsivo.

## Instalar e testar no computador

Você precisa ter Node.js 20.19+ (ou 22.12+) instalado.

```bash
npm install
cp .env.example .env
npm run dev
```

No Windows, substitua `cp` por `copy`. Acesse o endereço local mostrado no terminal, normalmente http://localhost:5173.

**Sem `.env` configurado**: o site mostra uma prévia do layout com três mods de demonstração. Login, publicação e sincronização não funcionam até configurar Supabase.

## Configurar o backend

1. Crie um projeto gratuito em https://supabase.com/dashboard.
2. Abra **SQL Editor** e execute **todo** o conteúdo de `supabase/schema.sql`.
3. Acesse **Project Settings > API** (ou **Connect**) e copie a **Project URL** e a chave **publishable/anon** (pública).
4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Em **Authentication > Providers > Email**, configure o cadastro por e-mail e escolha se a confirmação de e-mail será exigida. Com confirmação ativada, o usuário precisa confirmar o e-mail antes de entrar.
6. Em **Authentication > URL Configuration**, configure a **Site URL** com a URL final do site e adicione os endereços de desenvolvimento e produção a **Redirect URLs** conforme necessário.
7. Execute `npm run dev` e teste com **duas contas diferentes em duas abas/navegadores**. Publique em uma; a outra deve atualizar sem recarregar. Confirme que uma conta não consegue editar/excluir dados da outra.

**IMPORTANTE:** a chave `service_role` é SECRETA e nunca deve ser inserida em variáveis `VITE_`, frontend, repositório ou deploy público.

## Gerenciar seus mods

Entre no dashboard Supabase > **Table Editor > mods** e adicione/edite/exclua linhas. Campos:

| Campo | Uso |
|---|---|
| `slug` | Identificador único, ex. `automatic-loot` |
| `title` | Título do mod |
| `description` | Resumo do mod |
| `version` | Ex. `v2.1.0` |
| `category` | Ex. `QUALIDADE DE VIDA` |
| `cover_url` | URL HTTPS pública de imagem de capa, opcional |
| `nexus_url` | Link oficial do mod na Nexus, opcional |

> Os três mods fornecidos são demonstrativos e podem ser substituídos pelos seus mods reais. Nenhum conteúdo de exemplo é publicado como avaliação.

## Colocar online (Vercel ou Netlify)

1. Envie a pasta do projeto a um repositório GitHub, sem o arquivo `.env`.
2. Importe o repositório na Vercel/Netlify como projeto Vite.
3. Build command: `npm run build`; pasta de saída: `dist`.
4. Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas Environment Variables do deploy.
5. Faça o deploy, atualize a Site URL no Supabase e teste cadastro e comentários ao vivo.

## Segurança e limites

- A autorização de atualização e remoção é executada **no Postgres com RLS**. Mesmo usando ferramentas de desenvolvedor, usuários não conseguem alterar comentários alheios.
- Não foi implementado painel admin visual (mods são administrados pelo Supabase). Para moderação, use o dashboard do projeto, que é restrito ao proprietário.
- Para uso público em escala, configure no Supabase proteção anti-spam/CAPTCHA e limites de e-mail apropriados. A versão inicial contém uma proteção por conta (uma avaliação por mod), mas não substitui anti-spam.
- O Realtime requer publicação habilitada; o SQL faz isso automaticamente.
- O site pressupõe que a aplicação está hospedada publicamente em HTTPS quando em produção.

## NOVO: Painel administrativo do criador

Depois de executar a versão atualizada de `supabase/schema.sql`, registre-se normalmente no site e confirme o e-mail. No Supabase, entre em **Authentication > Users**, copie o UUID de sua conta e, no **SQL Editor**, execute (substituindo pelo seu próprio UUID):

```sql
insert into public.admin_users(user_id)
values ('SEU-UUID-AQUI')
on conflict (user_id) do nothing;
```

**Não coloque seu e-mail nem o UUID do administrador no código do frontend.** A lista de administradores fica no banco, protegida por RLS. Saia e entre novamente no site: o botão **PAINEL ADMIN** aparecerá na barra superior. Apenas administradores autorizados conseguem criar, editar e remover mods, classificar bugs e sugestões, destacar feedbacks e enviar respostas públicas.

O painel mostra contadores de mods, feedbacks, bugs, sugestões e itens não resolvidos. No editor de feedback, o desenvolvedor pode ajustar o status (novo, em análise, planejado ou resolvido) e deixar uma resposta oficial, sem poder alterar o texto ou a nota de um comentário escrito por outra pessoa. A exclusão de feedback continua exclusiva do próprio autor.

**Atualização de uma instalação existente:** execute novamente o SQL completo; ele foi feito para adicionar as colunas e políticas do painel a bancos existentes. Faça backup antes de alterações em produção. O painel não funciona em modo de demonstração, sem Supabase configurado.

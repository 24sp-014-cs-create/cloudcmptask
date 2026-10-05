# Fieldnotes

A small items workspace built with a static frontend, Netlify Functions, and Netlify Database (managed Postgres).

## What is included

- `public/`: browser app, with search and add/edit/delete actions.
- `netlify/functions/items.mjs`: server-side API for listing and changing items.
- `netlify/database/migrations/20261005000000_create_cloud_items.sql`: schema migration applied by Netlify Database.
- `netlify.toml`: Netlify publish directory and function settings.

## 1. Enable Netlify Database

Netlify Database is managed Postgres attached to your Netlify site. It is available on credit-based Netlify plans and database usage consumes credits.

From the project directory, install dependencies, authenticate/link the Netlify CLI to your site, and initialize its database:

```sh
npm install
npx netlify-cli login
npx netlify-cli link
npx netlify-cli database init
```

Follow the CLI prompts to enable Netlify Database for the linked site. No Oracle account, SQL Developer, database password, or manually configured database environment variables are needed. Do not put database credentials in GitHub.

## 2. Deploy from GitHub to Netlify

Push the project to GitHub and connect the repository in Netlify. Netlify reads `netlify.toml`; the publish directory is `public` and the function directory is `netlify/functions`. Netlify applies database migrations from `netlify/database/migrations` during production deploys.

## 3. Use the app

Open the Netlify site URL. The frontend calls `/.netlify/functions/items`; the function supports `GET`, `POST`, `PUT`, and `DELETE`. For local development, run `npx netlify-cli dev`; Netlify provides a local Postgres database that is separate from production.

## Important security note

This starter has no sign-in. Anyone who can reach the public site can read, add, edit, and delete its items. Do not use it for private or sensitive data until authentication and authorization have been added to the function.

If the database connection fails, check that Netlify Database is enabled for the linked site, confirm the migration was applied, and inspect the Netlify function logs.
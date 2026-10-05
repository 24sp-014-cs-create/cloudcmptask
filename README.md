# Fieldnotes

A small Oracle-backed items workspace built with a static frontend and Netlify Functions.

## What is included

- `public/`: browser app, with search and add/edit/delete actions.
- `netlify/functions/items.mjs`: server-side API for listing and changing items.
- `db/001_create_cloud_items.sql`: Oracle table schema to run once in SQL Developer.
- `netlify.toml`: Netlify publish directory and function settings.

## 1. Create the Oracle table

Create an Oracle Autonomous Database in OCI and create an application database user. Connect to that database as the application user in Oracle SQL Developer, open `db/001_create_cloud_items.sql`, and run it once. The table is named `CLOUD_ITEMS`.

Use the TLS connection string from OCI for `DB_CONNECT_STRING`. The database network rules must permit connections from your Netlify Functions. Prefer TLS and restrict network access to Netlify static egress addresses when your Netlify plan supports them.

## 2. Deploy from GitHub to Netlify

Push this repository to GitHub. In Netlify, choose **Add new site** and **Import an existing project**, authorize GitHub, and select this repository. Netlify reads `netlify.toml`; the publish directory is `public` and the function directory is `netlify/functions`.

In the Netlify site's environment-variable settings, add:

| Variable | Value |
| --- | --- |
| `DB_USER` | Oracle application username |
| `DB_PASSWORD` | Oracle application password |
| `DB_CONNECT_STRING` | Oracle TLS connection string from OCI |

Save the variables and trigger a deploy. Never put actual credentials in GitHub or in browser code.

## 3. Use the app

Open the Netlify site URL. The frontend calls `/.netlify/functions/items`; the function supports `GET`, `POST`, `PUT`, and `DELETE`. Use SQL Developer to query `CLOUD_ITEMS` directly and verify changes.

## Important security note

This starter has no sign-in. Anyone who can reach the public site can read, add, edit, and delete its items. Do not use it for private or sensitive data until authentication and authorization have been added to the function.

If the database connection fails, check the Netlify function logs, confirm all three environment variables, verify the TLS connection string, and check the Oracle network access rules.
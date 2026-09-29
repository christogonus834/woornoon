# Workon Web (React + Vite)

## 1. Get your Supabase keys
From the same Supabase project used for the backend: **Settings > API** > copy the **Project URL** and the **anon/public** key (not service_role — that one stays in the backend).

## 2. Configure and run
```
cp .env.example .env
```
Fill in `.env`:
- `VITE_SUPABASE_URL` — Project URL
- `VITE_SUPABASE_ANON_KEY` — anon/public key
- `VITE_API_URL` — leave as http://localhost:4000 for local dev (make sure the backend is running first)

```
npm i
npm run dev
```
Open the printed http://localhost:5173 link. Sign up there to create your first (customer) account — see the backend README for turning a second account into admin.

## Deploy on Vercel
Import repo. Framework: Vite. Build: `npm run build`. Output: `dist`.
Add the three env vars above, with `VITE_API_URL` set to your live Render backend URL. Redeploy after changing env vars.
Then add this Vercel URL to `CLIENT_ORIGIN` on Render so CORS allows it.

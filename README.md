# Domify

App for keeping a shared house running: chores, expenses, groceries,
announcements, quiet hours, maintenance, and a conflict log.

FastAPI + SQLAlchemy on the backend, React + Vite + Tailwind on the
frontend, SQLite by default (Postgres works too if you set `DATABASE_URL`).

## Live demo

https://domifyapp.onrender.com

Hosted on Render's free tier, so the backend sleeps after 15 minutes of
no traffic. First request after a quiet period takes ~30 seconds to wake
the server.

## Run it locally

Backend:

```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend (dev, with hot reload):

```
cd frontend
npm install
npm run dev
```

Vite proxies `/api/*` to the FastAPI server, so open http://localhost:5173
during development.

For a single-process production-style run, build the frontend and let
FastAPI serve the static bundle:

```
cd frontend && npm run build
cd ../backend && uvicorn main:app
```

Then open http://localhost:8000.

## Tests

```
pytest
```

## Layout

```
backend/
  main.py
  database.py
  models.py
  schemas.py
  auth.py
  routers/
frontend/
  src/
    App.jsx
    main.jsx
    pages/         # one file per view
    components/    # ui primitives: Button, Card, Modal, etc.
    lib/           # api wrapper, toast, formatters
  index.html
  tailwind.config.js
  vite.config.js
tests/
```

## Notes

- Tables are created with `Base.metadata.create_all` on startup.
- JWT in localStorage. Token expires in 60 minutes.
- For Postgres: `DATABASE_URL=postgresql+psycopg2://user:pass@host/db`.
- Icons: lucide-react. Charts: recharts. No other UI libraries.
- Deployed split across Render (frontend static site + backend web service)
  and Neon (Postgres). Both free tiers

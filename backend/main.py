from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
from routers import (
    auth_router, houses, chores, expenses, grocery,
    announcements, quiet_hours, maintenance, conflicts,
)

# create tables on startup. no alembic for this project.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Domify", version="1.0.0")

# wide open CORS, fine since we serve the built frontend ourselves
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(houses.router)
app.include_router(chores.router)
app.include_router(expenses.router)
app.include_router(grocery.router)
app.include_router(announcements.router)
app.include_router(quiet_hours.router)
app.include_router(maintenance.router)
app.include_router(conflicts.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# serve the vite build output if it exists.
# run `cd frontend && npm install && npm run build` first.
DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")
    index_file = os.path.join(DIST, "index.html")

    @app.get("/")
    def root():
        return FileResponse(index_file)

    # everything that isn't an /api/* route falls back to the SPA
    @app.get("/{path:path}")
    def spa(path: str):
        candidate = os.path.join(DIST, path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(index_file)
else:
    @app.get("/")
    def need_build():
        return {
            "message": "Frontend not built. Run: cd frontend && npm install && npm run build",
        }

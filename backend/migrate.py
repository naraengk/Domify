from __future__ import annotations

# Lightweight schema migration runner used in place of Alembic
# When a new column is added to a model, it is also listed here so that
# existing databases pick it up on the next application startup
# This runner only handles ADD COLUMN. Renames and drops are not supported
# and must be applied manually through a SQL session

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

# Columns that should exist on the users table
_USER_COLUMNS = {
    "avatar_url": "VARCHAR",
    "bio": "VARCHAR DEFAULT ''",
    "pronouns": "VARCHAR DEFAULT ''",
    "venmo_handle": "VARCHAR DEFAULT ''",
    "zelle_handle": "VARCHAR DEFAULT ''",
    "phone": "VARCHAR DEFAULT ''",
    "dietary_restrictions": "VARCHAR DEFAULT ''",
    "chore_preferences": "TEXT DEFAULT ''",
    "timezone": "VARCHAR DEFAULT 'America/New_York'",
}

# Columns that should exist on the house_members table
# TIMESTAMP works on both SQLite and Postgres. DATETIME is SQLite-only and
# would break on Neon Postgres in production
_MEMBER_COLUMNS = {
    "move_in_date": "TIMESTAMP",
    "move_out_date": "TIMESTAMP",
}


def _existing_columns(engine: Engine, table: str) -> set[str]:
    # Return the set of column names that already exist on the given table
    # Used to skip ALTER statements for columns that are already present
    insp = inspect(engine)
    if not insp.has_table(table):
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def run_migrations(engine: Engine) -> None:
    # Called once on application startup, compares the column definitions
    # above to the current database schema and issues ALTER TABLE statements
    # for any column that is missing. Safe to run repeatedly
    with engine.begin() as conn:
        user_cols = _existing_columns(engine, "users")
        for col, typedef in _USER_COLUMNS.items():
            if col not in user_cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typedef}"))

        member_cols = _existing_columns(engine, "house_members")
        for col, typedef in _MEMBER_COLUMNS.items():
            if col not in member_cols:
                conn.execute(text(f"ALTER TABLE house_members ADD COLUMN {col} {typedef}"))

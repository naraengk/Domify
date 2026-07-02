from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Expense, ExpenseSplit, HouseMember, User, Settlement
from schemas import (
    ExpenseCreate, ExpenseOut, ExpenseSplitOut, BalanceOut, SettleIn,
)
from auth import get_current_user, require_house_member

router = APIRouter(prefix="/api/houses/{house_id}/expenses", tags=["expenses"])


def _expense_to_out(exp: Expense, name_map: dict[int, str]) -> ExpenseOut:
    return ExpenseOut(
        id=exp.id, title=exp.title, category=exp.category, amount=exp.amount,
        paid_by=exp.paid_by, paid_by_name=name_map.get(exp.paid_by, "?"),
        created_at=exp.created_at,
        splits=[
            ExpenseSplitOut(
                user_id=s.user_id, user_name=name_map.get(s.user_id, "?"),
                amount_owed=s.amount_owed, is_settled=s.is_settled,
            ) for s in exp.splits
        ],
    )


@router.get("", response_model=list[ExpenseOut])
def list_expenses(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    expenses = (
        db.query(Expense)
        .filter(Expense.house_id == house_id)
        .order_by(Expense.created_at.desc())
        .all()
    )
    name_map = {u.id: u.name for u in db.query(User).all()}
    return [_expense_to_out(e, name_map) for e in expenses]


@router.post("", response_model=ExpenseOut)
def create_expense(house_id: int, data: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    members = db.query(HouseMember).filter(HouseMember.house_id == house_id).all()
    member_ids = [m.user_id for m in members]

    splits_in = data.splits
    # default split, equal across all current members
    if not splits_in:
        share = round(data.amount / len(member_ids), 2)
        splits_in = [type("S", (), {"user_id": uid, "amount_owed": share}) for uid in member_ids]

    exp = Expense(
        house_id=house_id, title=data.title, category=data.category,
        amount=data.amount, paid_by=user.id,
    )
    db.add(exp)
    db.flush()
    for s in splits_in:
        db.add(ExpenseSplit(
            expense_id=exp.id, user_id=s.user_id, amount_owed=s.amount_owed,
            # the payer's own share counts as already settled
            is_settled=(s.user_id == user.id),
        ))
    db.commit()
    db.refresh(exp)
    name_map = {u.id: u.name for u in db.query(User).all()}
    return _expense_to_out(exp, name_map)


@router.delete("/{expense_id}")
def delete_expense(house_id: int, expense_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    exp = db.get(Expense, expense_id)
    if not exp or exp.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(exp)
    db.commit()
    return {"ok": True}


@router.get("/balances", response_model=list[BalanceOut])
def balances(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # net per user = what they're owed - what they owe
    require_house_member(house_id, user, db)
    # raw SQL gets us totals per user efficiently
    # Use NOT es.is_settled for portability across SQLite, stores bool as 0/1
    # and Postgres, rejects boolean = integer comparison
    sql_owed = text("""
        SELECT es.user_id, COALESCE(SUM(es.amount_owed), 0) AS owed
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.house_id = :h AND NOT es.is_settled AND es.user_id != e.paid_by
        GROUP BY es.user_id
    """)
    sql_paid_for_others = text("""
        SELECT e.paid_by AS user_id, COALESCE(SUM(es.amount_owed), 0) AS lent
        FROM expenses e
        JOIN expense_splits es ON es.expense_id = e.id
        WHERE e.house_id = :h AND NOT es.is_settled AND es.user_id != e.paid_by
        GROUP BY e.paid_by
    """)
    owed_map = {r.user_id: float(r.owed) for r in db.execute(sql_owed, {"h": house_id})}
    lent_map = {r.user_id: float(r.lent) for r in db.execute(sql_paid_for_others, {"h": house_id})}

    members = db.query(User).join(HouseMember).filter(HouseMember.house_id == house_id).all()
    out = []
    for m in members:
        net = round(lent_map.get(m.id, 0) - owed_map.get(m.id, 0), 2)
        out.append(BalanceOut(user_id=m.id, user_name=m.name, net=net))
    return out


@router.post("/settle")
def settle(house_id: int, data: SettleIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # mark my unpaid splits to `to_user` as settled up to `amount`
    require_house_member(house_id, user, db)
    remaining = data.amount
    # walk through unsettled splits where I owe `to_user`
    rows = (
        db.query(ExpenseSplit, Expense)
        .join(Expense, Expense.id == ExpenseSplit.expense_id)
        .filter(
            Expense.house_id == house_id,
            Expense.paid_by == data.to_user,
            ExpenseSplit.user_id == user.id,
            ExpenseSplit.is_settled == False,
        )
        .order_by(Expense.created_at)
        .all()
    )
    for split, _ in rows:
        if remaining <= 0:
            break
        if split.amount_owed <= remaining + 0.01:
            remaining -= split.amount_owed
            split.is_settled = True
        else:
            # partial: shave the amount and call it settled-ish (simple model)
            split.amount_owed = round(split.amount_owed - remaining, 2)
            remaining = 0

    db.add(Settlement(
        house_id=house_id, from_user=user.id, to_user=data.to_user, amount=data.amount,
    ))
    db.commit()
    return {"ok": True}


@router.get("/settlements")
def settlements(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    rows = (
        db.query(Settlement).filter(Settlement.house_id == house_id)
        .order_by(Settlement.settled_at.desc()).limit(50).all()
    )
    name_map = {u.id: u.name for u in db.query(User).all()}
    return [
        {
            "id": s.id, "from_user_name": name_map.get(s.from_user, "?"),
            "to_user_name": name_map.get(s.to_user, "?"),
            "amount": s.amount, "settled_at": s.settled_at,
        }
        for s in rows
    ]


@router.get("/insights")
def insights(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # category totals + per-user totals + monthly trend
    require_house_member(house_id, user, db)
    by_cat = db.execute(text("""
        SELECT category, COALESCE(SUM(amount), 0) AS total
        FROM expenses WHERE house_id = :h
        GROUP BY category ORDER BY total DESC
    """), {"h": house_id}).all()

    by_user = db.execute(text("""
        SELECT u.id, u.name, COALESCE(SUM(e.amount), 0) AS total
        FROM users u
        JOIN house_members hm ON hm.user_id = u.id
        LEFT JOIN expenses e ON e.paid_by = u.id AND e.house_id = :h
        WHERE hm.house_id = :h
        GROUP BY u.id, u.name
        ORDER BY total DESC
    """), {"h": house_id}).all()

    # rough month-over-month
    # this month vs last month total spend
    mom = db.execute(text("""
        SELECT strftime('%Y-%m', created_at) AS ym, SUM(amount) AS total
        FROM expenses WHERE house_id = :h
        GROUP BY ym ORDER BY ym
    """) if db.bind.dialect.name == "sqlite" else text("""
        SELECT to_char(created_at, 'YYYY-MM') AS ym, SUM(amount) AS total
        FROM expenses WHERE house_id = :h
        GROUP BY ym ORDER BY ym
    """), {"h": house_id}).all()

    return {
        "by_category": [{"category": r.category, "total": float(r.total)} for r in by_cat],
        "by_user": [{"user_id": r.id, "user_name": r.name, "total": float(r.total)} for r in by_user],
        "monthly": [{"month": r.ym, "total": float(r.total)} for r in mom],
    }

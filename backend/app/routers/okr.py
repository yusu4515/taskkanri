from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.okr import Objective, KeyResult
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.okr import (
    ObjectiveCreate, ObjectiveUpdate, ObjectiveResponse,
    KeyResultCreate, KeyResultUpdate, KeyResultResponse,
)

router = APIRouter(prefix="/api/okr", tags=["okr"])


# ── Objectives ──────────────────────────────────────────

@router.get("/objectives", response_model=list[ObjectiveResponse])
def list_objectives(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Objective).filter(Objective.user_id == current_user.id).order_by(Objective.quarter.desc(), Objective.id).all()


@router.post("/objectives", response_model=ObjectiveResponse, status_code=201)
def create_objective(
    payload: ObjectiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = Objective(user_id=current_user.id, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/objectives/{obj_id}", response_model=ObjectiveResponse)
def update_objective(
    obj_id: int,
    payload: ObjectiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Objective).filter(Objective.id == obj_id, Objective.user_id == current_user.id).first()
    if not obj:
        raise HTTPException(404, "目標が見つかりません")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/objectives/{obj_id}", status_code=204)
def delete_objective(
    obj_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Objective).filter(Objective.id == obj_id, Objective.user_id == current_user.id).first()
    if not obj:
        raise HTTPException(404, "目標が見つかりません")
    db.delete(obj)
    db.commit()


# ── Key Results ──────────────────────────────────────────

@router.post("/objectives/{obj_id}/key-results", response_model=KeyResultResponse, status_code=201)
def create_key_result(
    obj_id: int,
    payload: KeyResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Objective).filter(Objective.id == obj_id, Objective.user_id == current_user.id).first()
    if not obj:
        raise HTTPException(404, "目標が見つかりません")
    kr = KeyResult(objective_id=obj_id, **payload.model_dump())
    db.add(kr)
    db.commit()
    db.refresh(kr)
    return kr


@router.patch("/key-results/{kr_id}", response_model=KeyResultResponse)
def update_key_result(
    kr_id: int,
    payload: KeyResultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kr = db.query(KeyResult).join(Objective).filter(
        KeyResult.id == kr_id, Objective.user_id == current_user.id
    ).first()
    if not kr:
        raise HTTPException(404, "キーリザルトが見つかりません")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(kr, k, v)
    db.commit()
    db.refresh(kr)
    return kr


@router.delete("/key-results/{kr_id}", status_code=204)
def delete_key_result(
    kr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kr = db.query(KeyResult).join(Objective).filter(
        KeyResult.id == kr_id, Objective.user_id == current_user.id
    ).first()
    if not kr:
        raise HTTPException(404, "キーリザルトが見つかりません")
    db.delete(kr)
    db.commit()

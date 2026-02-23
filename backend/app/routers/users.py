from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.user import UserResponse, ChangePasswordRequest, AiKeyUpsert, AiKeyStatus

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="現在のパスワードが正しくありません",
        )
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Task).filter(Task.user_id == current_user.id).update(
        {"status": TaskStatus.deleted}
    )
    current_user.is_active = False
    db.commit()


@router.get("/me/ai-key/status", response_model=AiKeyStatus)
def get_ai_key_status(current_user: User = Depends(get_current_user)):
    return AiKeyStatus(
        has_key=bool(current_user.ai_api_key),
        provider=current_user.ai_provider,
    )


@router.put("/me/ai-key", status_code=status.HTTP_204_NO_CONTENT)
def set_ai_key(
    payload: AiKeyUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.ai_provider = payload.provider
    current_user.ai_api_key = payload.api_key
    db.commit()


@router.delete("/me/ai-key", status_code=status.HTTP_204_NO_CONTENT)
def delete_ai_key(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.ai_provider = None
    current_user.ai_api_key = None
    db.commit()

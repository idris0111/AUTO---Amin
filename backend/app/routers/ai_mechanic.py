from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ai import (
    AiDiagnosticRequest,
    AiDiagnosticResponse,
    QuickSymptomPrompt,
)
from app.services.ai_mechanic import (
    get_quick_symptoms,
    run_ai_diagnostic,
)

router = APIRouter(prefix="/ai", tags=["AI Mechanic"])


@router.get(
    "/symptoms",
    response_model=list[QuickSymptomPrompt],
    summary="Получить типовые симптомы неисправностей автомобиля",
)
def list_symptoms() -> list[QuickSymptomPrompt]:
    """Возвращает список подготовленных карточек частых симптомов неисправностей

    (тормоза, подвеска, перегрев, зажигание, аккумулятор, ТО).
    """
    return get_quick_symptoms()


@router.post(
    "/diagnose",
    response_model=AiDiagnosticResponse,
    summary="Интеллектуальная диагностика автомобиля по симптомам",
)
async def diagnose_vehicle(
    request: AiDiagnosticRequest,
    db: Session = Depends(get_db),
) -> AiDiagnosticResponse:
    """Анализирует описание неисправности, определяет пораженную систему автомобиля,

    уровень критичности, перечень пошаговых проверок и подбирает РЕАЛЬНЫЕ
    запчасти из базы данных с расчетом совместимости для выбранного авто.
    """
    return await run_ai_diagnostic(db, request)


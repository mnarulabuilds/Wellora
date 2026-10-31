from fastapi import APIRouter

from wellora.schemas.assistant import UserQuery
from wellora.services.assistant import assistant

router = APIRouter(tags=["Assistant"])


@router.post("/analyze_query")
def analyze_query(query: UserQuery):
    return {"status": "success", **assistant.reply(query.text, query.user_id)}

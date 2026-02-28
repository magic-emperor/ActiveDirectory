"""
routes/ai_chat.py — AI chat API endpoints
"""

from fastapi import APIRouter
from models.user_models import ChatRequest
from services.gemini_service import chat_with_assistant
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat with Gemini AI assistant.
    AI is informational ONLY — cannot create or modify anything.
    """
    if not request.messages:
        return {"response": "Hello! I can help you create Active Directory users. What would you like to know?"}

    # -- COMMENTED OUT: Print raw chat request --
    # print(f"[AI Chat] {len(request.messages)} messages in conversation")
    # print(f"[AI Chat] Last message: {request.messages[-1].content}")
    # if request.current_form_data:
    #     print(f"[AI Chat] Form data: {request.current_form_data}")

    response = chat_with_assistant(
        messages=request.messages,
        current_form_data=request.current_form_data
    )

    logger.debug("AI chat response length: %d chars", len(response))

    return {"response": response}


@router.get("/health")
async def ai_health():
    """Check if Gemini AI is configured"""
    from config import gemini_config
    return {
        "ai_configured": bool(gemini_config.api_key),
        "model": gemini_config.model,
        "message": "AI ready" if gemini_config.api_key else "No GEMINI_API_KEY set — using fallback mode"
    }
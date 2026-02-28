"""
routes/users.py — User management API endpoints
"""

from fastapi import APIRouter, HTTPException
from models.user_models import UserCreateRequest, UserCreateResponse, ValidationResult
from core.validator import run_full_validation
from services.ad_service import create_user_in_ad
from services.gemini_service import analyze_user_for_confirmation
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/validate", response_model=ValidationResult)
async def validate_user(user: UserCreateRequest):
    """
    Step 1: Run code-level validation only.
    Fast, no AI, no AD call. Returns errors/warnings/auto-generated fields.
    """
    # -- COMMENTED OUT: Print incoming validation request --
    # print(f"[Validate] Incoming: {user.first_name} {user.last_name}")
    # print(f"[Validate] Raw data: {user.model_dump()}")

    result = run_full_validation(user)
    logger.info(
        "Validation for %s %s: valid=%s, errors=%d",
        user.first_name, user.last_name, result.is_valid, len(result.errors)
    )
    return result


@router.post("/analyze", response_model=dict)
async def analyze_user(user: UserCreateRequest):
    """
    Step 2: After validation passes, send to Gemini for human-readable summary.
    Returns AI summary + details for the confirmation screen.
    AI does NOT create anything — just provides information.
    """
    validation = run_full_validation(user)

    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Validation failed. Fix errors before analysis.",
                "errors": validation.errors
            }
        )

    analysis = analyze_user_for_confirmation(user, validation)

    # -- COMMENTED OUT: Print AI analysis result --
    # print(f"[AI Analysis] Summary: {analysis.summary[:200]}...")
    # print(f"[AI Analysis] Warnings: {analysis.warnings}")

    return {
        "validation": validation.model_dump(),
        "analysis": analysis.model_dump(),
        "user_data": user.model_dump(exclude={"password"})  # Never send password back
    }


@router.post("/create", response_model=UserCreateResponse)
async def create_user(user: UserCreateRequest):
    """
    Step 3: ONLY called after human approval.
    Creates user in Active Directory (or prints if dry_run=true).
    """
    # Re-validate before creation (safety net)
    validation = run_full_validation(user)

    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Cannot create user — validation errors must be resolved first",
                "errors": validation.errors
            }
        )

    logger.info(
        "Creating user: %s %s (username: %s)",
        user.first_name, user.last_name, user.username
    )

    # -- COMMENTED OUT: Print pre-creation details --
    # print(f"[Create User] About to create: {user.first_name} {user.last_name}")
    # print(f"[Create User] Username: {user.username}")
    # print(f"[Create User] OU: {user.ou_path}")

    result = create_user_in_ad(user)

    if result.success:
        logger.info("User created successfully: %s", result.user_dn)
    else:
        logger.error("User creation failed: %s", result.message)

    return result
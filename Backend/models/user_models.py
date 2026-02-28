"""
models/user_models.py — All data models (Pydantic)
Strictly typed, validated at the model level
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from enum import Enum


class AccountStatus(str, Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"


class UserCreateRequest(BaseModel):
    """
    All fields needed to create an AD user.
    Required fields are strict, optional fields have defaults.
    """
    # ── REQUIRED FIELDS ──────────────────────────────────────────
    first_name: str = Field(..., min_length=1, max_length=64, description="User's first name")
    last_name: str = Field(..., min_length=1, max_length=64, description="User's last name")
    password: str = Field(..., min_length=1, description="Initial password")
    ou_path: str = Field(..., description="OU to place the user in, e.g. OU=IT,DC=company,DC=com")

    # ── AUTO-GENERATED (can be overridden) ───────────────────────
    username: Optional[str] = Field(
        None,
        max_length=20,
        description="sAMAccountName — auto-generated if not provided (firstname.lastname)"
    )
    display_name: Optional[str] = Field(None, description="Display name, defaults to First Last")
    user_principal_name: Optional[str] = Field(
        None, description="UPN e.g. user@company.com — auto-generated if not provided"
    )

    # ── OPTIONAL PROFILE FIELDS ──────────────────────────────────
    email: Optional[str] = Field(None, description="Email address")
    department: Optional[str] = Field(None, max_length=128)
    job_title: Optional[str] = Field(None, max_length=128)
    phone: Optional[str] = Field(None, max_length=32)
    mobile: Optional[str] = Field(None, max_length=32)
    company: Optional[str] = Field(None, max_length=128)
    employee_id: Optional[str] = Field(None, max_length=64)
    manager_dn: Optional[str] = Field(None, description="DN of manager, e.g. CN=John Doe,OU=IT,DC=company,DC=com")
    description: Optional[str] = Field(None, max_length=256)

    # ── ACCOUNT SETTINGS ─────────────────────────────────────────
    account_status: AccountStatus = Field(default=AccountStatus.ENABLED)
    must_change_password: bool = Field(default=True)
    password_never_expires: bool = Field(default=False)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Names should only have letters, spaces, hyphens, apostrophes"""
        import re
        if not re.match(r"^[a-zA-Z\s\-\'\.]+$", v):
            raise ValueError("Name can only contain letters, spaces, hyphens, or apostrophes")
        return v.strip()

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        """sAMAccountName: max 20 chars, no special chars except dot/underscore/hyphen"""
        if not v:  # Catches None and ""
            return None
        import re
        if not re.match(r"^[a-zA-Z0-9._\-]+$", v):
            raise ValueError("Username can only contain letters, numbers, dots, underscores, hyphens")
        if len(v) > 20:
            raise ValueError("Username (sAMAccountName) cannot exceed 20 characters")
        return v.lower()
        
    @field_validator("display_name", "user_principal_name", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        return v


class ValidationResult(BaseModel):
    """Result from code-level validation"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    auto_generated: dict = {}  # Fields that were auto-generated


class AIAnalysisRequest(BaseModel):
    """Request to Gemini AI for human-readable analysis"""
    user_data: UserCreateRequest
    validation_result: ValidationResult


class AIAnalysisResponse(BaseModel):
    """Gemini AI response — informational only, takes NO action"""
    summary: str              # What will happen in plain English
    details: List[str]        # Bullet points of changes
    warnings: List[str]       # Any concerns to highlight
    confirmation_prompt: str  # The final "Are you sure?" message


class ChatMessage(BaseModel):
    """Single message in AI chat"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request to continue AI chat conversation"""
    messages: List[ChatMessage]
    current_form_data: Optional[dict] = None  # Current state of the form


class UserCreateResponse(BaseModel):
    """Response after attempting to create user"""
    success: bool
    message: str
    user_dn: Optional[str] = None     # The DN of the created user
    username: Optional[str] = None
    dry_run: bool = False             # Was this a dry run?
    details: Optional[dict] = None   # Full details for debugging


class OUItem(BaseModel):
    """Organizational Unit item"""
    name: str
    dn: str          # Full DN, e.g. OU=IT,DC=company,DC=com
    description: Optional[str] = None


class ADConnectionStatus(BaseModel):
    """AD connection health check response"""
    connected: bool
    server: str
    domain: str
    dry_run: bool
    message: str
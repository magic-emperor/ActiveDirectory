"""
config.py — Centralized configuration
All settings come from environment variables (.env file)
Loose-coupled: change .env to change behavior, no code changes needed
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()


class ADConfig(BaseSettings):
    """Active Directory connection settings"""
    server: str = Field(default="localhost", alias="AD_SERVER")
    domain: str = Field(default="company.com", alias="AD_DOMAIN")
    base_dn: str = Field(default="DC=company,DC=com", alias="AD_BASE_DN")
    admin_username: str = Field(default="administrator", alias="AD_ADMIN_USERNAME")
    admin_password: str = Field(default="", alias="AD_ADMIN_PASSWORD")
    port: int = Field(default=389, alias="AD_PORT")
    use_tls: bool = Field(default=False, alias="AD_USE_TLS")
    dry_run: bool = Field(default=True, alias="AD_DRY_RUN")  # SAFE DEFAULT: dry run ON

    @property
    def admin_dn(self) -> str:
        """Full admin DN for LDAP bind — NTLM format: DOMAIN\\username"""
        return f"{self.domain}\\{self.admin_username}"

    model_config = {"populate_by_name": True, "env_file": ".env", "extra": "ignore"}


class GeminiConfig(BaseSettings):
    """Gemini AI settings"""
    api_key: str = Field(default="", alias="GEMINI_API_KEY")
    model: str = Field(default="gemini-2.0-flash-lite", alias="GEMINI_MODEL")
    max_tokens: int = Field(default=2048, alias="GEMINI_MAX_TOKENS")

    model_config = {"populate_by_name": True, "env_file": ".env", "extra": "ignore"}


class PasswordPolicy(BaseSettings):
    """Password policy — should mirror your AD domain policy"""
    min_length: int = Field(default=8, alias="PASSWORD_MIN_LENGTH")
    require_uppercase: bool = Field(default=True, alias="PASSWORD_REQUIRE_UPPERCASE")
    require_lowercase: bool = Field(default=True, alias="PASSWORD_REQUIRE_LOWERCASE")
    require_number: bool = Field(default=True, alias="PASSWORD_REQUIRE_NUMBER")
    require_special: bool = Field(default=True, alias="PASSWORD_REQUIRE_SPECIAL")
    must_change_on_first_login: bool = Field(default=True, alias="PASSWORD_MUST_CHANGE")

    model_config = {"populate_by_name": True, "env_file": ".env", "extra": "ignore"}


class AppConfig(BaseSettings):
    """Application-level settings"""
    env: str = Field(default="development", alias="APP_ENV")
    secret_token: str = Field(default="local-dev-token-change-me", alias="APP_SECRET_TOKEN")
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        alias="CORS_ORIGINS"
    )
    username_format: str = Field(default="firstname.lastname", alias="USERNAME_FORMAT")
    # Hardcoded allowed users (for local use without DB)
    allowed_users: str = Field(default="admin,it_admin", alias="APP_ALLOWED_USERS")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def allowed_users_list(self) -> List[str]:
        return [u.strip() for u in self.allowed_users.split(",")]

    model_config = {"populate_by_name": True, "env_file": ".env", "extra": "ignore"}


# ── Singleton instances ────────────────────────────────────────────
ad_config = ADConfig()
gemini_config = GeminiConfig()
password_policy = PasswordPolicy()
app_config = AppConfig()
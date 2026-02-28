"""
core/validator.py — Pure code-level validation
NO AI involved here. Fast, deterministic, offline.
These checks run BEFORE sending anything to AI.
"""

import re
from typing import Tuple, List
from models.user_models import UserCreateRequest, ValidationResult
from config import password_policy, ad_config, app_config


def generate_username(first_name: str, last_name: str, fmt: str = None) -> str:
    """
    Auto-generate username based on naming convention.
    fmt options: firstname.lastname | flastname | firstnamelastname
    """
    fmt = fmt or app_config.username_format
    fn = re.sub(r"[^a-zA-Z]", "", first_name).lower()
    ln = re.sub(r"[^a-zA-Z]", "", last_name).lower()

    if fmt == "firstname.lastname":
        username = f"{fn}.{ln}"
    elif fmt == "flastname":
        username = f"{fn[0]}{ln}"
    elif fmt == "firstnamelastname":
        username = f"{fn}{ln}"
    else:
        username = f"{fn}.{ln}"

    # Enforce 20 char limit for sAMAccountName
    return username[:20]


def generate_upn(username: str, domain: str = None) -> str:
    """Generate User Principal Name: username@domain.com"""
    domain = domain or ad_config.domain
    return f"{username}@{domain}"


def validate_email(email: str) -> bool:
    """Basic email format validation"""
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_password(password: str) -> List[str]:
    """
    Validate password against policy from config.
    Returns list of errors (empty = valid).
    """
    errors = []
    pol = password_policy

    if len(password) < pol.min_length:
        errors.append(f"Password must be at least {pol.min_length} characters long")

    if pol.require_uppercase and not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")

    if pol.require_lowercase and not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")

    if pol.require_number and not re.search(r"\d", password):
        errors.append("Password must contain at least one number")

    if pol.require_special and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character (!@#$%^&*...)")

    return errors


def validate_ou_path(ou_path: str) -> List[str]:
    """
    Validate OU path format.
    Valid: OU=IT,DC=company,DC=com
    """
    errors = []
    if not ou_path or ou_path.strip() == "":
        errors.append("OU path cannot be empty")
        return errors

    # Should contain at least one DC component
    if "DC=" not in ou_path.upper():
        errors.append("OU path must contain DC components (e.g. DC=company,DC=com)")

    # Check for valid DN format
    parts = ou_path.split(",")
    for part in parts:
        part = part.strip()
        if "=" not in part:
            errors.append(f"Invalid OU path component: '{part}' — each part must be like KEY=VALUE")
            break
        key, _, val = part.partition("=")
        if key.upper() not in ["OU", "CN", "DC", "O", "C"]:
            errors.append(f"Unknown DN key '{key}' in OU path — expected OU, CN, or DC")

    return errors


def validate_phone(phone: str) -> bool:
    """Loose phone validation — allows various international formats"""
    cleaned = re.sub(r"[\s\-\(\)\+\.]", "", phone)
    return cleaned.isdigit() and 7 <= len(cleaned) <= 15


def run_full_validation(data: UserCreateRequest) -> ValidationResult:
    """
    Run ALL validations on the user data.
    Returns ValidationResult with errors, warnings, and auto-generated fields.
    """
    errors: List[str] = []
    warnings: List[str] = []
    auto_generated: dict = {}

    # ── AUTO-GENERATE fields if not provided ─────────────────────
    if not data.username:
        data.username = generate_username(data.first_name, data.last_name)
        auto_generated["username"] = data.username

    if not data.display_name:
        data.display_name = f"{data.first_name} {data.last_name}"
        auto_generated["display_name"] = data.display_name

    if not data.user_principal_name:
        data.user_principal_name = generate_upn(data.username)
        auto_generated["user_principal_name"] = data.user_principal_name

    # ── REQUIRED FIELD CHECKS ─────────────────────────────────────
    if not data.first_name or not data.first_name.strip():
        errors.append("First name is required")

    if not data.last_name or not data.last_name.strip():
        errors.append("Last name is required")

    # ── USERNAME VALIDATION ───────────────────────────────────────
    if data.username:
        if len(data.username) > 20:
            errors.append(f"Username '{data.username}' exceeds 20 character limit (sAMAccountName rule)")
        if re.search(r'["\[\]:;|=+*?<>/\\,@]', data.username):
            errors.append("Username contains invalid characters")
        if data.username[0].isdigit():
            warnings.append("Username starts with a number — this is allowed but unusual")

    # ── UPN VALIDATION ────────────────────────────────────────────
    if data.user_principal_name:
        if not validate_email(data.user_principal_name):
            errors.append(f"User Principal Name '{data.user_principal_name}' is not a valid email format")

    # ── EMAIL VALIDATION ──────────────────────────────────────────
    if data.email:
        if not validate_email(data.email):
            errors.append(f"Email address '{data.email}' is not in a valid format")

    # ── PASSWORD VALIDATION ───────────────────────────────────────
    password_errors = validate_password(data.password)
    errors.extend(password_errors)

    # ── OU PATH VALIDATION ────────────────────────────────────────
    ou_errors = validate_ou_path(data.ou_path)
    errors.extend(ou_errors)

    # ── PHONE VALIDATION ──────────────────────────────────────────
    if data.phone and not validate_phone(data.phone):
        warnings.append(f"Phone number '{data.phone}' may not be in a valid format")

    # if data.mobile and not validate_phone(data.mobile):
    #     warnings.append(f"Mobile number '{data.mobile}' may not be in a valid format")

    # ── POLICY WARNINGS ───────────────────────────────────────────
    if not data.must_change_password:
        warnings.append("User will NOT be required to change password at first login — consider enabling this")

    if data.password_never_expires:
        warnings.append("Password set to NEVER EXPIRE — this may violate your organization's security policy")

    if data.account_status.value == "disabled":
        warnings.append("Account will be created in DISABLED state — user won't be able to log in until enabled")

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        auto_generated=auto_generated
    )
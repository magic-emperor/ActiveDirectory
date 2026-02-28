"""
services/ad_service.py — Active Directory operations service
Handles user creation, search, and management via ldap3
"""

from ldap3 import MODIFY_REPLACE
from ldap3.core.exceptions import LDAPException, LDAPEntryAlreadyExistsResult
from core.ad_connector import ad_connector, ADConnectionError
from models.user_models import UserCreateRequest, UserCreateResponse
from config import ad_config
from typing import Optional
import logging
import ssl

logger = logging.getLogger(__name__)


def build_user_dn(user: UserCreateRequest) -> str:
    """
    Build the full DN (Distinguished Name) for the new user.
    Format: CN=Display Name,OU=Department,DC=company,DC=com
    """
    return f"CN={user.display_name},{user.ou_path}"


def encode_password(password: str) -> bytes:
    """
    Encode password for AD unicodePwd attribute.
    AD requires the password wrapped in double quotes and UTF-16-LE encoded.
    This is the ONLY way to set a password via LDAP in Active Directory.
    """
    quoted = f'"{password}"'
    return quoted.encode("utf-16-le")


def build_user_attributes(user: UserCreateRequest) -> dict:
    """
    Build the LDAP attribute dictionary for user creation.
    Includes all required and optional fields.
    Only includes optional fields if they have values (clean, no empty strings in AD).
    """
    # ── REQUIRED attributes for ANY AD user ──────────────────────
    attributes = {
        "objectClass": ["top", "person", "organizationalPerson", "user"],
        "cn": user.display_name,
        "sAMAccountName": user.username,
        "userPrincipalName": user.user_principal_name,
        "givenName": user.first_name,
        "sn": user.last_name,
        "displayName": user.display_name,
        "name": user.display_name,
        # Account enabled = 512, disabled = 514, pwd must change = 8388608
        # We set to 512 (enabled) now, then set password separately
        "userAccountControl": "512" if user.account_status.value == "enabled" else "514",
    }

    # ── OPTIONAL attributes — only add if provided ────────────────
    if user.email:
        attributes["mail"] = user.email

    if user.department:
        attributes["department"] = user.department

    if user.job_title:
        attributes["title"] = user.job_title

    if user.phone:
        attributes["telephoneNumber"] = user.phone

    # if user.mobile:
    #     attributes["mobile"] = user.mobile

    if user.company:
        attributes["company"] = user.company

    if user.employee_id:
        attributes["employeeID"] = user.employee_id

    if user.manager_dn:
        attributes["manager"] = user.manager_dn

    if user.description:
        attributes["description"] = user.description

    return attributes


def create_user_in_ad(user: UserCreateRequest) -> UserCreateResponse:
    """
    Main function: Create a user in Active Directory.

    Steps:
    1. Build user DN and attributes
    2. Create the user object (without password — AD requires 2-step)
    3. Set the password using unicodePwd
    4. If must_change_password: set pwdLastSet = 0
    5. Enable the account if it should be enabled

    DRY RUN: Prints everything to console instead of actual AD calls.
    """
    user_dn = build_user_dn(user)
    attributes = build_user_attributes(user)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # DRY RUN MODE — Print everything, do nothing
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if ad_config.dry_run:
        logger.info("[DRY RUN] Would create user: %s", user_dn)

        # Print full details for testing
        print("\n" + "="*60)
        print("  [DRY RUN] AD USER CREATION — WHAT WOULD HAPPEN")
        print("="*60)
        print(f"  User DN     : {user_dn}")
        print(f"  Username    : {user.username}")
        print(f"  UPN         : {user.user_principal_name}")
        print(f"  Display Name: {user.display_name}")
        print(f"  First Name  : {user.first_name}")
        print(f"  Last Name   : {user.last_name}")
        print(f"  OU Path     : {user.ou_path}")
        print(f"  Email       : {user.email or 'Not set'}")
        print(f"  Department  : {user.department or 'Not set'}")
        print(f"  Job Title   : {user.job_title or 'Not set'}")
        print(f"  Phone       : {user.phone or 'Not set'}")
        print(f"  Company     : {user.company or 'Not set'}")
        print(f"  Employee ID : {user.employee_id or 'Not set'}")
        print(f"  Account     : {user.account_status.value.upper()}")
        print(f"  Must Change Password: {user.must_change_password}")
        print(f"  Pwd Never Expires   : {user.password_never_expires}")
        print(f"  Password    : {'*' * len(user.password)} (length: {len(user.password)})")
        print("\n  LDAP Attributes that would be sent:")
        for k, v in attributes.items():
            print(f"    {k}: {v}")
        print("="*60 + "\n")

        return UserCreateResponse(
            success=True,
            message=f"[DRY RUN] User '{user.display_name}' would be created successfully at {user_dn}",
            user_dn=user_dn,
            username=user.username,
            dry_run=True,
            details={"attributes": {k: str(v) for k, v in attributes.items()}}
        )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # REAL MODE — Actually create in AD
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try:
        conn = ad_connector.connect()

        # STEP 1: Create user object (without password first)
        # Note: AD creates user as disabled until password is set via TLS
        conn.add(user_dn, attributes=attributes)

        if not conn.result["result"] == 0:
            return UserCreateResponse(
                success=False,
                message=f"Failed to create user: {conn.result['description']}",
                dry_run=False
            )

        logger.info("User object created: %s", user_dn)

        # STEP 2: Set password (requires LDAPS/TLS for security)
        # unicodePwd can only be set over a secure connection
        encoded_pwd = encode_password(user.password)
        conn.modify(user_dn, {
            "unicodePwd": [(MODIFY_REPLACE, [encoded_pwd])]
        })

        if conn.result["result"] != 0:
            logger.error("Password set failed: %s", conn.result)
            return UserCreateResponse(
                success=False,
                message=f"User created but password could not be set: {conn.result['description']}. "
                        f"Ensure you are using LDAPS (AD_USE_TLS=true, AD_PORT=636)",
                user_dn=user_dn,
                username=user.username,
                dry_run=False
            )

        # STEP 3: If must change password, set pwdLastSet = 0
        if user.must_change_password:
            conn.modify(user_dn, {
                "pwdLastSet": [(MODIFY_REPLACE, [0])]
            })

        # STEP 4: If password never expires, modify userAccountControl
        if user.password_never_expires:
            # 66048 = normal account (512) + dont_expire_password (65536)
            uac_value = 66048 if user.account_status.value == "enabled" else 66050
            conn.modify(user_dn, {
                "userAccountControl": [(MODIFY_REPLACE, [uac_value])]
            })

        conn.unbind()
        logger.info("User created successfully: %s", user_dn)

        return UserCreateResponse(
            success=True,
            message=f"User '{user.display_name}' created successfully in Active Directory",
            user_dn=user_dn,
            username=user.username,
            dry_run=False
        )

    except LDAPEntryAlreadyExistsResult:
        return UserCreateResponse(
            success=False,
            message=f"User already exists: A user with DN '{user_dn}' or "
                    f"username '{user.username}' already exists in AD",
            dry_run=False
        )
    except ADConnectionError as e:
        return UserCreateResponse(
            success=False,
            message=f"AD Connection failed: {str(e)}",
            dry_run=False
        )
    except LDAPException as e:
        logger.error("LDAP exception creating user: %s", str(e))
        return UserCreateResponse(
            success=False,
            message=f"LDAP error: {str(e)}",
            dry_run=False
        )
    except Exception as e:
        logger.error("Unexpected error creating user: %s", str(e))
        return UserCreateResponse(
            success=False,
            message=f"Unexpected error: {str(e)}",
            dry_run=False
        )
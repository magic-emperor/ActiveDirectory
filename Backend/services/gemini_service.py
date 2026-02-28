"""
services/gemini_service.py — Gemini AI integration

IMPORTANT DESIGN PRINCIPLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━
Gemini AI is ONLY for:
  1. Chat interface — helping users understand what fields to fill
  2. Generating human-readable summary of what WILL happen before creation
  3. Answering user questions about AD / the process

Gemini NEVER:
  - Takes any action
  - Creates/modifies anything
  - Makes decisions
  - Bypasses validation

All actual validation is done in core/validator.py (pure code)
All actual AD operations are done in services/ad_service.py
"""

import google.generativeai as genai
from config import gemini_config, ad_config
from models.user_models import UserCreateRequest, ValidationResult, AIAnalysisResponse, ChatMessage
from typing import List, Optional
import json
import logging

logger = logging.getLogger(__name__)

# Configure Gemini
if gemini_config.api_key:
    genai.configure(api_key=gemini_config.api_key)


SYSTEM_CONTEXT = """You are an IT assistant helping to create Active Directory user accounts.
Your role is ONLY to:
1. Help users understand what information is needed
2. Explain what will happen when a user is created
3. Answer questions about Active Directory and user management
4. Provide a clear, friendly summary of the user details before creation

You NEVER take actions, create accounts, or modify anything. 
You only inform and guide. All actual operations are handled by the backend system.

Keep responses clear, concise, and non-technical unless the user asks for technical details.
Format responses with clear sections when presenting user details.
"""


def analyze_user_for_confirmation(
    user: UserCreateRequest,
    validation: ValidationResult
) -> AIAnalysisResponse:
    """
    Generate a human-readable analysis of the user that's about to be created.
    This is shown BEFORE the Approve/Edit/Reject confirmation step.
    The AI provides information only — no action taken.
    """
    if not gemini_config.api_key:
        # Fallback if no API key — generate summary from code
        return _generate_fallback_analysis(user, validation)

    # -- COMMENTED OUT: Print raw AI request data --
    # print(f"[AI Analysis Request]")
    # print(f"  User: {user.first_name} {user.last_name}")
    # print(f"  Validation: {validation.is_valid}")
    # print(f"  Errors: {validation.errors}")
    # print(f"  Warnings: {validation.warnings}")

    try:
        model = genai.GenerativeModel(
            model_name=gemini_config.model,
            system_instruction=SYSTEM_CONTEXT
        )

        user_data_str = f"""
User to be created:
- Name: {user.first_name} {user.last_name}
- Username (sAMAccountName): {user.username}
- User Principal Name: {user.user_principal_name}
- Display Name: {user.display_name}
- Organizational Unit: {user.ou_path}
- Email: {user.email or "Not set"}
- Department: {user.department or "Not set"}
- Job Title: {user.job_title or "Not set"}
- Phone: {user.phone or "Not set"}
- Company: {user.company or "Not set"}
- Account Status: {user.account_status.value}
- Must Change Password at First Login: {user.must_change_password}
- Password Never Expires: {user.password_never_expires}

Auto-generated fields: {json.dumps(validation.auto_generated)}
Warnings: {validation.warnings}
"""

        prompt = f"""
{user_data_str}

Please generate a confirmation summary for the IT admin who is about to create this user.
The summary should be clear and friendly, covering:
1. A 1-2 sentence overview of who is being created
2. Key account details (username, location in AD, email)
3. Any important settings (account status, password policy)
4. Any warnings they should be aware of

Keep it concise and professional. The admin will then click Approve, Edit, or Reject.
"""

        response = model.generate_content(prompt)
        summary_text = response.text

        # Build structured response
        details = [
            f"Username: {user.username}",
            f"UPN: {user.user_principal_name}",
            f"Placed in: {user.ou_path}",
            f"Account: {user.account_status.value.upper()}",
            f"Must change password: {'Yes' if user.must_change_password else 'No'}",
        ]
        if user.email:
            details.append(f"Email: {user.email}")
        if user.department:
            details.append(f"Department: {user.department}")
        if validation.auto_generated:
            auto_fields = ", ".join(validation.auto_generated.keys())
            details.append(f"Auto-generated: {auto_fields}")

        return AIAnalysisResponse(
            summary=summary_text,
            details=details,
            warnings=validation.warnings,
            confirmation_prompt="Do you want to proceed with creating this user in Active Directory?"
        )

    except Exception as e:
        logger.error("Gemini AI error in analyze_user: %s", str(e))
        return _generate_fallback_analysis(user, validation)


def chat_with_assistant(
    messages: List[ChatMessage],
    current_form_data: Optional[dict] = None
) -> str:
    """
    Continue a chat conversation with the AI assistant.
    User can ask questions, get help filling in fields, etc.
    AI only informs — never acts.
    """
    if not gemini_config.api_key:
        return "AI assistant is not configured. Please add GEMINI_API_KEY to your .env file."

    # -- COMMENTED OUT: Print raw chat messages --
    # print(f"[Chat Request] {len(messages)} messages")
    # for msg in messages:
    #     print(f"  [{msg.role}]: {msg.content[:100]}...")

    try:
        model = genai.GenerativeModel(
            model_name=gemini_config.model,
            system_instruction=SYSTEM_CONTEXT
        )

        # Build context including current form state
        context_prefix = ""
        if current_form_data:
            filled_fields = {k: v for k, v in current_form_data.items() if v}
            if filled_fields:
                context_prefix = f"Current form state: {json.dumps(filled_fields)}\n\n"

        # Convert to Gemini format
        history = []
        for msg in messages[:-1]:  # All but last
            history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content]
            })

        chat = model.start_chat(history=history)
        last_message = messages[-1].content
        if context_prefix:
            last_message = context_prefix + last_message

        response = chat.send_message(last_message)
        return response.text

    except Exception as e:
        logger.error("Gemini chat error: %s", str(e))
        friendly_fallback = (
            "⚠️ **AI Assistant is currently unavailable** (API Key or Quota issue).\n\n"
            "Since I cannot answer your specific question dynamically right now, here is a quick cheat sheet for the most common questions:\n\n"
            "• **Required Fields:** First Name, Last Name, Password, and OU Path.\n"
            "• **Auto-generated:** Username (sAMAccountName) and User Principal Name (UPN) are handled automatically if left blank.\n"
            "• **OU Path Format:** Must contain `OU=` and `DC=` components. Example: `OU=IT,DC=company,DC=com`\n"
            "• **Passwords:** Must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character (`!@#$%^&*...`).\n\n"
            "*(If you are the admin, check your backend terminal or .env for the API quota/key issues.)*"
        )
        return friendly_fallback


def _generate_fallback_analysis(
    user: UserCreateRequest,
    validation: ValidationResult
) -> AIAnalysisResponse:
    """
    Fallback summary when Gemini is not available.
    Pure code-based, no AI.
    """
    auto_note = ""
    if validation.auto_generated:
        fields = ", ".join(validation.auto_generated.keys())
        auto_note = f" The following fields were auto-generated: {fields}."

    summary = (
        f"You are about to create an Active Directory user account for "
        f"{user.first_name} {user.last_name}.\n"
        f"They will be placed in the organizational unit: {user.ou_path}.\n"
        f"Their login username will be {user.username} and their full "
        f"email/UPN will be {user.user_principal_name}." + auto_note
    )

    details = [
        f"Username (sAMAccountName): {user.username}",
        f"User Principal Name: {user.user_principal_name}",
        f"Display Name: {user.display_name}",
        f"Organizational Unit: {user.ou_path}",
        f"Account Status: {user.account_status.value.upper()}",
        f"Must Change Password: {'Yes' if user.must_change_password else 'No'}",
        f"Password Never Expires: {'Yes' if user.password_never_expires else 'No'}",
    ]

    if user.email:
        details.append(f"Email: {user.email}")
    if user.department:
        details.append(f"Department: {user.department}")
    if user.job_title:
        details.append(f"Job Title: {user.job_title}")
    if validation.auto_generated:
        for field, value in validation.auto_generated.items():
            details.append(f"Auto-generated {field}: {value}")

    return AIAnalysisResponse(
        summary=summary,
        details=details,
        warnings=validation.warnings,
        confirmation_prompt="Please review the details below. Do you want to create this user in Active Directory?"
    )
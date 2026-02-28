"""
routes/ad_info.py — Active Directory info endpoints
Fetch OUs, check connection status, etc.
"""

from fastapi import APIRouter
from core.ad_connector import ad_connector
from models.user_models import ADConnectionStatus
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ad", tags=["active-directory"])


@router.get("/status", response_model=ADConnectionStatus)
async def get_ad_status():
    """Check if AD is reachable and credentials are valid"""
    # -- COMMENTED OUT: Print connection test details --
    # print(f"[AD Status] Testing connection to: {ad_connector.config.server}")

    result = ad_connector.test_connection()
    return ADConnectionStatus(**result)


@router.get("/ous")
async def get_ous():
    """
    Fetch list of Organizational Units from AD.
    In dry_run mode, returns mock data for UI testing.
    """
    # -- COMMENTED OUT: Print OU fetch request --
    # print(f"[AD OUs] Fetching OUs from: {ad_connector.config.base_dn}")

    try:
        ous = ad_connector.get_ous()
        return {"ous": ous, "count": len(ous)}
    except Exception as e:
        logger.error("Failed to fetch OUs: %s", str(e))
        return {"ous": [], "count": 0, "error": str(e)}


@router.get("/config")
async def get_config_info():
    """
    Returns non-sensitive config info for UI (domain name, dry_run status, etc.)
    Never returns passwords or secrets.
    """
    from config import ad_config, app_config
    return {
        "domain": ad_config.domain,
        "server": ad_config.server,
        "base_dn": ad_config.base_dn,
        "dry_run": ad_config.dry_run,
        "use_tls": ad_config.use_tls,
        "port": ad_config.port,
        "username_format": app_config.username_format,
    }
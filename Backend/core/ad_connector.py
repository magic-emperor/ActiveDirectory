"""
core/ad_connector.py — Active Directory Connection Manager (ldap3)

HOW CONNECTION WORKS:
━━━━━━━━━━━━━━━━━━━━
This uses the ldap3 Python library which speaks LDAP protocol directly
to your Domain Controller over the network (port 389 or 636 for TLS).

No PowerShell. No domain-join required on this machine.
Requirements:
  1. Network access to the DC (port 389/636 must be open)
  2. Valid admin credentials
  3. AD_SERVER in .env pointing to your DC hostname or IP

Adaptive: Works with ANY Windows Server version (2012/2016/2019/2022)
because LDAP is a standard protocol, not version-specific.
"""

from ldap3 import (
    Server, Connection, ALL, NTLM, MODIFY_REPLACE, MODIFY_ADD,
    AUTO_BIND_NONE, SYNC, ALL_ATTRIBUTES
)
from ldap3.core.exceptions import (
    LDAPBindError, LDAPSocketOpenError, LDAPOperationResult,
    LDAPException
)
from config import ad_config
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ADConnectionError(Exception):
    """Raised when we can't connect to AD"""
    pass


class ADConnector:
    """
    Manages the LDAP connection to Active Directory.
    Loosely coupled — all settings come from config.py / .env
    """

    def __init__(self):
        self.config = ad_config
        self._server: Optional[Server] = None
        self._connection: Optional[Connection] = None

    def _build_server(self) -> Server:
        """Create ldap3 Server object"""
        return Server(
            self.config.server,
            port=self.config.port,
            use_ssl=self.config.use_tls,
            get_info=ALL,               # Fetch schema info — helps with compatibility
            connect_timeout=10
        )

    def connect(self) -> Connection:
        """
        Establish LDAP connection using NTLM authentication.
        NTLM works with DOMAIN\\username format — no Kerberos setup needed.
        """
        if self.config.dry_run:
            logger.info("[DRY RUN] Would connect to AD: %s (domain: %s)", 
                       self.config.server, self.config.domain)
            # -- COMMENTED OUT: Print dry run connection details --
            # print(f"[DRY RUN] AD Connection Details:")
            # print(f"  Server: {self.config.server}:{self.config.port}")
            # print(f"  Domain: {self.config.domain}")
            # print(f"  Admin: {self.config.admin_username}")
            # print(f"  TLS: {self.config.use_tls}")
            return None  # Dry run returns None — callers must check

        try:
            server = self._build_server()
            conn = Connection(
                server,
                user=self.config.admin_dn,   # DOMAIN\username format
                password=self.config.admin_password,
                authentication=NTLM,          # Most compatible with AD
                auto_bind=True,
                raise_exceptions=True
            )
            logger.info("Connected to AD: %s", self.config.server)
            return conn

        except LDAPSocketOpenError as e:
            raise ADConnectionError(
                f"Cannot reach AD server at {self.config.server}:{self.config.port}. "
                f"Check AD_SERVER in .env and ensure port {self.config.port} is open. "
                f"Original error: {str(e)}"
            )
        except LDAPBindError as e:
            raise ADConnectionError(
                f"Authentication failed for {self.config.admin_dn}. "
                f"Check AD_ADMIN_USERNAME and AD_ADMIN_PASSWORD in .env. "
                f"Original error: {str(e)}"
            )
        except LDAPException as e:
            raise ADConnectionError(f"LDAP error: {str(e)}")

    def test_connection(self) -> Dict[str, Any]:
        """Test if AD is reachable and credentials are valid"""
        if self.config.dry_run:
            return {
                "connected": True,
                "server": self.config.server,
                "domain": self.config.domain,
                "dry_run": True,
                "message": "DRY RUN mode — not actually connecting to AD"
            }

        try:
            conn = self.connect()
            conn.unbind()
            return {
                "connected": True,
                "server": self.config.server,
                "domain": self.config.domain,
                "dry_run": False,
                "message": "Successfully connected to Active Directory"
            }
        except ADConnectionError as e:
            return {
                "connected": False,
                "server": self.config.server,
                "domain": self.config.domain,
                "dry_run": False,
                "message": str(e)
            }

    def get_ous(self) -> List[Dict[str, str]]:
        """
        Fetch all Organizational Units from AD.
        Returns list of {name, dn, description}
        """
        if self.config.dry_run:
            # Return mock OUs for testing UI
            logger.info("[DRY RUN] Returning mock OU list")
            # -- COMMENTED OUT: Print dry run OU fetch --
            # print(f"[DRY RUN] Would fetch OUs from base: {self.config.base_dn}")
            return [
                {"name": "IT Department", "dn": f"OU=IT,{self.config.base_dn}", "description": "IT Staff"},
                {"name": "HR Department", "dn": f"OU=HR,{self.config.base_dn}", "description": "Human Resources"},
                {"name": "Finance", "dn": f"OU=Finance,{self.config.base_dn}", "description": "Finance Team"},
                {"name": "Management", "dn": f"OU=Management,{self.config.base_dn}", "description": "Management"},
                {"name": "Contractors", "dn": f"OU=Contractors,{self.config.base_dn}", "description": "External Contractors"},
            ]

        try:
            conn = self.connect()
            conn.search(
                search_base=self.config.base_dn,
                search_filter="(objectClass=organizationalUnit)",
                attributes=["ou", "description", "distinguishedName"]
            )
            ous = []
            for entry in conn.entries:
                ous.append({
                    "name": str(entry.ou) if entry.ou else "Unknown",
                    "dn": str(entry.distinguishedName),
                    "description": str(entry.description) if hasattr(entry, 'description') and entry.description else ""
                })
            conn.unbind()
            return ous
        except ADConnectionError:
            raise
        except Exception as e:
            logger.error("Failed to fetch OUs: %s", str(e))
            return []


# Singleton instance
ad_connector = ADConnector()
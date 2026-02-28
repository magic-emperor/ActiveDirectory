# Production Setup Guide

This guide explains how to transition the Active Directory User Creator from **Dry Run** (testing) mode to **Production** (live) mode.

## 1. Disable Dry Run Mode

By default, the application runs in "Dry Run" mode to safely test the UI and logic without actually modifying your Active Directory.

To enable live user creation, open your `Backend/.env` file and change:

```ini
AD_DRY_RUN=True
```

to:

```ini
AD_DRY_RUN=False
```

## 2. Configure Active Directory Credentials

You must provide a real Active Directory administrator account and the correct server details. Update the following fields in `Backend/.env`:

```ini
# The IP address or hostname of your Domain Controller
AD_SERVER=192.168.1.10

# Your internal domain name (e.g., company.local or company.com)
AD_DOMAIN=company.com

# The base Distinguished Name of your domain
AD_BASE_DN=DC=company,DC=com

# An administrator or service account with privileges to create AD users
AD_ADMIN_USER=admin
AD_ADMIN_PASSWORD=your_secure_password
```

## 3. (Optional) Enable Secure LDAP (LDAPS)

For production environments, it is highly recommended to use LDAPS (LDAP over SSL/TLS) to securely encrypt passwords over the network.

In `Backend/.env`:

```ini
# Change this to True
AD_USE_TLS=True

# LDAPS typically runs on port 636
AD_PORT=636
```

_Note: Your Active Directory Domain Controller must have a valid SSL/TLS certificate installed for LDAPS to work._

## 4. Default Organizational Unit (OU)

If you want to change the default OU that appears in the frontend dropdowns, update:

```ini
DEFAULT_OU=OU=IT,DC=company,DC=com
```

## 5. Restart the Backend

Whenever you modify the `.env` file, you **must** completely restart the backend server for the changes to take effect.

Stop the running server (`Ctrl+C` in the terminal) and start it again:

```powershell
python -m uvicorn main:app --reload --port 8080
```

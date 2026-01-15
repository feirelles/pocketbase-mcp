# Settings API

## Overview

The Settings API allows you to manage PocketBase application settings including app configuration, CORS, SMTP, admin accounts, and more.

## Get All Settings

```http
GET /api/settings
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "appName": "My App",
  "appUrl": "http://localhost:8090",
  "hideControls": false,
  "pageDirection": "ltr",
  "default.lang": "en",
  "smtp": {
    "enabled": false,
    "host": "",
    "port": 587,
    "username": "",
    "password": "",
    "tls": true,
    "fromEmail": "",
    "fromName": ""
  },
  "cors": {
    "enabled": true,
    "allowedOrigins": ["http://localhost:3000"],
    "allowedMethods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
    "allowedHeaders": ["Content-Type", "Authorization"]
  },
  "auth": {
    "passwordMinLength": 8,
    "passwordUppercase": false,
    "passwordLowercase": false,
    "passwordNumbers": false,
    "passwordSymbols": false,
    "requireEmailVerification": true,
    "allowEmailAuth": true,
    "allowOAuth2Auth": true,
    "allowUsernameAuth": false,
    "onlyEmailDomains": [],
    "exceptEmailDomains": [],
    "manageAccounts": false
  }
}
```

## Update Settings

```http
PATCH /api/settings
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "appName": "My App",
  "appUrl": "https://myapp.com",
  "cors": {
    "allowedOrigins": ["https://myapp.com", "https://admin.myapp.com"]
  },
  "smtp": {
    "enabled": true,
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "noreply@myapp.com",
    "password": "password",
    "tls": true,
    "fromEmail": "noreply@myapp.com",
    "fromName": "My App"
  }
}
```

## Test SMTP Configuration

```http
POST /api/settings/test/smtp
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "to": "test@example.com",
  "subject": "Test Email",
  "html": "<p>This is a test email</p>"
}
```

---

**Note:** This is a placeholder file. See [core/going_to_production.md](../core/going_to_production.md) for configuration guidance.

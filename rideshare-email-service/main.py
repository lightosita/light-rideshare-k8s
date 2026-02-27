from flask import Flask, request, jsonify
from flask_cors import CORS
from azure.communication.email import EmailClient
import os
import logging
from dotenv import load_dotenv
from datetime import datetime

# ────────────────────────────────────────────
# Setup: logging + environment
# ────────────────────────────────────────────

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# ────────────────────────────────────────────
# Required config – fail fast if missing
# ────────────────────────────────────────────

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
CONNECTION_STRING = os.getenv("AZURE_EMAIL_CONNECTION_STRING")

if not SENDER_EMAIL:
    logger.critical("❌ SENDER_EMAIL environment variable is required")
    raise RuntimeError("Missing SENDER_EMAIL")

if not CONNECTION_STRING:
    logger.critical("❌ AZURE_EMAIL_CONNECTION_STRING is required")
    raise RuntimeError("Missing AZURE_EMAIL_CONNECTION_STRING")

# ────────────────────────────────────────────
# Azure Email Client
# ────────────────────────────────────────────

email_client = None
try:
    email_client = EmailClient.from_connection_string(CONNECTION_STRING)
    logger.info("✅ Azure Email Client initialized")
except Exception as e:
    logger.error(f"Failed to initialize Azure Email Client: {e}")
    email_client = None  # allow mock/dev mode to continue

# ────────────────────────────────────────────
# OpenAPI + Swagger UI
# ────────────────────────────────────────────

@app.route('/api/v1/openapi.json')
def openapi_spec():
    """Returns OpenAPI 3.0 specification"""
    spec = {
        "openapi": "3.0.3",
        "info": {
            "title": "SwiftRide Email Service API",
            "description": "Microservice for sending verification and password reset emails via Azure Communication Services",
            "version": "1.0.0"
        },
        "servers": [
            {"url": "http://localhost:3002", "description": "Local development"},
            {"url": "/api", "description": "Relative server (production)"}
        ],
        "paths": {
            "/api/v1/email/send-verification": {
                "post": {
                    "tags": ["email"],
                    "summary": "Send email verification link",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["to", "verificationUrl"],
                                    "properties": {
                                        "to": {"type": "string", "format": "email", "example": "user@example.com"},
                                        "verificationUrl": {"type": "string", "format": "uri", "example": "https://app.swiftride.com/verify?token=abc123"},
                                        "subject": {"type": "string", "example": "Verify Your Email – SwiftRide"},
                                        "token": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Email sent successfully (or mocked in development)",
                            "content": {"application/json": {"example": {"success": True, "messageId": "abc123-xyz"}}}
                        },
                        "400": {"description": "Bad request – missing or invalid fields"},
                        "500": {"description": "Server error during email sending"}
                    }
                }
            },
            "/api/v1/email/send-password-reset": {
                "post": {
                    "tags": ["email"],
                    "summary": "Send password reset link",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["to", "resetUrl"],
                                    "properties": {
                                        "to": {"type": "string", "format": "email", "example": "user@example.com"},
                                        "resetUrl": {"type": "string", "format": "uri", "example": "https://app.swiftride.com/reset?token=def456"},
                                        "subject": {"type": "string", "example": "Reset Your Password – SwiftRide"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Reset email sent successfully (or mocked)",
                            "content": {"application/json": {"example": {"success": True}}}
                        },
                        "400": {"description": "Bad request – missing fields"},
                        "500": {"description": "Server error during email sending"}
                    }
                }
            },
            "/api/v1/email/health": {
                "get": {
                    "tags": ["health"],
                    "summary": "Health check endpoint",
                    "responses": {
                        "200": {"description": "Service status"}
                    }
                }
            }
        }
    }
    return jsonify(spec)


@app.route('/api/v1/docs')
def swagger_ui():
    """Serves Swagger UI documentation"""
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SwiftRide Email Service – API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
            window.onload = () => {
                SwaggerUIBundle({
                    url: "/api/v1/openapi.json",
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis
                    ],
                    displayOperationId: false,
                    displayRequestDuration: true,
                    filter: true,
                    persistAuthorization: true
                });
            };
        </script>
    </body>
    </html>
    '''


# ────────────────────────────────────────────
# Public routes
# ────────────────────────────────────────────

@app.route('/')
def root():
    return jsonify({
        "message": "SwiftRide Email Service 🚀",
        "documentation": "/api/v1/docs",
        "health": "/api/v1/email/health",
        "openapi": "/api/v1/openapi.json"
    })


@app.route('/api/v1/email/health')
def health():
    status = "healthy" if email_client else "degraded (mock/development mode)"
    return jsonify({
        "status": status,
        "service": "email-service",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "sender": SENDER_EMAIL
    })


@app.route('/api/v1/email/send-verification', methods=['POST'])
def send_verification():
    try:
        data = request.get_json(silent=True) or {}
        to_email = data.get('to')
        verification_url = data.get('verificationUrl')
        subject = data.get('subject', 'Verify Your Email – SwiftRide')

        if not to_email or not verification_url:
            return jsonify({"error": "Missing required fields: 'to' and 'verificationUrl'"}), 400

        logger.info(f"Sending verification email to {to_email}")

        message = {
            "senderAddress": SENDER_EMAIL,
            "recipients": {"to": [{"address": to_email}]},
            "content": {
                "subject": subject,
                "plainText": f"Verify your email:\n\n{verification_url}\n\nThis link expires soon.",
                "html": f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;">
    <h1 style="color:#1d4ed8;margin-bottom:24px;">Welcome to SwiftRide</h1>
    <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
    
    <div style="text-align:center;margin:32px 0;">
        <a href="{verification_url}"
           style="display:inline-block;background:#1d4ed8;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:500;">
            Verify Email Address
        </a>
    </div>
    
    <p style="color:#4b5563;font-size:14px;">
        Button not working? Copy this link:<br>
        <a href="{verification_url}" style="color:#1d4ed8;word-break:break-all;">{verification_url}</a>
    </p>
    
    <p style="color:#6b7280;font-size:13px;margin-top:40px;">
        This verification link expires in 30 minutes for security.
    </p>
</body>
</html>"""
            }
        }

        if email_client:
            poller = email_client.begin_send(message)
            result = poller.result()
            msg_id = getattr(result, 'message_id', '')
            logger.info(f"Email sent to {to_email} → message ID: {msg_id}")
            return jsonify({"success": True, "messageId": msg_id})
        else:
            logger.warning("Mock mode: Azure client unavailable")
            print("\n" + "═" * 70)
            print("  MOCK VERIFICATION EMAIL SENT")
            print(f"  To:      {to_email}")
            print(f"  Subject: {subject}")
            print(f"  Link:    {verification_url}")
            print("═" * 70 + "\n")
            return jsonify({
                "success": True,
                "mock": True,
                "message": "Development mode – email printed to console"
            }), 200

    except Exception as e:
        err = str(e)
        logger.error(f"Email send failed for {to_email}: {err}")

        if any(x in err for x in ["DomainNotLinked", "Unauthorized", "Authentication"]):
            logger.warning("Azure domain/auth issue → using mock fallback")
            print(f"\n--- MOCK VERIFICATION EMAIL ---\nTO: {to_email}\nLINK: {verification_url}\n---\n")
            return jsonify({
                "success": True,
                "mock": True,
                "note": "Azure domain not linked → real emails won't be delivered"
            }), 200

        return jsonify({"success": False, "error": err}), 500


@app.route('/api/v1/email/send-password-reset', methods=['POST'])
def send_password_reset():
    try:
        data = request.get_json(silent=True) or {}
        to_email = data.get('to')
        reset_url = data.get('resetUrl')
        subject = data.get('subject', 'Reset Your Password – SwiftRide')

        if not to_email or not reset_url:
            return jsonify({"error": "Missing required fields: 'to' and 'resetUrl'"}), 400

        logger.info(f"Sending password reset email to {to_email}")

        message = {
            "senderAddress": SENDER_EMAIL,
            "recipients": {"to": [{"address": to_email}]},
            "content": {
                "subject": subject,
                "plainText": f"Reset your password here:\n\n{reset_url}\n\nThis link expires soon.",
                "html": f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;">
    <h1 style="color:#1d4ed8;margin-bottom:24px;">SwiftRide Password Reset</h1>
    <p>We received a request to reset your password.</p>
    <p>Click the button below to set a new password:</p>
    
    <div style="text-align:center;margin:32px 0;">
        <a href="{reset_url}"
           style="display:inline-block;background:#1d4ed8;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:500;">
            Reset Password
        </a>
    </div>
    
    <p style="color:#4b5563;font-size:14px;">
        Button not working? Copy this link:<br>
        <a href="{reset_url}" style="color:#1d4ed8;word-break:break-all;">{reset_url}</a>
    </p>
    
    <p style="color:#6b7280;font-size:13px;margin-top:40px;">
        This reset link expires in 30 minutes for security. If you did not request this, please ignore this email.
    </p>
</body>
</html>"""
            }
        }

        if email_client:
            poller = email_client.begin_send(message)
            result = poller.result()
            msg_id = getattr(result, 'message_id', '')
            logger.info(f"Reset email sent to {to_email} → message ID: {msg_id}")
            return jsonify({"success": True, "messageId": msg_id})
        else:
            logger.warning("Mock mode: Azure client unavailable")
            print("\n" + "═" * 70)
            print("  MOCK PASSWORD RESET EMAIL SENT")
            print(f"  To:      {to_email}")
            print(f"  Subject: {subject}")
            print(f"  Link:    {reset_url}")
            print("═" * 70 + "\n")
            return jsonify({
                "success": True,
                "mock": True,
                "message": "Development mode – reset email printed to console"
            }), 200

    except Exception as e:
        err = str(e)
        logger.error(f"Reset email failed for {to_email}: {err}")

        if any(x in err for x in ["DomainNotLinked", "Unauthorized", "Authentication"]):
            logger.warning("Azure domain/auth issue → using mock fallback")
            print(f"\n--- MOCK PASSWORD RESET EMAIL ---\nTO: {to_email}\nLINK: {reset_url}\n---\n")
            return jsonify({
                "success": True,
                "mock": True,
                "note": "Azure domain not linked → real emails won't be delivered"
            }), 200

        return jsonify({"success": False, "error": err}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3002))
    logger.info(f"Starting server on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
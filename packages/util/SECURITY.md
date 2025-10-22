# Security Policy

## Supported Versions

We actively support the following versions of @g-1/util with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | ✅ Yes             |
| 1.1.x   | ✅ Yes             |
| 1.0.x   | ⚠️ End of Life     |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

We take the security of @g-1/util seriously. If you discover a security vulnerability, please follow these steps:

### 🔒 Private Disclosure

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: **dev@golive.me**

Include the following information:
- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### 📋 What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Investigation**: We will investigate and validate the vulnerability within 5 business days.
- **Updates**: We will send you regular updates about our progress.
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days.
- **Credit**: We will credit you in our security advisory unless you prefer to remain anonymous.

### 🛡️ Security Best Practices

When using @g-1/util:

- Always use the latest version when possible
- Validate and sanitize inputs when using utility functions
- Be cautious when using node utilities in production environments
- Regularly audit your dependencies using `npm audit` or `bun audit`

### 📞 Contact

For any security-related questions or concerns:
- Email: dev@golive.me
- Please include "SECURITY" in the subject line

Thank you for helping keep @g-1/util and our users safe!

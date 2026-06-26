# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.4.x   | :white_check_mark: |
| < 1.4.x | :x:                |

## Reporting a Vulnerability

**Do NOT open a public issue.**

Report security vulnerabilities to: **postmaster@openoba.com**

We respond within 48 hours. Please include:
- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact

## Security Principles

OpenOBA Core is a deterministic agent execution runtime. Security is enforced through:

1. **Action Guard** — All LLM tool calls validated against ERDL entity rules before execution
2. **URL Validation** — SSRF prevention for all user-controlled HTTP requests
3. **Path Sandbox** — File system operations restricted to project root
4. **Command Whitelist** — Shell commands use allowlist validation
5. **API Key Encryption** — Keys stored with PBKDF2-derived AES-256-GCM

## Audit Trail

All agent decisions are logged to `cognitive_log` with full traceability. Run IDs link actions to sessions and tasks.

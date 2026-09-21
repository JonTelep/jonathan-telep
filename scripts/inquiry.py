"""Local inquiry proxy so nginx can POST /api/request without Node in production.

Mirrors TelepIO src/app/api/contact/route.ts:
Resend → jon@telep.io, same RESEND_API_KEY / RESEND_FROM_EMAIL names.
Visitor email is free-form (reply_to + body). Never used as Resend `from`.
Optional TELEP_CONTACT_URL forwards to the studio API (same inbox) if Resend fails.
"""
from __future__ import annotations

import html
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("INQUIRY_PORT", "6006") or "6006")
TO_EMAIL = "jon@telep.io"
DEFAULT_FROM = "TelepIO Contact <hello@contact.telep.io>"

ALLOWED_NEEDS = {
    "site-it": "site / IT for a business",
    "custom-software": "custom software",
    "data-integration": "data / integration",
    "other": "other",
}


def nonempty(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value and value.strip():
        return value.strip()
    return default


CONTACT_URL = nonempty("TELEP_CONTACT_URL")
RESEND_KEY = nonempty("RESEND_API_KEY")
RESEND_FROM = nonempty("RESEND_FROM_EMAIL", DEFAULT_FROM)
RESEND_URL = nonempty("RESEND_API_URL", "https://api.resend.com/emails")


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def compose_content(name: str, email: str, need: str, message: str, times: str) -> str:
    lines = [
        f"Name: {name}",
        f"Email: {email}",
        f"Need: {need}",
    ]
    if times:
        lines.append(f"Preferred times: {times}")
    lines.extend(["Source: jonathantelep.com/request", "", message or "(no extra note)"])
    return "\n".join(lines)


def post_json(url: str, payload: dict, extra_headers: dict | None = None) -> tuple[int, dict, str]:
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                parsed = {}
            return resp.getcode(), parsed, raw
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {}
        return err.code, parsed, raw
    except urllib.error.URLError as err:
        reason = str(getattr(err, "reason", err))
        return 0, {"error": reason}, reason


def send_resend(email: str, content: str) -> bool:
    if not RESEND_KEY:
        return False
    status, parsed, raw = post_json(
        RESEND_URL,
        {
            "from": RESEND_FROM,
            "to": [TO_EMAIL],
            "reply_to": email,
            "subject": f"[jonathantelep.com/request] from {email}",
            "text": f"From: {email}\n\n{content}",
            "html": (
                f"<p><strong>From:</strong> {html.escape(email)}</p>"
                f'<pre style="font-family:inherit;white-space:pre-wrap">{html.escape(content)}</pre>'
            ),
        },
        extra_headers={"Authorization": f"Bearer {RESEND_KEY}"},
    )
    if not (200 <= status < 300):
        detail = (raw or json.dumps(parsed))[:2000]
        print(f"[inquiry] resend HTTP {status}: {detail}", flush=True)
        return False
    return True


def telep_contact_payload(email: str, content: str) -> dict:
    # TelepIO /api/contact: { email, content, website }. website="" is the honeypot.
    return {"email": email, "content": content, "website": ""}


def forward_telep(email: str, content: str) -> bool:
    if not CONTACT_URL or CONTACT_URL == "off":
        return False
    status, data, raw = post_json(CONTACT_URL, telep_contact_payload(email, content))
    ok = 200 <= status < 300 and data.get("ok") is True
    if not ok:
        detail = (raw or json.dumps(data))[:2000]
        print(f"[inquiry] telep.io forward HTTP {status}: {detail}", flush=True)
    return ok


def health_payload() -> dict:
    return {
        "ok": True,
        "service": "inquiry",
        "resend": bool(RESEND_KEY),
        "fallback": bool(CONTACT_URL and CONTACT_URL != "off"),
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[inquiry] {self.address_string()} - {fmt % args}", flush=True)

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("/health", "/api/request/health"):
            json_response(self, 200, health_payload())
            return
        json_response(self, 404, {"error": "not found"})

    def do_POST(self) -> None:
        try:
            self._handle_post()
        except Exception as err:
            print(f"[inquiry] unhandled POST error: {err}", flush=True)
            try:
                json_response(self, 500, {"error": "failed to send message"})
            except Exception:
                pass

    def _handle_post(self) -> None:
        if self.path.split("?", 1)[0] != "/api/request":
            json_response(self, 404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            json_response(self, 400, {"error": "invalid json"})
            return
        if length > 20000:
            json_response(self, 413, {"error": "payload too large"})
            return
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            json_response(self, 400, {"error": "invalid json"})
            return
        if not isinstance(body, dict):
            json_response(self, 400, {"error": "invalid json"})
            return

        if str(body.get("website") or "").strip():
            json_response(self, 200, {"ok": True})
            return

        name = str(body.get("name") or "").strip()
        email = str(body.get("email") or "").strip()
        need_key = str(body.get("need") or "").strip()
        message = str(body.get("message") or "").strip()
        times = str(body.get("preferredTimes") or body.get("times") or "").strip()

        if len(name) < 2 or len(name) > 120:
            json_response(self, 400, {"error": "name is required"})
            return
        if "@" not in email or "." not in email.split("@")[-1] or len(email) > 200:
            json_response(self, 400, {"error": "invalid email"})
            return
        if need_key not in ALLOWED_NEEDS:
            json_response(self, 400, {"error": "pick what you need"})
            return
        if len(message) > 4000:
            json_response(self, 400, {"error": "message is too long"})
            return
        if len(times) > 400:
            json_response(self, 400, {"error": "preferred times is too long"})
            return

        content = compose_content(name, email, ALLOWED_NEEDS[need_key], message, times)
        delivered = False
        try:
            delivered = send_resend(email, content)
        except Exception as err:
            print(f"[inquiry] resend failed: {err}", flush=True)
        if not delivered:
            try:
                delivered = forward_telep(email, content)
            except Exception as err:
                print(f"[inquiry] telep.io forward failed: {err}", flush=True)
        if not delivered:
            if not RESEND_KEY and (not CONTACT_URL or CONTACT_URL == "off"):
                json_response(self, 500, {"error": "contact form not configured"})
                return
            # 500 not 502: Cloudflare replaces origin 502 with a generic text page.
            json_response(self, 500, {"error": "failed to send message"})
            return
        json_response(self, 200, {"ok": True})


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(
        f"[inquiry] listening on 127.0.0.1:{PORT} "
        f"resend={'yes' if RESEND_KEY else 'NO KEY'} "
        f"from={RESEND_FROM} "
        f"fallback={CONTACT_URL or 'off'}",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()

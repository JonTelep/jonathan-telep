"""Local inquiry proxy so nginx can POST /api/request without Node in production.

Mirrors TelepIO src/app/api/contact/route.ts:
Resend → jon@telep.io, same RESEND_API_KEY / RESEND_FROM_EMAIL names.
Optional TELEP_CONTACT_URL forwards to the studio API (same inbox) if Resend is unset.
"""
from __future__ import annotations

import html
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("INQUIRY_PORT", "6006"))
CONTACT_URL = os.environ.get("TELEP_CONTACT_URL", "")
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM_EMAIL", "TelepIO Contact <hello@contact.telep.io>")
RESEND_URL = os.environ.get("RESEND_API_URL", "https://api.resend.com/emails")
TO_EMAIL = "jon@telep.io"

ALLOWED_NEEDS = {
    "site-it": "site / IT for a business",
    "custom-software": "custom software",
    "data-integration": "data / integration",
    "other": "other",
}


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def compose_content(name: str, need: str, message: str, times: str) -> str:
    lines = [
        f"Name: {name}",
        f"Need: {need}",
    ]
    if times:
        lines.append(f"Preferred times: {times}")
    lines.extend(["Source: jonathantelep.com/request", "", message or "(no extra note)"])
    return "\n".join(lines)


def post_json(url: str, payload: dict, extra_headers: dict | None = None) -> tuple[int, dict]:
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
            return resp.getcode(), parsed
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {}
        return err.code, parsed


def send_resend(email: str, content: str) -> bool:
    if not RESEND_KEY:
        return False
    status, _ = post_json(
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
    return 200 <= status < 300


def forward_telep(email: str, content: str) -> bool:
    if not CONTACT_URL or CONTACT_URL == "off":
        return False
    status, data = post_json(CONTACT_URL, {"email": email, "content": content, "website": ""})
    return 200 <= status < 300 and data.get("ok") is True


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[inquiry] {self.address_string()} - {fmt % args}")

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/health":
            json_response(self, 200, {"ok": True, "service": "inquiry"})
            return
        json_response(self, 404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/request":
            json_response(self, 404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or "0")
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

        content = compose_content(name, ALLOWED_NEEDS[need_key], message, times)
        delivered = False
        via_resend = False
        try:
            via_resend = send_resend(email, content)
            delivered = via_resend
        except Exception as err:
            print(f"[inquiry] resend failed: {err}")
        if not delivered:
            try:
                delivered = forward_telep(email, content)
            except Exception as err:
                print(f"[inquiry] telep.io forward failed: {err}")
        if not delivered:
            if not RESEND_KEY and (not CONTACT_URL or CONTACT_URL == "off"):
                json_response(self, 500, {"error": "contact form not configured"})
                return
            json_response(self, 502, {"error": "failed to send message"})
            return
        json_response(self, 200, {"ok": True})


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[inquiry] listening on 127.0.0.1:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

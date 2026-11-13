"""Pre-publish checks for the Vision and Image Processing site.

    python tools/check.py

Broken local links: every href/src in docs/**/*.html that points to a local file must exist.
Exit code 1 if anything needs attention.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")

bad = 0
for d, _, fs in os.walk(DOCS):
    for f in fs:
        if not f.endswith(".html"):
            continue
        p = os.path.join(d, f)
        s = open(p, encoding="utf8").read()
        for url in re.findall(r'(?:href|src)="([^"]+)"', s):
            if re.match(r"^(https?:|mailto:|data:|#|javascript:)", url) or "${" in url:
                continue
            target = os.path.normpath(os.path.join(d, url.split("#")[0].split("?")[0]))
            if not os.path.exists(target):
                print(f"BROKEN  {os.path.relpath(p, DOCS)} -> {url}")
                bad += 1
print("OK" if not bad else f"{bad} item(s) need attention")
sys.exit(1 if bad else 0)

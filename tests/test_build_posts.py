#!/usr/bin/env python3
"""Tests for scripts/build_posts.py.  Run:  python tests/test_build_posts.py

Uses tests/posts.json (synthetic posts) and builds into a temporary copy of the site,
so it never touches the real pages or calls the live API.
"""
import glob
import hashlib
import html.parser
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.dom.minidom
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
SCRIPT = REPO / "scripts" / "build_posts.py"
FIXTURE = json.loads((HERE / "posts.json").read_text(encoding="utf-8"))
FONT_DIR = os.environ.get("FONT_DIR", str(REPO / ".fonts-cache"))
passed = 0


def check(name, cond, detail=""):
    global passed
    if not cond:
        print(f"FAIL - {name} {detail}")
        sys.exit(1)
    passed += 1
    print(f"ok   - {name}")


def build(site: Path, posts=None, api_url=None):
    env = dict(os.environ, SITE_ROOT=str(site), FONT_DIR=FONT_DIR, API_ATTEMPTS="1")
    env.pop("POSTS_JSON", None)
    if posts is not None:
        f = site / "_posts.json"
        f.write_text(json.dumps(posts, ensure_ascii=False), encoding="utf-8")
        env["POSTS_JSON"] = str(f)
    if api_url:
        env["API_URL"] = api_url
    r = subprocess.run([sys.executable, str(SCRIPT)], env=env, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
    return r


def page(site, slug):
    return (site / "posts" / slug / "index.html").read_text(encoding="utf-8")


def tree_hash(site):
    h = hashlib.sha256()
    for f in sorted(glob.glob(str(site / "posts" / "**" / "*"), recursive=True)) + [
            str(site / "sitemap.xml"), str(site / "feed.xml"), str(site / "og-default.png")]:
        if os.path.isfile(f):
            h.update(f.encode())
            h.update(Path(f).read_bytes())
    return h.hexdigest()


class Balance(html.parser.HTMLParser):
    VOID = {"meta", "link", "br", "img", "input", "hr"}

    def __init__(self):
        super().__init__()
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(tag)


def main():
    tmp = Path(tempfile.mkdtemp())
    site = tmp / "site"
    shutil.copytree(REPO, site, ignore=shutil.ignore_patterns(".git", "tests", ".fonts-cache", "posts",
                                                              "sitemap.xml", "feed.xml", "og-default.png"))
    try:
        r = build(site, FIXTURE)
        check("build succeeds", r.returncode == 0, r.stderr[-500:])

        slugs = sorted(p.name for p in (site / "posts").iterdir() if p.is_dir())
        check("one page per post", len(slugs) == len(FIXTURE), slugs)
        check("duplicate titles get unique links", "the-world-is-loud-with-bad-advice" in slugs
              and "the-world-is-loud-with-bad-advice-31" in slugs)
        check("curly-quoted title makes a clean link", "heaven-knows-why" in slugs)
        check("apostrophes are dropped, not turned into hyphens", "heres-what-aint-right" in slugs)

        for s in slugs:
            b = Balance()
            b.feed(page(site, s))
            check(f"well-formed HTML: {s}", not b.errors and not b.stack, (b.errors[:3], b.stack[-3:]))
            img = site / "posts" / s / "card.png"
            check(f"preview image 1200x630: {s}", img.exists() and img.read_bytes()[16:24] ==
                  (1200).to_bytes(4, "big") + (630).to_bytes(4, "big"))

        x = page(site, "the-world-is-loud-with-bad-advice-31")
        body = re.search(r'<div class="post-body">(.*?)</div>\n', x, re.S).group(1)
        check("scripts stripped from post body", "<script" not in body and "alert(" not in body)
        check("event handlers and javascript: links stripped", "onclick" not in body and "onerror" not in x
              and "javascript:" not in body)
        check("safe links kept", 'href="https://example.com"' in body)
        check("no raw <script> from data anywhere", "<script>alert" not in x)

        m = page(site, "a-members-only-essay-about-very-long-titles-that-should-wrap-neatly")
        check("members post shows only first paragraph", "SECRET" not in m and "Public opening paragraph" in m)
        check("members post shows paywall", "Members Only" in m and '"isAccessibleForFree": false' in m)

        h = page(site, "heaven-knows-why")
        url = "https://sifonaniefiok.github.io/posts/heaven-knows-why/"
        for needle in [f'<link rel="canonical" href="{url}">', f'<meta property="og:url" content="{url}">',
                       f'<meta property="og:image" content="{url}card.png">',
                       '<meta name="twitter:card" content="summary_large_image">',
                       '<meta property="og:type" content="article">']:
            check(f"meta tag present: {needle[:48]}…", needle in h)
        check("bare read time '3' shown as '3 min read'", "Essays · 3 min read" in h)
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S).group(1))
        check("structured data valid", ld["@type"] == "BlogPosting" and ld["datePublished"].startswith("2026-03-19"))
        check("share buttons present", all(k in h for k in ['data-share="x"', 'data-share="whatsapp"',
                                                           'data-share="copy"', 'data-share="native"']))
        check("related posts linked", h.count('class="more-item"') == 3)
        check("stale AdSense ID not used", "7939660578002066" not in h)

        for f in ("sitemap.xml", "feed.xml"):
            xml.dom.minidom.parse(str(site / f))
        sm = (site / "sitemap.xml").read_text()
        check("sitemap lists home + every post", sm.count("<url>") == len(FIXTURE) + 1)
        manifest = json.loads((site / "posts" / "index.json").read_text())
        check("manifest maps every id to a link", {p["id"] for p in manifest["posts"]} == {p["id"] for p in FIXTURE})

        first = tree_hash(site)
        build(site, FIXTURE)
        check("rebuilding with no changes produces identical files", tree_hash(site) == first)

        # Title change: new link, old link redirects.
        changed = json.loads(json.dumps(FIXTURE))
        next(p for p in changed if p["id"] == 13)["title"] = "Security Is a Way of Thinking"
        build(site, changed)
        check("renamed post gets its new link", (site / "posts" / "security-is-a-way-of-thinking" / "index.html").exists())
        old = page(site, "security-is-a-philosophy-not-a-feature")
        check("old link redirects to the new one", 'url=/posts/security-is-a-way-of-thinking/' in old)

        # Deletion: page removed, sitemap updated.
        fewer = [p for p in changed if p["id"] != 1]
        build(site, fewer)
        check("deleted post's page removed", not (site / "posts" / "heaven-knows-why").exists())
        check("deleted post removed from sitemap", "heaven-knows-why" not in (site / "sitemap.xml").read_text())

        # Backend down: nothing is wiped.
        before = tree_hash(site)
        r = build(site, api_url="http://127.0.0.1:9")
        check("API outage exits cleanly", r.returncode == 0 and "Keeping the existing pages" in r.stdout)
        check("API outage leaves existing pages untouched", tree_hash(site) == before)
        r = build(site, posts=[])
        check("empty API response leaves pages untouched", tree_hash(site) == before)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\nAll {passed} checks passed.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Build shareable, search-friendly pages for every blog post.

For each post published through the site's admin panel this writes:
  posts/<slug>/index.html   full article with preview-card (Open Graph / Twitter) tags
  posts/<slug>/card.png     1200x630 preview image shown when the link is shared
It also writes:
  posts/index.json          id -> link map the main site uses for its share buttons
  sitemap.xml               every page, so Google can find each post
  feed.xml                  RSS feed
  og-default.png            preview image for the homepage

Runs in GitHub Actions (.github/workflows/build-posts.yml) every hour and on demand.
Needs: Python 3.10+, Pillow, nh3.   Run locally:  python scripts/build_posts.py
"""
from __future__ import annotations

import html
import json
import os
import re
import shutil
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

import nh3
from PIL import Image, ImageDraw, ImageFont

# ── Settings ──────────────────────────────────────────────────────────────────
ROOT = Path(os.environ.get("SITE_ROOT", Path(__file__).resolve().parent.parent))
API_URL = os.environ.get("API_URL", "https://sifon-backend-production.up.railway.app").rstrip("/")
SITE_URL = os.environ.get("SITE_URL", "https://sifonaniefiok.github.io").rstrip("/")
FONT_DIR = Path(os.environ.get("FONT_DIR", ROOT / ".fonts-cache"))
POSTS_JSON = os.environ.get("POSTS_JSON")  # optional: read posts from a file instead of the API

AUTHOR = "Sifon Imahjnr"
AUTHOR_FULL = "Sifon Aniefiok Imaikop"
TWITTER = "@Sifon_Imahjnr"
SITE_NAME = "Sifon Imahjnr — Writer & Engineer"
SITE_DESC = "Essays, poems, and ideas from a software engineering and cybersecurity student."
NEWSLETTER = "https://sifons-newsletter-f3fd43.beehiiv.com"
COFFEE = "https://buymeacoffee.com/Sifon"
GA_ID = "G-2Y1MTQWW3W"
ADSENSE = "ca-pub-3988501910661269"

POSTS_DIR = ROOT / "posts"
MANIFEST = POSTS_DIR / "index.json"

COLORS = {
    "cream": (250, 248, 243), "ink": (26, 24, 20), "ink_soft": (74, 70, 64),
    "ink_muted": (154, 148, 144), "accent": (196, 113, 58), "border": (232, 228, 221),
}
FONTS = {  # google/fonts repository paths (SIL Open Font License)
    "serif": "ofl/cormorantgaramond/CormorantGaramond[wght].ttf",
    "serif_italic": "ofl/cormorantgaramond/CormorantGaramond-Italic[wght].ttf",
    "sans": "ofl/dmsans/DMSans[opsz,wght].ttf",
    "mono": "ofl/dmmono/DMMono-Regular.ttf",
}


def log(msg: str) -> None:
    print(msg, flush=True)


# ── Fetching ──────────────────────────────────────────────────────────────────
def http_json(url: str, attempts: int = int(os.environ.get("API_ATTEMPTS", 4)), timeout: int = 60):
    """GET JSON, retrying — the backend sleeps when idle and can take ~30s to wake."""
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "post-page-builder", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 — any network failure is retried
            last = e
            log(f"  attempt {i + 1}/{attempts} for {url} failed: {e}")
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"Could not fetch {url}: {last}")


def fetch_posts() -> list[dict]:
    if POSTS_JSON:
        return json.loads(Path(POSTS_JSON).read_text(encoding="utf-8"))
    listing = http_json(f"{API_URL}/api/posts").get("posts") or []
    full = []
    for p in listing:
        detail = http_json(f"{API_URL}/api/posts/{p['id']}").get("post")
        if not detail or not detail.get("content"):
            raise RuntimeError(f"Post {p['id']} came back without content")
        full.append(detail)
    return full


# ── Text helpers ──────────────────────────────────────────────────────────────
def slugify(title: str) -> str:
    t = re.sub(r"['\u2019\u2018`]", "", title)  # "Here's" -> "heres", not "here-s"
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii").lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    if len(t) > 70:
        t = t[:70].rsplit("-", 1)[0]
    return t


def clean_title(title: str) -> str:
    """Titles like “Heaven Knows Why” keep their quotes on the page but not in image text wrapping."""
    return " ".join(title.split())


def sanitize(content: str) -> str:
    """Only allow the simple formatting the editor produces — nothing that can run code."""
    return nh3.clean(
        content,
        tags={"p", "br", "h2", "h3", "em", "strong", "i", "b", "blockquote", "ul", "ol", "li", "a"},
        attributes={"a": {"href"}},
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer nofollow",
    )


def plain_text(content_html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", content_html)
    text = re.sub(r"</(p|h2|h3|li|blockquote)>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(re.sub(r"\n{3,}", "\n\n", text)).strip()


def first_paragraph(content_html: str) -> str:
    m = re.search(r"<p>.*?</p>", content_html, re.S)
    return m.group(0) if m else ""


def esc(s: str) -> str:
    return html.escape(s or "", quote=True)


def iso(dt: str | None) -> str | None:
    if not dt:
        return None
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat(timespec="seconds")
    except ValueError:
        return None


def read_time(p: dict) -> str:
    rt = str(p.get("read_time") or "").strip()
    if rt.isdigit():  # some older posts stored just "3"
        rt += " min poem" if p.get("type") == "Poetry" else " min read"
    return rt


# ── Fonts & preview images ────────────────────────────────────────────────────
def ensure_fonts() -> dict[str, Path]:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}
    for key, repo_path in FONTS.items():
        dest = FONT_DIR / Path(repo_path).name
        if not dest.exists() or dest.stat().st_size < 10_000:
            url = "https://raw.githubusercontent.com/google/fonts/main/" + urllib.request.quote(repo_path)
            log(f"  downloading font {dest.name}")
            with urllib.request.urlopen(url, timeout=60) as r:
                dest.write_bytes(r.read())
        paths[key] = dest
    return paths


class Fonts:
    def __init__(self, paths: dict[str, Path]):
        self.paths = paths

    def get(self, key: str, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
        f = ImageFont.truetype(str(self.paths[key]), size)
        if weight is not None:
            axes = f.get_variation_axes()
            values = []
            for ax in axes:
                name = ax.get("name", b"")
                name = name.decode() if isinstance(name, bytes) else str(name)
                if name.lower().startswith("weight") or name.lower() == "wght":
                    values.append(max(ax["minimum"], min(ax["maximum"], weight)))
                elif "optical" in name.lower() or name.lower() == "opsz":
                    values.append(max(ax["minimum"], min(ax["maximum"], size * 0.75)))
                else:
                    values.append(ax.get("default", ax["minimum"]))
            f.set_variation_by_axes(values)
        return f


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def clamp_lines(draw, lines: list[str], font, max_w: int, max_lines: int) -> list[str]:
    if len(lines) <= max_lines:
        return lines
    kept = lines[:max_lines]
    last = kept[-1]
    while last and draw.textlength(last + "…", font=font) > max_w:
        last = last.rsplit(" ", 1)[0] if " " in last else last[:-1]
    kept[-1] = last.rstrip(",;:—-") + "…"
    return kept


def fit_title(draw, fonts: Fonts, title: str, key: str, max_w: int, max_h: int, weight: int):
    """Largest font size (88→40) whose wrapped title fits in the box."""
    for size in range(88, 38, -2):
        font = fonts.get(key, size, weight)
        lines = wrap(draw, title, font, max_w)
        line_h = int(size * 1.08)
        if len(lines) * line_h <= max_h:
            return font, lines, line_h
    font = fonts.get(key, 40, weight)
    return font, clamp_lines(draw, wrap(draw, title, font, max_w), font, max_w, max_h // 44), 44


def render_card(fonts: Fonts, dest: Path, *, kicker: str, title: str, excerpt: str, poem: bool) -> None:
    W, H, PAD = 1200, 630, 80
    bg = COLORS["ink"] if poem else COLORS["cream"]
    fg = COLORS["cream"] if poem else COLORS["ink"]
    soft = (200, 196, 188) if poem else COLORS["ink_soft"]
    muted = (140, 134, 126) if poem else COLORS["ink_muted"]
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)

    if poem:  # big faint quote mark, like the poem cards on the site
        q = fonts.get("serif", 420, 400)
        d.text((W - 300, -60), "”", font=q, fill=(58, 44, 34))
    else:
        d.rectangle([0, 0, 10, H], fill=COLORS["accent"])

    mono = fonts.get("mono", 22)
    d.text((PAD, PAD - 6), kicker.upper(), font=mono, fill=COLORS["accent"])

    title_key = "serif_italic" if poem else "serif"
    tfont, tlines, lh = fit_title(d, fonts, title, title_key, W - 2 * PAD - 40, 250, 500)
    y = PAD + 50
    for line in tlines:
        d.text((PAD, y), line, font=tfont, fill=fg)
        y += lh

    y += 22
    efont = fonts.get("serif_italic", 30, 400) if poem else fonts.get("sans", 26, 400)
    e_lines = clamp_lines(d, wrap(d, excerpt, efont, W - 2 * PAD - 40), efont, W - 2 * PAD - 40,
                          max(1, min(3, (H - 130 - y) // 40)))
    for line in e_lines:
        d.text((PAD, y), line, font=efont, fill=soft)
        y += 40

    d.line([(PAD, H - 108), (W - PAD, H - 108)], fill=(60, 56, 50) if poem else COLORS["border"], width=2)
    logo = fonts.get("serif", 34, 600)
    d.text((PAD, H - 88), "S", font=logo, fill=fg)
    sx = PAD + d.textlength("S", font=logo)
    d.text((sx, H - 88), ".", font=logo, fill=COLORS["accent"])
    d.text((sx + d.textlength(".", font=logo), H - 88), "I", font=logo, fill=fg)
    name = fonts.get("sans", 24, 500)
    d.text((PAD + 70, H - 80), AUTHOR, font=name, fill=fg)
    host = SITE_URL.split("//", 1)[-1]
    d.text((W - PAD - d.textlength(host, font=mono), H - 78), host, font=mono, fill=muted)

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)


# ── HTML ──────────────────────────────────────────────────────────────────────
def site_css() -> str:
    """Reuse the main site's stylesheet so post pages always match it."""
    src = (ROOT / "index.html").read_text(encoding="utf-8")
    m = re.search(r"<style>(.*?)</style>", src, re.S)
    if not m:
        raise RuntimeError("Could not find the <style> block in index.html")
    return m.group(1).strip()


EXTRA_CSS = """
/* post pages */
.post-page{display:block}
.post-nav-links a{cursor:pointer}
.post-byline{font-family:'DM Mono',monospace;font-size:13px;color:var(--ink-muted);}
.more-writing{max-width:720px;margin:0 auto;padding:0 48px 96px;}
.more-writing h2{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;margin-bottom:24px;}
.more-writing h2 em{color:var(--accent);}
.more-list{display:grid;gap:16px;}
.more-item{display:block;padding:24px 28px;background:var(--card-bg);border:1px solid var(--border);text-decoration:none;color:var(--ink);transition:transform .2s,border-color .2s;}
.more-item:hover{transform:translateY(-3px);border-color:var(--accent);}
.more-item .card-tag{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);}
.more-item .t{font-family:'Cormorant Garamond',serif;font-size:24px;line-height:1.25;margin:6px 0;}
.more-item .x{font-size:15px;color:var(--ink-soft);line-height:1.6;}
@media(max-width:700px){.more-writing{padding:0 24px 72px}}
"""

SHARE_JS = """
(function(){
  var bar=document.querySelector('.share-bar'); if(!bar) return;
  var url=bar.dataset.url, title=bar.dataset.title;
  if(navigator.share){var n=bar.querySelector('.share-native'); if(n) n.hidden=false;}
  bar.addEventListener('click',function(e){
    var b=e.target.closest('[data-share]'); if(!b) return;
    var kind=b.dataset.share;
    if(kind==='copy'){
      (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){
        var t=b.textContent; b.textContent='Link copied ✓'; setTimeout(function(){b.textContent=t},1800);
      }).catch(function(){window.prompt('Copy this link:',url);});
    } else if(kind==='native'){
      navigator.share({title:title,url:url}).catch(function(){});
    }
    if(window.gtag) gtag('event','share',{method:kind,content_type:'post',item_id:url});
  });
})();
document.addEventListener('contextmenu',function(e){e.preventDefault();});
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&['c','a','u','s','p'].indexOf(e.key.toLowerCase())>-1) e.preventDefault();
});
function toggleMenu(){document.getElementById('navLinks').classList.toggle('open');}
"""


def share_bar(url: str, title: str, excerpt: str) -> str:
    u = urllib.request.quote(url, safe="")
    t = urllib.request.quote(title, safe="")
    wa = urllib.request.quote(f"{title} — {url}", safe="")
    links = [
        ("X", f"https://twitter.com/intent/tweet?text={t}&url={u}&via={TWITTER.lstrip('@')}"),
        ("WhatsApp", f"https://wa.me/?text={wa}"),
        ("Facebook", f"https://www.facebook.com/sharer/sharer.php?u={u}"),
        ("LinkedIn", f"https://www.linkedin.com/sharing/share-offsite/?url={u}"),
        ("Telegram", f"https://t.me/share/url?url={u}&text={t}"),
    ]
    items = "".join(
        f'<a class="share-btn" data-share="{n.lower()}" href="{esc(h)}" target="_blank" rel="noopener">{n}</a>'
        for n, h in links
    )
    return (
        f'<div class="share-bar" data-url="{esc(url)}" data-title="{esc(title)}">'
        f'<span class="share-label">Share this</span>{items}'
        f'<button class="share-btn" data-share="copy" type="button">Copy link</button>'
        f'<button class="share-btn share-native" data-share="native" type="button" hidden>Share…</button>'
        f"</div>"
    )


def page_html(p: dict, others: list[dict], css: str) -> str:
    title = clean_title(p["title"])
    url = f"{SITE_URL}/posts/{p['slug']}/"
    image = f"{url}card.png"
    desc = " ".join((p.get("excerpt") or plain_text(p["content"])[:200]).split())
    is_poem = p.get("type") == "Poetry"
    published, modified = iso(p.get("created_at")), iso(p.get("updated_at")) or iso(p.get("created_at"))
    body = sanitize(p["content"])
    locked = bool(p.get("members") and p.get("truncated"))
    if locked:
        body = sanitize(first_paragraph(p["content"])) or body

    ld = {
        "@context": "https://schema.org", "@type": "BlogPosting", "headline": title[:110],
        "description": desc, "image": image, "url": url, "mainEntityOfPage": url,
        "articleSection": p.get("type"), "inLanguage": "en",
        "author": {"@type": "Person", "name": AUTHOR_FULL, "url": SITE_URL + "/"},
        "publisher": {"@type": "Person", "name": AUTHOR_FULL},
        "isAccessibleForFree": not locked,
    }
    if published:
        ld["datePublished"] = published
    if modified:
        ld["dateModified"] = modified
    # Escape <, > and & so nothing inside the JSON can ever close or open a tag.
    ld_json = (json.dumps(ld, ensure_ascii=False)
               .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"))
    published_tag = f'<meta property="article:published_time" content="{published}">' if published else ""
    modified_tag = f'<meta property="article:modified_time" content="{modified}">' if modified else ""
    section = esc(p.get("type"))

    if locked:
        after = (f'<div class="paywall-wall"><div class="paywall-box"><h3>Members Only</h3>'
                 f'<p>This post is for paid subscribers. Join the newsletter to unlock full access to all writing.</p>'
                 f'<a href="{NEWSLETTER}" target="_blank" rel="noopener" class="btn btn-primary">Become a Member</a>'
                 f'<a href="{COFFEE}" target="_blank" rel="noopener" class="btn btn-outline" style="margin-top:0">☕ Support with coffee</a>'
                 f"</div></div>")
    else:
        after = ('<div class="poem-author">— Sifon</div>' if is_poem else "") + (
            f'<div class="post-cta-strip"><p>If this piece meant something to you, consider supporting the work.</p>'
            f'<a href="{COFFEE}" target="_blank" rel="noopener" class="btn btn-accent">☕ Buy me a coffee</a>'
            f'<a href="/?page=blog" class="btn btn-outline">More posts →</a></div>')

    more = "".join(
        f'<a class="more-item" href="/posts/{o["slug"]}/"><div class="card-tag">{esc(o.get("type"))} · {esc(read_time(o))}</div>'
        f'<div class="t">{esc(clean_title(o["title"]))}</div><div class="x">{esc(o.get("excerpt"))}</div></a>'
        for o in others
    )
    kicker = f"{p.get('type')} · {read_time(p)}" + (" · ★ Members" if p.get("members") else "")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google-adsense-account" content="{ADSENSE}">
<title>{esc(title)} — {AUTHOR}</title>
<meta name="description" content="{esc(desc)}">
<meta name="author" content="{AUTHOR_FULL}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{url}">
<link rel="alternate" type="application/rss+xml" title="{AUTHOR}" href="{SITE_URL}/feed.xml">
<meta property="og:site_name" content="{esc(SITE_NAME)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(title)} — {AUTHOR}">
<meta property="og:locale" content="en_US">
{published_tag}
{modified_tag}
<meta property="article:section" content="{section}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="{TWITTER}">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{image}">
<meta name="twitter:image:alt" content="{esc(title)} — {AUTHOR}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<script type="application/ld+json">{ld_json}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE}" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>
<style>
{css}
{EXTRA_CSS}
</style>
</head>
<body>
<nav id="mainNav">
  <a class="nav-logo" href="/" style="text-decoration:none">S<span>.</span>I</a>
  <ul class="nav-links post-nav-links" id="navLinks">
    <li><a href="/">Home</a></li>
    <li><a href="/?page=about">About</a></li>
    <li><a href="/?page=blog" class="active">Blog</a></li>
    <li><a href="/?page=projects">Projects</a></li>
    <li><a href="/?page=contact">Contact</a></li>
  </ul>
  <div class="hamburger" id="hamburger" onclick="toggleMenu()"><span></span><span></span><span></span></div>
</nav>
<main class="post-page active{' poem-post' if is_poem else ''}">
  <article class="post-container">
    <a class="post-back" href="/?page=blog" style="text-decoration:none">← All writing</a>
    <div class="post-tag">{esc(kicker)}</div>
    <h1 class="post-title">{esc(title)}</h1>
    <div class="post-meta">{esc(p.get("date"))} · by {AUTHOR}</div>
    <div class="post-body">{body}</div>
    {after}
    {share_bar(url, title, desc)}
  </article>
</main>
{f'<section class="more-writing"><h2>More <em>writing</em></h2><div class="more-list">{more}</div></section>' if more else ''}
<section class="newsletter-banner">
  <h2>Join the <em>newsletter</em></h2>
  <p>Essays, poems, and ideas — delivered to your inbox. No noise, no spam. Just writing worth reading.</p>
  <form class="newsletter-form" action="{NEWSLETTER}/subscribe" method="get" target="_blank">
    <input type="email" name="email" placeholder="your@email.com" required aria-label="Email address">
    <button type="submit">Subscribe free</button>
  </form>
  <div class="newsletter-note">Free forever · Unsubscribe anytime · No spam ever</div>
</section>
<footer>
  <div class="footer-logo">S<span>.</span>I</div>
  <div class="footer-links">
    <a href="/?page=privacy">Privacy Policy</a>
    <a href="{COFFEE}" target="_blank" rel="noopener">Support ☕</a>
    <a href="/?page=contact">Contact</a>
  </div>
  <p>© {datetime.now(timezone.utc).year} {AUTHOR}</p>
</footer>
<script>{SHARE_JS}</script>
</body>
</html>
"""


def redirect_html(target: str) -> str:
    return (f'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Moved</title>'
            f'<link rel="canonical" href="{target}"><meta name="robots" content="noindex">'
            f'<meta http-equiv="refresh" content="0; url={target}"></head>'
            f'<body><a href="{target}">This post has moved — continue reading</a></body></html>')


# ── Sitemap & feed ────────────────────────────────────────────────────────────
def sitemap(posts: list[dict]) -> str:
    newest = max((iso(p.get("updated_at")) or iso(p.get("created_at")) or "" for p in posts), default="")
    rows = [f"  <url><loc>{SITE_URL}/</loc>{f'<lastmod>{newest[:10]}</lastmod>' if newest else ''}"
            f"<changefreq>weekly</changefreq><priority>1.0</priority></url>"]
    for p in posts:
        lm = (iso(p.get("updated_at")) or iso(p.get("created_at")) or "")[:10]
        rows.append(f"  <url><loc>{SITE_URL}/posts/{p['slug']}/</loc>{f'<lastmod>{lm}</lastmod>' if lm else ''}"
                    f"<changefreq>monthly</changefreq><priority>0.8</priority></url>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n")


def feed(posts: list[dict]) -> str:
    def rfc822(p):
        dt = iso(p.get("created_at"))
        return format_datetime(datetime.fromisoformat(dt)) if dt else ""
    items = "".join(
        f"<item><title>{esc(clean_title(p['title']))}</title><link>{SITE_URL}/posts/{p['slug']}/</link>"
        f"<guid isPermaLink=\"true\">{SITE_URL}/posts/{p['slug']}/</guid><category>{esc(p.get('type'))}</category>"
        f"{f'<pubDate>{rfc822(p)}</pubDate>' if rfc822(p) else ''}<description>{esc(p.get('excerpt'))}</description></item>\n"
        for p in posts[:50]
    )
    last = rfc822(posts[0]) if posts else ""
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>\n'
            f"<title>{AUTHOR}</title><link>{SITE_URL}/</link><description>{esc(SITE_DESC)}</description>"
            f"<language>en</language>{f'<lastBuildDate>{last}</lastBuildDate>' if last else ''}"
            f'<atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n'
            f"{items}</channel></rss>\n")


# ── Main ──────────────────────────────────────────────────────────────────────
def related(p: dict, posts: list[dict], n: int = 3) -> list[dict]:
    same = [o for o in posts if o["id"] != p["id"] and o.get("type") == p.get("type")]
    rest = [o for o in posts if o["id"] != p["id"] and o.get("type") != p.get("type")]
    return (same + rest)[:n]


def assign_slugs(posts: list[dict], previous: dict) -> None:
    used: set[str] = set()
    for p in sorted(posts, key=lambda x: x["id"]):
        prev = previous.get(str(p["id"]), {})
        base = slugify(p["title"]) or f"post-{p['id']}"
        slug = base if base not in used else f"{base}-{p['id']}"
        p["slug"] = slug
        used.add(slug)
        aliases = set(prev.get("aliases", []))
        if prev.get("slug") and prev["slug"] != slug:
            aliases.add(prev["slug"])
        p["aliases"] = sorted(a for a in aliases if a != slug)


def main() -> int:
    log(f"Building post pages from {POSTS_JSON or API_URL}")
    try:
        posts = fetch_posts()
    except Exception as e:  # noqa: BLE001
        # Never wipe the existing pages because the backend was briefly unreachable.
        log(f"::warning::Could not load posts ({e}). Keeping the existing pages unchanged.")
        return 0
    if not posts:
        log("::warning::The API returned no posts. Keeping the existing pages unchanged.")
        return 0

    posts.sort(key=lambda p: (p.get("created_at") or "", p["id"]), reverse=True)
    previous = {}
    if MANIFEST.exists():
        previous = {str(e["id"]): e for e in json.loads(MANIFEST.read_text(encoding="utf-8")).get("posts", [])}
    assign_slugs(posts, previous)

    css = site_css()
    fonts = Fonts(ensure_fonts())
    POSTS_DIR.mkdir(exist_ok=True)

    keep: set[str] = set()
    for p in posts:
        folder = POSTS_DIR / p["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(page_html(p, related(p, posts), css), encoding="utf-8")
        excerpt = " ".join((p.get("excerpt") or plain_text(p["content"])[:220]).split())
        render_card(fonts, folder / "card.png", kicker=f"{p.get('type')} · {read_time(p)}",
                    title=clean_title(p["title"]), excerpt=excerpt, poem=p.get("type") == "Poetry")
        keep.add(p["slug"])
        for alias in p["aliases"]:  # old links keep working after a title change
            if alias in {q["slug"] for q in posts}:
                continue
            (POSTS_DIR / alias).mkdir(parents=True, exist_ok=True)
            (POSTS_DIR / alias / "index.html").write_text(redirect_html(f"/posts/{p['slug']}/"), encoding="utf-8")
            keep.add(alias)
        log(f"  ✓ /posts/{p['slug']}/")

    # Remove pages for posts that were deleted (only folders this script manages).
    for child in POSTS_DIR.iterdir():
        if child.is_dir() and child.name not in keep and (child / "index.html").exists():
            shutil.rmtree(child)
            log(f"  – removed /posts/{child.name}/")

    manifest = {"posts": [{
        "id": p["id"], "slug": p["slug"], "aliases": p["aliases"], "title": clean_title(p["title"]),
        "type": p.get("type"), "url": f"{SITE_URL}/posts/{p['slug']}/",
    } for p in posts]}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap(posts), encoding="utf-8")
    (ROOT / "feed.xml").write_text(feed(posts), encoding="utf-8")
    render_card(fonts, ROOT / "og-default.png", kicker="Writing · Engineering · Ideas",
                title="Sifon Aniefiok Imaikop", excerpt=SITE_DESC, poem=False)
    log(f"Done: {len(posts)} post pages, sitemap, feed and preview images.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

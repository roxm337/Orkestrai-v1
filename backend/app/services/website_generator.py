import json
import re
from pathlib import Path
from typing import Any

from app.core.config import Settings
from app.services.groq_service import GroqService


class WebsiteGenerator:
    def __init__(self, settings: Settings, groq_service: GroqService):
        self.settings = settings
        self.groq_service = groq_service

    def list_generated_sites(self, *, run_id: str) -> list[dict[str, Any]]:
        run_dir = self.settings.generated_sites_dir / run_id
        if not run_dir.exists():
            return []

        sites: list[dict[str, Any]] = []
        for site_dir in sorted((path for path in run_dir.iterdir() if path.is_dir()), key=lambda path: path.name):
            files = sorted(str(path.relative_to(site_dir)) for path in site_dir.rglob("*") if path.is_file())
            config = self._load_site_config(site_dir)
            business_name = config.get("businessName") or config.get("siteName") or self._humanize_slug(site_dir.name)
            pages = [
                page.get("slug")
                for page in config.get("pages", [])
                if isinstance(page, dict) and isinstance(page.get("slug"), str)
            ]

            sites.append(
                {
                    "businessName": business_name,
                    "slug": site_dir.name,
                    "path": str(site_dir),
                    "files": files,
                    "entrypoint": "index.html",
                    "theme": config.get("theme"),
                    "architecture": self._architecture_summary_from_files(files),
                    "blueprint": {
                        "site_name": config.get("siteName") or business_name,
                        "tagline": config.get("tagline"),
                        "navigation": config.get("navigation") or [],
                        "pages": pages,
                    },
                }
            )

        return sites

    async def generate_site(self, *, run_id: str, business: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
        business_name = business.get("name", "Generated Business")
        site_slug = self._slugify(business_name)
        site_dir = self.settings.generated_sites_dir / run_id / site_slug
        site_dir.mkdir(parents=True, exist_ok=True)

        blueprint = await self.groq_service.plan_website(business, config)
        file_map = self._build_file_map(site_dir=site_dir, business=business, config=config, blueprint=blueprint)

        for path, content in file_map.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")

        return {
            "businessName": business_name,
            "slug": site_slug,
            "path": str(site_dir),
            "files": [str(path.relative_to(site_dir)) for path in file_map],
            "entrypoint": "index.html",
            "theme": config.get("theme", "groq-blueprint"),
            "architecture": self._architecture_summary(file_map, site_dir),
            "blueprint": {
                "site_name": blueprint["site_name"],
                "tagline": blueprint["tagline"],
                "navigation": blueprint["navigation"],
                "pages": [page["slug"] for page in blueprint["pages"]],
                "palette": blueprint["palette"],
            },
        }

    def _build_file_map(
        self,
        *,
        site_dir: Path,
        business: dict[str, Any],
        config: dict[str, Any],
        blueprint: dict[str, Any],
    ) -> dict[Path, str]:
        page_files = self._page_files(site_dir=site_dir, business=business, blueprint=blueprint)
        manifest = {
            "businessName": business.get("name", blueprint["site_name"]),
            "siteName": blueprint["site_name"],
            "tagline": blueprint["tagline"],
            "theme": config.get("theme", "groq-blueprint"),
            "navigation": blueprint["navigation"],
            "pages": [
                {
                    "slug": page["slug"],
                    "title": page["title"],
                    "purpose": page["purpose"],
                    "metaDescription": page["meta_description"],
                }
                for page in blueprint["pages"]
            ],
            "implementationNotes": blueprint["implementation_notes"],
        }

        return {
            site_dir / "README.md": self._readme(blueprint),
            site_dir / "site.config.json": json.dumps(manifest, indent=2),
            site_dir / "data" / "business-profile.json": json.dumps(business, indent=2),
            site_dir / "data" / "site-blueprint.json": json.dumps(blueprint, indent=2),
            site_dir / "assets" / "styles" / "tokens.css": self._tokens_css(blueprint),
            site_dir / "assets" / "styles" / "base.css": self._base_css(),
            site_dir / "assets" / "styles" / "components.css": self._components_css(),
            site_dir / "assets" / "scripts" / "main.js": self._main_js(blueprint),
            **page_files,
        }

    def _load_site_config(self, site_dir: Path) -> dict[str, Any]:
        config_path = site_dir / "site.config.json"
        if not config_path.exists():
            return {}

        try:
            return json.loads(config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _page_files(self, *, site_dir: Path, business: dict[str, Any], blueprint: dict[str, Any]) -> dict[Path, str]:
        files: dict[Path, str] = {}
        for page in blueprint["pages"]:
            slug = page["slug"]
            if slug == "index":
                page_path = site_dir / "index.html"
            else:
                page_path = site_dir / slug / "index.html"
            files[page_path] = self._page_html(page=page, business=business, blueprint=blueprint)
        return files

    def _page_html(self, *, page: dict[str, Any], business: dict[str, Any], blueprint: dict[str, Any]) -> str:
        is_home = page["slug"] == "index"
        nav_items = "".join(
            f'<a href="{self._nav_href(item)}" class="nav-link">{item}</a>' for item in blueprint["navigation"]
        )
        section_html = "".join(self._section_html(section, page["slug"], blueprint["contact"]) for section in page["sections"])
        phone = blueprint["contact"].get("phone") or business.get("phone") or "Add phone"
        email = blueprint["contact"].get("email") or (business.get("emails") or [""])[0] or "Add email"
        address = blueprint["contact"].get("address") or business.get("address") or "Add address"
        website = blueprint["contact"].get("website") or business.get("website") or "Add website"
        title = page["title"] if is_home else f'{page["title"]} | {blueprint["site_name"]}'

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{page["meta_description"]}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{self._asset_prefix(page["slug"])}assets/styles/tokens.css">
  <link rel="stylesheet" href="{self._asset_prefix(page["slug"])}assets/styles/base.css">
  <link rel="stylesheet" href="{self._asset_prefix(page["slug"])}assets/styles/components.css">
</head>
<body>
  <div class="page-shell">
    <header class="site-header">
      <div class="site-header__bar">
        <div>
          <p class="site-mark">Generated Site</p>
          <a href="{self._asset_prefix(page["slug"])}index.html" class="site-name">{blueprint["site_name"]}</a>
        </div>
        <nav class="site-nav">
          {nav_items}
        </nav>
      </div>
      <div class="site-header__summary">
        <div>
          <p class="eyebrow">Business profile</p>
          <h1>{page["title"] if is_home else blueprint["site_name"]}</h1>
          <p class="lede">{blueprint["tagline"]}</p>
        </div>
        <div class="contact-card">
          <p><strong>Phone</strong><span>{phone}</span></p>
          <p><strong>Email</strong><span>{email}</span></p>
          <p><strong>Address</strong><span>{address}</span></p>
          <p><strong>Website</strong><span>{website}</span></p>
        </div>
      </div>
    </header>

    <main class="content-stack">
      {section_html}
    </main>

    <footer class="site-footer">
      <p>{blueprint["site_name"]}</p>
      <p>{blueprint["tagline"]}</p>
    </footer>
  </div>

  <script src="{self._asset_prefix(page["slug"])}assets/scripts/main.js"></script>
</body>
</html>"""

    def _section_html(self, section: dict[str, Any], page_slug: str, contact: dict[str, Any]) -> str:
        bullets = "".join(f"<li>{item}</li>" for item in section["bullets"])
        cta_label = section.get("cta_label") or contact.get("primary_cta") or "Get started"
        contact_href = f"{self._asset_prefix(page_slug)}contact/index.html" if page_slug != "contact" else "#top"

        return f"""
        <section class="section-card section-card--{section["kind"]}">
          <div class="section-copy">
            <p class="eyebrow">{section["eyebrow"]}</p>
            <h2>{section["headline"]}</h2>
            <p>{section["body"]}</p>
          </div>
          <div class="section-detail">
            <ul class="bullet-list">
              {bullets}
            </ul>
            <a href="{contact_href}" class="button-primary">{cta_label}</a>
          </div>
        </section>
        """

    def _tokens_css(self, blueprint: dict[str, Any]) -> str:
        palette = blueprint["palette"]
        typography = blueprint["typography"]
        return f""":root {{
  --color-bg: {palette["background"]};
  --color-surface: {palette["surface"]};
  --color-text: {palette["text"]};
  --color-muted: {palette["muted"]};
  --color-accent: {palette["accent"]};
  --color-accent-soft: {palette["accent_soft"]};
  --color-border: {palette["border"]};
  --font-heading: "{typography["heading_family"]}", "Inter", sans-serif;
  --font-body: "{typography["body_family"]}", "Inter", sans-serif;
  --radius-xl: 28px;
  --radius-lg: 22px;
  --shadow-soft: 0 24px 70px rgba(15, 23, 42, 0.08);
}}"""

    def _base_css(self) -> str:
        return """* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 26%),
    linear-gradient(180deg, #fbfcff 0%, var(--color-bg) 100%);
  color: var(--color-text);
  font-family: var(--font-body);
  scroll-behavior: smooth;
}

body {
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

h1,
h2,
h3 {
  margin: 0;
  font-family: var(--font-heading);
  letter-spacing: -0.04em;
}

p {
  margin: 0;
}

ul {
  margin: 0;
  padding-left: 1.15rem;
}

.page-shell {
  width: min(1200px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.25rem 0 4rem;
}
"""

    def _components_css(self) -> str:
        return """.site-header {
  margin-bottom: 1.5rem;
}

.site-header__bar,
.site-header__summary,
.section-card,
.site-footer {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-soft);
}

.site-header__bar,
.site-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.site-mark,
.eyebrow {
  margin-bottom: 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.site-name {
  font-size: 1.125rem;
  font-weight: 700;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.nav-link {
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.92rem;
}

.site-header__summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.25rem;
  padding: 2rem;
  margin-top: 1rem;
}

.site-header__summary h1 {
  font-size: clamp(2.6rem, 5vw, 4.8rem);
  line-height: 0.94;
}

.lede {
  margin-top: 1rem;
  max-width: 44rem;
  color: var(--color-muted);
  font-size: 1.02rem;
  line-height: 1.7;
}

.contact-card {
  display: grid;
  gap: 0.85rem;
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  background: var(--color-accent-soft);
}

.contact-card p {
  display: grid;
  gap: 0.25rem;
}

.contact-card strong {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.content-stack {
  display: grid;
  gap: 1rem;
}

.section-card {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 1.5rem;
  padding: 1.6rem;
}

.section-copy h2 {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.section-copy p:last-child {
  margin-top: 0.85rem;
  color: var(--color-muted);
  line-height: 1.75;
}

.section-detail {
  display: grid;
  gap: 1rem;
  align-content: start;
}

.bullet-list {
  display: grid;
  gap: 0.65rem;
  color: var(--color-muted);
  line-height: 1.6;
}

.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 0.9rem 1.3rem;
  border-radius: 999px;
  background: var(--color-accent);
  color: white;
  font-weight: 700;
  box-shadow: 0 12px 30px rgba(124, 58, 237, 0.16);
}

.site-footer {
  margin-top: 1rem;
}

.site-footer p:last-child {
  color: var(--color-muted);
}

@media (max-width: 900px) {
  .site-header__summary,
  .section-card {
    grid-template-columns: 1fr;
  }

  .page-shell {
    width: min(100%, calc(100% - 1rem));
  }
}
"""

    def _main_js(self, blueprint: dict[str, Any]) -> str:
        pages = [page["slug"] for page in blueprint["pages"]]
        return f"""window.__SITE_BLUEPRINT__ = {json.dumps({"pages": pages, "siteName": blueprint["site_name"]}, indent=2)};
document.documentElement.dataset.siteReady = "true";
"""

    def _readme(self, blueprint: dict[str, Any]) -> str:
        return f"""# {blueprint["site_name"]}

Generated from the lead workflow using Groq planning plus a structured static site generator.

## File Structure

- `index.html`: main landing page
- `services/index.html`: service detail page
- `contact/index.html`: conversion page
- `assets/styles/tokens.css`: design tokens and palette
- `assets/styles/base.css`: global layout and typography
- `assets/styles/components.css`: reusable UI sections
- `assets/scripts/main.js`: small runtime helpers
- `data/business-profile.json`: scraped and enriched lead profile
- `data/site-blueprint.json`: Groq-generated site plan
- `site.config.json`: navigation and page manifest

## Notes

- Keep styling changes inside `assets/styles/`
- Keep content and page decisions inside `data/site-blueprint.json`
- Use `site.config.json` when another agent needs a compact map of the project
"""

    def _architecture_summary(self, file_map: dict[Path, str], site_dir: Path) -> dict[str, list[str]]:
        files = [str(path.relative_to(site_dir)) for path in file_map]
        return self._architecture_summary_from_files(files)

    def _architecture_summary_from_files(self, files: list[str]) -> dict[str, list[str]]:
        return {
            "pages": [file for file in files if file.endswith("index.html")],
            "styles": [file for file in files if file.startswith("assets/styles/") or file.endswith(".css")],
            "scripts": [file for file in files if file.startswith("assets/scripts/") or file.endswith(".js")],
            "data": [file for file in files if file.startswith("data/") or file.endswith(".json")],
        }

    def _nav_href(self, item: str) -> str:
        normalized = item.strip().lower()
        if normalized in {"home", "index"}:
            return "index.html"
        return f"{self._slugify(normalized)}/index.html"

    def _asset_prefix(self, slug: str) -> str:
        return "" if slug == "index" else "../"

    def _slugify(self, value: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
        return slug or "generated-business"

    def _humanize_slug(self, value: str) -> str:
        words = [part for part in value.replace("-", " ").split() if part]
        if not words:
            return "Generated Site"
        return " ".join(word.capitalize() for word in words)

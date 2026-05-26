# The Cinematic Worlds Atlas

A static premium atlas for cinematic AI-generated worlds connected to [@cinematic_aesthetics_](https://www.instagram.com/cinematic_aesthetics_/). The site is built with plain HTML, CSS, vanilla JavaScript, and JSON so it can deploy directly from the repository root on Cloudflare Pages with no build step.

## Mockup Translation

The reference mockup shows a dark celestial luxury book experience across desktop and mobile. The implementation maps that direction into:

- A first-viewport book-cover landing screen using `assets/images/atlas-cover.png`, gold serif title hierarchy, celestial backdrop, and ornamental borders.
- A table of contents rendered from `data/chapters.json`, with published chapters as clickable rows and coming chapters as locked entries.
- A chapter detail page that opens as a desktop book spread: image selector on the left, lore, prompt starters, and Prompt DNA on the right.
- A mobile story-scroll version using the same DOM: hero image first, horizontal thumbnail rail, lore, prompt panels, Prompt DNA, and reachable bottom navigation.
- Gold-edged surfaces, starfield texture, restrained page-turn controls, and a clean table-of-contents flow without redundant gallery or commission sections.

The reference mockup is included at `docs/reference/cinematic-worlds-atlas-mockup.png`.

## File Structure

```text
/
  index.html
  chapter.html
  css/styles.css
  js/main.js
  data/chapters.json
  assets/images/atlas-cover.png
  assets/images/chapter-1-crystal-solarwave-skyport/
  assets/images/chapter-2-rainbow-nebula-refinery/
  docs/reference/
  README.md
  .gitignore
  _headers
  _redirects
```

## JSON Chapter System

All chapter rendering is driven by `data/chapters.json`. `index.html` fetches the JSON to build the table of contents. `chapter.html` reads the URL query string, finds the matching `slug`, and renders the right state:

- Published chapter: full book spread, image selector, lore, prompt starters, Prompt DNA tags, use cases, copy buttons, and previous/next navigation.
- Coming soon chapter: locked chapter page with title, tagline, theme, and a back link.
- Missing or invalid slug: tasteful error page with a return link.

Future chapter additions should not require HTML, CSS, or JS changes unless a new visual treatment is intentionally introduced.

## Add Chapter 3 Next Week

1. Add images to a new folder, for example `assets/images/chapter-3-elyssian-dome-cities/`.
2. Open `data/chapters.json`.
3. Change Chapter 3 from `"status": "coming-soon"` to `"status": "published"`.
4. Add `imageDirectory`, `coverImage`, `images`, `lore`, `prompts`, `promptLabels`, `visualDNA`, `useCases`, `ctaLabel`, and `instagramCaptionSeed`.
5. Visit `chapter.html?slug=elyssian-dome-cities` locally to verify the page.

## Replace Images

The original PNG files are included at these exact paths. To replace or refresh the artwork, overwrite the matching file:

```text
docs/reference/cinematic-worlds-atlas-mockup.png
assets/images/atlas-cover.png
assets/images/chapter-1-crystal-solarwave-skyport/1.png
assets/images/chapter-1-crystal-solarwave-skyport/2.png
assets/images/chapter-1-crystal-solarwave-skyport/3.png
assets/images/chapter-1-crystal-solarwave-skyport/4.png
assets/images/chapter-2-rainbow-nebula-refinery/1.png
assets/images/chapter-2-rainbow-nebula-refinery/2.png
assets/images/chapter-2-rainbow-nebula-refinery/3.png
assets/images/chapter-2-rainbow-nebula-refinery/4.png
```

The JSON already points to those paths. If a future image is missing, the site shows elegant missing-image placeholders and does not break.

## Edit Lore and Prompts

Edit only `data/chapters.json`:

- Each `lore` paragraph is a separate string.
- Each `prompts` entry is copied exactly by its matching "Copy Prompt" button.
- `promptLabels` should stay in the same order as `prompts`.
- `visualDNA` and `useCases` render as tags.
- `accentColor` controls chapter-specific glow and highlight color.

## Cloudflare Pages Deployment

Use these Cloudflare Pages settings:

- Framework preset: None
- Build command: leave empty
- Build output directory: `/`
- Root directory: `/`

The `_headers` file adds basic security headers plus long-lived image caching and lighter HTML/data caching. `_redirects` provides simple shortcuts for Instagram and the two published world URLs.

## Local Validation

Run a local static server from the repository root:

```powershell
python -m http.server 4173
```

Then check:

- `http://localhost:4173/index.html`
- `http://localhost:4173/chapter.html?slug=crystal-solarwave-skyport`
- `http://localhost:4173/chapter.html?slug=rainbow-nebula-refinery`
- `http://localhost:4173/chapter.html?slug=elyssian-dome-cities`

Validation checklist:

- Index opens and renders JSON-driven table of contents.
- Chapter 1 and Chapter 2 load as published pages.
- Coming-soon chapters render without breaking.
- Copy prompt buttons show a copied or fallback message.
- Mobile widths avoid horizontal overflow.
- Keyboard focus states are visible.
- Arrow keys navigate previous/next published chapters where available.
- Missing images show placeholders until the real PNGs are added.

## Weekly Content Workflow

1. Publish or finalize the new Instagram world.
2. Export four final images to the next chapter image folder.
3. Append or update one object in `data/chapters.json`.
4. Verify the chapter page locally.
5. Commit the JSON and image assets.
6. Deploy through Cloudflare Pages.

## Implementation Assumptions

- The site intentionally uses no package manager, framework, external font, or build tool.
- The current repo was empty when implementation began.
- Prompt and lore content are local curated content, so DOM rendering uses safe text insertion rather than user-submitted HTML.
- Original prompt images are committed in the project at the paths listed above.

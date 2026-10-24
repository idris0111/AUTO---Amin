# AUTO UNIVERSE — Modern Precision

## 1. Visual theme and atmosphere
Premium automotive commerce for Tajikistan. A bright, precise editorial storefront,
balanced density (4/10), asymmetric composition (6/10), restrained motion (3/10).
Preserve the AU identity, automotive photography, vehicle garage and technical SKU
hierarchy found in Stitch projects 294017222040556677 and 7403242003897533119.
Replace racing glows and dense decorative telemetry with clear purchasing decisions.

## 2. Color palette and roles
- Cloud canvas #F8FAFC; white #FFFFFF elevated surfaces.
- Ink #101828 primary text; steel #667085 secondary text.
- Hairline #E5E7EB borders; signal red #D71920 primary action and focus.
- Success #16A34A is reserved for factual availability, never decorative branding.
- Dark theme uses #101419 canvas, #181E27 surface, #F8FAFC text, #AAB4C2 muted.
The user's explicit palette takes precedence over generic skill saturation limits.

## 3. Typography
Manrope display and body, system sans fallback; tabular currency and monospace SKUs.
Display clamp(2.5rem, 5vw, 4.75rem), tight tracking, 1.06 line-height. Body 14–16px,
1.6 line-height, prose maximum 65ch. No gradients in headings or all-caps paragraphs.

## 4. Components
Buttons: flat red primary, 8px radius, minimum 44px target, subtle pressed transform.
Products: white panels, 12px radius, thin border, contained product image, clear
brand / SKU / name / price / availability hierarchy. Ratings only when reviews exist.
Inputs: visible labels or accessible names, 44px height, red focus outline.
Errors: inline explanation with retry; loading: dimension-matched skeletons;
empty states: relevant next action without invented inventory.
Dialogs: keyboard focus contained, Escape closes, focus returns to trigger.

## 5. Layout
Maximum 1320px, 24–40px desktop gutters; 16px mobile gutters. Asymmetric split hero
with clean independent image and text zones. Vehicle selector follows hero. Category
tiles, product grid, manufacturers and two-column service section create varied rhythm.
Mobile sections and product cards become a single column below 480px. Navigation
uses a labelled mobile menu plus existing bottom tab bar. No page-level overflow.

## 6. Motion
Opacity and transform only, 180–350ms ease-out, optional stagger on initial sections.
No perpetual decorative motion, random data, neon, or CPU-heavy effects. The user's
performance and prefers-reduced-motion requirements take precedence over micro-loops.

## 7. Content and data rules
All commerce data comes from existing FastAPI endpoints. Never fabricate revenue,
orders, reviews, stock counts, vehicle verification, deliveries or payment success.
Compatibility requires backend fitment. Offline transfer and cash on delivery are the
only supported payment methods. Russian is the primary copy; retain ru/tg/en locale
infrastructure. No fake newsletter submission, fake phone numbers or contact addresses.

## 8. Anti-patterns
No neon shadows, purple accents, pure-black canvases, gradient text, fake percent
confidence, decorative dashboards on the storefront, generic stock counters or
unverified warranty claims. Preserve all existing commerce and admin workflows.

## 9. Marketplace refinement — 24 October 2026
The user asked for familiar marketplace shopping density, referencing Wildberries.
Use two product columns on mobile and four on large screens, with large prices,
visible favorite buttons, clear full-width add-to-cart actions and quick filters.
This explicit shopping-density request supersedes the earlier single-column rule.
Keep the automotive red accent and the existing store identity. Add a keyboard
accessible category menu with actual categories and manufacturers from the API.
Known lifestyle placeholder images from the demo seed are replaced in the UI by
category icons marked as missing photographs. Real SKU photographs remain the
primary media. Built-in raster generation failed with a network error; no missing
generated asset is referenced by the application.

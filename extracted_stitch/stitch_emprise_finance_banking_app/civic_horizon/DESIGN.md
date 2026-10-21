---
name: Civic Horizon
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#3c4947'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#6c7a77'
  outline-variant: '#bbcac6'
  surface-tint: '#006b5f'
  primary: '#006b5f'
  on-primary: '#ffffff'
  primary-container: '#14b8a6'
  on-primary-container: '#00423b'
  inverse-primary: '#4fdbc8'
  secondary: '#4d5f7d'
  on-secondary: '#ffffff'
  secondary-container: '#c8dbfe'
  on-secondary-container: '#4e607e'
  tertiary: '#005cbd'
  on-tertiary: '#ffffff'
  tertiary-container: '#71a4ff'
  on-tertiary-container: '#003979'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71f8e4'
  primary-fixed-dim: '#4fdbc8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#b5c7ea'
  on-secondary-fixed: '#071c36'
  on-secondary-fixed-variant: '#364764'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#acc7ff'
  on-tertiary-fixed: '#001a40'
  on-tertiary-fixed-variant: '#004591'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  ledger-numerical:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes the visual and interaction standard for a modern community-style commercial and retail financial institution. The ethos balances the rooted reliability of traditional local banking with the velocity, transparency, and ergonomic clarity of modern digital products.

### Emotional Demeanor
- **Trustworthy & Authoritative:** High legibility, dark navy structural anchors, and uncompromising visual clarity communicate institutional solvency and fiscal responsibility.
- **Approachable & Welcoming:** Open layouts, rounded elements, and generous breathing room dismantle the sterile, intimidating atmosphere often present in enterprise banking portals.
- **Crisp & Decisive:** Color-coded transaction flows (teal, emerald, crimson) paired with precise interaction targets create confidence in financial decisions.

### Visual Aesthetic
The style follows **Corporate Modern with Tactile Refinements**:
- Structured layouts grounded by deep navy anchors (sidebars, footers, headers).
- High contrast typography for immediate financial ledger scanning.
- Floating crisp white surfaces sitting over a cooling neutral canvas.
- Micro-interactions that emphasize stability: subdued hover elevations, zero erratic layout shifts, and predictable state indicators.

## Colors

The palette relies on deliberate role segregation to prevent interactive ambiguity while maintaining high accessibility ratios (WCAG AAA compliant for standard text; minimum 4.5:1 for interactive elements).

### Core Color Roles
- **Primary Action (Teal `#14B8A6`):** Dedicated exclusively to constructive user intent—primary CTA buttons, deposit confirmations, positive confirmations, and primary tool toggles.
- **Structural Anchor (Deep Navy `#0B1F3A`):** Used for foundational UI scaffolding, primary logotype, main navigation bars, sidebars, heavy header typography, and footer enclosures.
- **Interactive Accent (Bright Blue `#1E6FD9`):** Reserved for inline hyperlinks, informational accents, icon circle badges, and secondary interactive affordances.
- **Canvas & Sectioning (Light Gray `#F5F7FA`):** Underpins the entire viewport and creates soft contrast against pure white card surfaces.

### Semantic & Ledger Signaling
- **Credits / Inflow (`#16A34A` Emerald Green):** Exclusively signifies incoming capital, successful balance updates, interest earned, and verified clearing states.
- **Debits / Outflow (`#DC2626` Crimson Red):** Indicates withdrawals, outgoing transfers, merchant charges, overdraft alerts, and critical verification failures.
- **Dividers & Perimeters (`#E2E8F0` Slate Border):** Enforces layout boundaries, card shells, and form input perimeters without distracting from ledger data.
- **Surfaces (`#FFFFFF` Pure White):** Used on cards, modal bodies, input interiors, and top-tier content blocks.

## Typography

The typography is built entirely on `Inter` to provide neutral, highly legible geometric and tabular structures critical for balance sheets, transaction registers, and mobile navigation.

### Numeric Display Rules
- **Tabular Figures:** All financial figures, currency amounts, transaction ledgers, and routing/account numbers must render with `font-feature-settings: "tnum" 1, "cv05" 1` enabled. This guarantees exact vertical alignment across tabular rows.
- **Visual Weight Pairing:** Headings utilize Deep Navy (`#0B1F3A`) to anchor visual priority. Subdued metadata uses Slate Gray (`#64748B`) on the light background canvas.
- **Hierarchy Integrity:** Display and larger headline styles drop down gracefully on mobile screen sizes to eliminate single-word overflows and preserve clean horizontal margins.

## Layout & Spacing

The layout structure relies on a responsive fluid grid paired with an explicit 4px/8px incremental spacing scale. Generous whitespace reinforces institutional confidence and prevents touch errors.

### Grid Construction
- **Desktop (1024px+):** 12-column fluid grid. Max container width capped at 1280px. Gutters set to `1.5rem` (24px) with minimum outer canvas margin of `2rem` (32px).
- **Tablet (768px – 1023px):** 8-column fluid grid with `1.25rem` (20px) gutters and `1.5rem` (24px) outer margins.
- **Mobile (0 – 767px):** 4-column fluid grid. `1rem` (16px) gutters and `1rem` (16px) safe canvas edge padding.

### Ergonomic Rules
- **Tap Targets:** Interactive targets must maintain a minimum height and width of 48px on mobile viewports (minimum 44px on desktop pointers).
- **Stacking Priority:** Multicolumn transaction rows on desktop switch to full-width stacked list rows on viewports under 768px, retaining minimum row heights of 64px for easy thumb targeting.

## Elevation & Depth

Visual depth is achieved through quiet, ambient drop shadows and clean surface separation rather than thick borders or aggressive styling.

### Shadow Tiers
- **Flat (Layer 0):** Background canvas (`#F5F7FA`) and inline form controls.
- **Surface Elevation (Layer 1 - Cards & Lists):** Used for default cards, account modules, and white surfaces. Box shadow: `0 1px 3px 0 rgba(11, 31, 58, 0.04), 0 2px 6px 0 rgba(11, 31, 58, 0.03)`. Perimeter reinforced by an explicit `1px solid #E2E8F0` border.
- **Raised Elevation (Layer 2 - Popovers, Dropdowns, Card Hover):** Applied to active dropdown menus, context tooltips, and interactive card hovering states. Box shadow: `0 4px 12px -2px rgba(11, 31, 58, 0.08), 0 2px 4px -1px rgba(11, 31, 58, 0.04)`.
- **Overlay Elevation (Layer 3 - Modals & Floating Trays):** Applied to transfer confirmation sheets, multi-factor authentication dialogs, and slide-out transaction details. Box shadow: `0 12px 32px -4px rgba(11, 31, 58, 0.16), 0 4px 8px -2px rgba(11, 31, 58, 0.06)`. Accompanied by a 35% opacity `#0B1F3A` backdrop fill.

## Shapes

The design system maintains a consistent 12px baseline curvature for core components, producing a balanced, approachable appearance that feels friendly yet grounded.

### Corner Radius Allocation
- **Cards, Sheets, and Modals:** `rounded-xl` (12px / 0.75rem). Softens large layout blocks without looking overly round.
- **Inputs & Standard Action Buttons:** `rounded-lg` (8px / 0.5rem) to 12px, matching container proportion.
- **Icon Circle Badges & Status Chips:** Fully pill-shaped or circular (`border-radius: 9999px`) to distinguish categorical indicators and avatars from rectangular interactive elements.
- **Strict Exclusion:** Avoid 0px hard corners across all user-facing product pages.

## Components

### Buttons
- **Primary Action:** Solid `#14B8A6` background, white bold text (`#FFFFFF`), 12px rounded corners. Height: 48px on mobile, 44px on desktop. Hover: `#0D9488`. Focus ring: 3px `#14B8A6` at 30% opacity with 2px offset.
- **Secondary Action:** Transparent background, `#0B1F3A` border (1.5px), `#0B1F3A` text. Hover: `#F1F5F9` background.
- **Subtle / Ghost:** Pure White or transparent with `#1E6FD9` text for tertiary navigation and dismissive actions.
- **Destructive:** Crimson `#DC2626` background with white text, exclusively for high-consequence operations (e.g., account lock, transfer cancellation).

### Cards & Account Panels
- **Container:** `#FFFFFF` background, `1px solid #E2E8F0`, 12px border radius, Layer 1 ambient shadow.
- **Padding:** 24px (`space-lg`) on desktop; 16px (`space-md`) on mobile screens.
- **Grouping:** Financial summary cards group account balance, routing status, and primary transfer triggers within a unified header and footer divider.

### Transaction Lists & Ledger Rows
- **Layout:** Flex row with a minimum touch area of 64px.
- **Avatar / Icon Badges:** 40px circular container (`#1E6FD9` background at 10% opacity) containing centered `#1E6FD9` category icons.
- **Ledger Values:** Monospaced tabular formatting. Outgoing amounts prefixed with `-` in Crimson Red (`#DC2626`). Incoming amounts prefixed with `+` in Emerald Green (`#16A34A`).

### Inputs & Form Controls
- **Field Shell:** Pure white surface (`#FFFFFF`), 48px height, `1px solid #E2E8F0` border, 8px–12px radius.
- **Focus State:** Border switches to `#1E6FD9` with a subtle `0 0 0 3px rgba(30, 111, 217, 0.15)` glow.
- **Helper & Validation Labels:** 12px Inter medium. Errors replace standard border with `#DC2626` and render error copy beneath with an error icon.

### Status Chips & Pills
- **Architecture:** Compact 24px to 28px height, full pill radius (9999px), horizontal padding of 10px.
- **Positive / Cleared:** Light emerald tint background (`rgba(22, 163, 74, 0.12)`) with `#15803D` text.
- **Pending / In Review:** Light amber tint background (`rgba(245, 158, 11, 0.12)`) with `#B45309` text.
- **Rejected / Failed:** Light red tint background (`rgba(220, 38, 38, 0.12)`) with `#B91C1C` text.

### Checkboxes & Radio Controls
- **Form Factor:** 20px x 20px surface with 48px surrounding touch target envelope.
- **Selected State:** `#14B8A6` solid fill with crisp white checkmark or inner radio bullet. Soft border `#CBD5E1` when unselected.
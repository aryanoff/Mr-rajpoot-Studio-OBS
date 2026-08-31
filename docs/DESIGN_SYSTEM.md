# MR RAJPOOT STUDIO OBS 24/7 - Design System

## Core Principles
- **Professional & Premium**: The product must feel like a commercial cloud streaming platform.
- **Light First**: The default theme for all new users is Light Mode, ensuring maximum clarity and accessibility.
- **Semantic Variables**: All colors and styling values are controlled via CSS variables mapped to Tailwind.

---

## 1. Color System (Tailwind Tokens)

### Backgrounds & Surfaces
- `bg-background`: The main page background (`var(--color-background)`)
- `bg-surface`: Primary elevated surface (e.g., Cards, Sidebar, Topbar)
- `bg-surface-2`: Secondary surface (e.g., Inputs, Hover states)
- `bg-surface-3`: Tertiary surface (e.g., Disabled inputs, deep backgrounds)

### Typography
- `text-text-primary`: Headings, primary content
- `text-text-secondary`: Subheadings, secondary content
- `text-text-muted`: Placeholder text, timestamps, captions

### Borders
- `border-border`: Default borders
- `border-border-hover`: Hover states for bordered elements
- `border-border-active`: Active states for bordered elements

### Accent (Brand)
- `bg-accent`: Primary brand color (`#7c3aed`)
- `bg-accent-light`: Hover state (`#8b5cf6`)
- `bg-accent-dark`: Pressed state (`#6d28d9`)

### Status
- `status-live` / `status-error`: Red/Critical operations
- `status-success`: Green/Completed operations
- `status-warning`: Amber/Warnings
- `status-scheduled`: Purple/Upcoming
- `status-offline`: Slate/Inactive

---

## 2. Typography Scale

- **Font Family**: Inter (sans-serif)
- **H1 (Display)**: `text-2xl font-bold` (Page Titles)
- **H2**: `text-lg font-semibold` (Card/Section Titles)
- **H3**: `text-sm font-medium` (Sub-sections)
- **Body**: `text-sm text-text-primary` (Standard text)
- **Body Small**: `text-xs text-text-secondary` (Helper text)

---

## 3. Spacing & Sizing

Using Tailwind's default spacing scale (`p-4`, `p-6`, `m-4`, `gap-4`).

### Components
- **Inputs**: `h-10 px-4`
- **Buttons (sm)**: `h-8 px-3`
- **Buttons (md)**: `h-10 px-5`
- **Buttons (lg)**: `h-12 px-8`

### Global Layout
- **Sidebar (Collapsed)**: `w-[72px]`
- **Sidebar (Expanded)**: `w-64`
- **Topbar**: `h-16`

---

## 4. Radius & Shadows

### Border Radius
- `rounded-lg` (0.5rem): Small components (Inputs, small buttons)
- `rounded-xl` (0.875rem): Standard components (Buttons, dropdowns)
- `rounded-2xl` (1rem): Large containers (Cards, Modals)
- `rounded-full` (9999px): Avatars, badges

### Elevation (Shadows)
- `shadow-card`: Default card elevation (`var(--shadow-card)`)
- `shadow-card-hover`: Elevated card on hover (`var(--shadow-card-hover)`)
- `shadow-glow`: Accent glow for primary buttons/avatars (`var(--shadow-glow)`)

---

## 5. UI Component Library

- **Button**: `primary`, `secondary`, `ghost`, `danger`, `outline`, `accent`
- **Input**: Standard text/password/email inputs with `label`, `error`, `helperText`, `icon`.
- **Switch**: Toggle inputs replacing raw checkboxes.
- **Card**: `default`, `glass`, `glow`, `bordered` variants.

---

## 6. Information Architecture (App Shell)

Sidebar is structured into the following distinct sections:
1. **WORKSPACE**: Dashboard, Live Studio, Streams
2. **CONTENT**: Media Library, Playlists
3. **AUTOMATION**: Schedules
4. **INSIGHTS**: Analytics
5. **SYSTEM**: Settings

Admin panel has a separate dedicated navigation (`/admin/*`).

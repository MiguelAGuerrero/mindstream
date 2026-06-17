# Vuetify layout conventions (main content)

## Pattern

- **One place** caps the main column width: in [`src/App.vue`](../src/App.vue), the `router-view` is wrapped in a nested **`v-container`** with:
  - **`fluid`** — avoids the theme’s breakpoint-based container max-widths fighting a fixed pixel cap.
  - **`:max-width`** — App sets thinkpad route width inline (`880` px); see `src/App.vue`.
  - **`mx-auto`**, **`pa-0`**, **`w-100`**, and flex utilities (`d-flex`, `flex-column`, `justify-center`, `flex-grow-1`) for centering and vertical behavior.
- **Route pages** (`src/thinkpad/ThinkPadPage.vue`, `src/focus/FocusRunnerPage.vue`) should **not** set their own `max-width` / margin auto for the page column; that duplicates the constraint and causes **misaligned titles and CTAs** when switching routes.

## Why `fluid` + `max-width`

Non-fluid `v-container` uses Vuetify’s responsive max-width scale. Combining that with an explicit cap is awkward. **`fluid`** makes the container span the parent; **`max-width`** (dimension prop) then limits width in one clear rule.

## Pitfalls

1. **Double horizontal padding** — The outer shell uses `v-container fluid` with `pa-4`. The inner content container usually needs **`pa-0`** so padding is not doubled.
2. **Per-view width caps** — Do not reintroduce scoped `max-width` on page roots for “the main column”; update `MAIN_PAGE_MAX_WIDTH` instead.
3. **Prefer Vuetify over scoped layout CSS** — Use **dimension props** (`max-width`, `min-height`, …) on Vuetify components and **display/spacing utilities** (`d-flex`, `flex-column`, `ga-*`, `w-100`, `mb-0`, `h-screen`, `h-md-auto`, etc.) before adding scoped rules.
4. **One-off control widths** — Prefer a component’s **`max-width`** prop (e.g. `v-text-field`) instead of a scoped class.
5. **Out of scope for this pattern** — [`FocusRunnerPage.vue`](../src/focus/FocusRunnerPage.vue) hosts its own full-width rail + center layout. See [`docs/FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for the route map.

## Responsive navigation drawer (mobile)

- **How Vuetify decides overlay vs layout lane** (see `VNavigationDrawer` in Vuetify): **`isTemporary = !permanent && (drawerMobile || temporary)`**. Only when **`isTemporary`** is true does **`layoutSize`** go to **`0`**, so **`v-main`** does not get extra **`--v-layout-left`** when the drawer opens (overlay + scrim). This matches the [navigation drawer](https://vuetifyjs.com/en/components/navigation-drawers/) pattern: **`temporary`** for modal-style nav on small viewports, **`permanent`** for a fixed rail on large ones.
- **`permanent` on `v-navigation-drawer` forces a layout-lane drawer** — with `permanent` true, Vuetify never treats the drawer as temporary, so there is **no overlay or scrim** on small viewports.
- **Pattern in this app:** [`App.vue`](../src/App.vue) hosts the app bar and main content chrome; feature pages render in `<router-view />`.
- **`v-app-bar`** with **`v-app-bar-nav-icon`** is shown only when **`!display.mdAndUp`** (computed as **`showMobileAppBar`** in layout); it toggles **`drawerOpen`**. Keep the app bar as a **sibling** of the drawer and **`v-main`** under **`v-app`** so the layout system sizes content correctly.
- **Display API pitfall:** **`mdAndDown` is not the inverse of `mdAndUp`**. In Vuetify, **`mdAndUp`** is true from the **`md`** threshold (~840px) upward; **`mdAndDown`** is true below **`lg`** (~1145px). Between **840px and ~1144px**, **both are true**. Pairing **`permanent="mdAndUp"`** with **`v-if="mdAndDown"`** on the hamburger bar shows a menu icon while the drawer stays **permanent** — toggling then **pushes `v-main`** instead of overlaying. For a single cut at **`md`**, use **`mdAndUp`** with **`!mdAndUp`**, not **`mdAndDown`**.
- **Closing:** Vue Router’s default **`disable-route-watcher`** on the drawer closes a temporary drawer on route change. **`closeDrawerIfMobile()`** also runs after **`handleNavFocus`** / **`handleNavWorkflows`** so the menu closes when the route does not change (e.g. tap Home while already on Home). It must use the same **`!mdAndUp`** rule as the app bar.
- **Resize:** An **immediate `watch` on `display.mdAndUp`** sets **`drawerOpen`** to match the breakpoint (**`true`** when fixed drawer, **`false`** when overlay) so desktop starts with the nav visible and mobile starts with the overlay closed.

## Verification

After layout changes: `npm run build`, and spot-check **Home ↔ Workflows ↔ Plan** for aligned edges and no extra side padding. For the drawer: below **840px** use the menu icon and overlay (scrim, no horizontal reflow of main content); at **md+** confirm the fixed drawer and **no** hamburger bar in the **840px–1144px** band (only the fixed rail).

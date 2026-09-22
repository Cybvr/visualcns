# Record-page UI pattern

Layout direction for a "record" page in the dashboard: one entity (a company,
and eventually invoices, contracts, projects, users) with a profile panel and
tabbed sections. Reference: the company page
(`components/company/company-page.tsx`, `company-sidebar.tsx`, `section-nav.tsx`).
This is about shape, spacing and type — not colour. Keep whatever palette the
page already uses.

## Structure

- **Separate cards, not one long card.** Group related content (profile
  header, primary contact, details) into its own rounded, bordered card with
  a visible gap between them (`space-y-4`), instead of one container divided
  by internal `<Separator>` lines. A gap reads faster than a rule.
- **A section label lives outside its card**, as a small heading with an
  optional action button beside it — the card below holds only the content.
- **No back button on the page itself.** The dashboard header already carries
  navigation: set the record's name as the header title and a Home icon
  pointing at the record's list page, via `usePageTitle(name, listHref)`
  from `components/dashboard/page-title-context.tsx` (see
  `app/dashboard/companies/[slug]/layout.tsx`). Don't duplicate that with a
  second back arrow inside the page body.
- **Flatten wrapper divs.** If a `<div>` exists only to hold one class that
  could live on its child, delete it.

## Buttons and icons

- **One primary action, labeled.** The single most useful action on a card
  (e.g. "Email") is a full-width or prominent button with a visible label,
  not just an icon.
- **Everything else collapses into one "···" menu.** Don't lay out four
  icon buttons in a row — one visible primary action plus one overflow menu.
- **Utility icon buttons are squares, not circles** (`rounded-xl`, not
  `rounded-full`), sized `size-10` minimum for a real touch target. Avatars
  follow the same rule — `rounded-xl`, not circular — everywhere a person's
  or company's initials/photo shows up.
- **Show the record's category/type as a pill** at the top of the hero card
  (e.g. an industry badge) — it's identity, not metadata, so it doesn't
  belong buried in the collapsed Details panel.
- **No logo/avatar in the hero card.** Keep the hero card to the category
  pill plus the primary action row; a photo/logo there duplicates whatever
  the record's list page already shows and adds no information here.
- **Tags live in Details, not the hero card.** They're metadata like
  Domain or Source, not identity like the category pill above.
- **"Add" actions are icon-only**, no "Add person" / "New project" text —
  just a `+` in a `rounded-xl` square (see `SectionAddButton`). The label
  still exists as `aria-label`/`title` for accessibility, it's just not
  painted on the button.

## Tabs

- **Segmented pill control, not an underline.** Tabs live inside a
  `rounded-full bg-muted` track; the active tab gets its own
  `rounded-full bg-background` pill. This reads as one big, obvious control
  instead of small text with a thin line under it (see `SectionNav`).
- If tabs can overflow the width, make the strip `overflow-x-auto` and hide
  the scrollbar (`scrollbar-none` utility already in `globals.css`) rather
  than letting the browser draw its own scrollbar under the tabs.

## Typography

- **The record's name isn't repeated in the page body.** It lives once, in
  the dashboard header (see the back-button note above) — don't also render
  a big `<h1>` for it in the hero card.
- Section labels (e.g. "Primary Contact", "Details") stay small, muted,
  uppercase-or-not per the existing `surface-section-label` token — they're
  wayfinding, not content.
- Don't repeat the tab's own name as a heading inside the tab (a "Contacts"
  tab showing an "<h2>Contacts</h2>" is redundant) — show the count instead
  ("3 contacts") and keep the heading `sr-only` for screen readers.

## Empty states

- One shared empty-state component for every tab: icon in a muted circle,
  bold-ish title, optional one-line description, optional single action.
  Don't hand-roll a new empty state per section (see `CompanyEmptyState`).

## Applying this elsewhere

When a page has a profile/detail panel plus tabs (a project, a user, an
invoice list drilldown), reuse `SectionNav`, `SectionAddButton` and
`CompanyEmptyState` directly rather than re-implementing the pattern — they
already carry this guide's rules. If a new record type needs its own
sidebar, mirror `company-sidebar.tsx`'s card grouping rather than one
continuous block.

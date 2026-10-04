# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- The agency owner and team operate the business in VisualHQ.
- The agency's clients need their own interface for the work and documents shared with their company.
- The user described the agency as occupying the same position as an agency registering to use Bonsai. Selling software to other agencies is not an established requirement for this work.

## Product Purpose

Support agency operations and give clients a clear place to follow their engagement with the agency. The requested portal separates the client experience from the agency's company-management interface.

## Operating Context

The existing application contains projects, tasks, companies, invoices, estimates, contracts, and shared documents. Organizations and related records use existing companyId relationships. The agency has already sent clients company URLs in the form /company-name.

## Capabilities and Constraints

- Confirmed on 2026-09-09: clients must sign in to the new portal.
- Preserve the usefulness of previously shared company links during the migration, including document destinations.
- Keep existing company and document identities; the portal is a new experience over existing records.
- Portal work is currently in planning, not implementation.
- Removed on 2026-10-04 because they did not work: client contract e-signing, online invoice payment, approvals, and portal messaging. Clients can still view and download invoices and contracts, and accept estimates online.

## Evidence on Hand

- Existing implementation in app/dashboard, app/[clientSlug], app/share, components/company, and lib.
- User supplied a project-portal screenshot showing a project header, horizontal tabs, outstanding items, tasks, billing, and files/links. It is a layout reference, not a source of production data.

## Product Principles

- Make the client's next action clear.
- Keep agency management and client participation distinct.
- Preserve access through existing links while introducing the chosen sign-in requirement.
- Reuse real records and verified capabilities; do not imply unfinished payment, signing, or messaging flows work.

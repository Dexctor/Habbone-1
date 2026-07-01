# Admin feature architecture

This folder owns admin business features.

## Rules

- `src/components/admin/ui` contains reusable admin primitives only.
- `src/components/admin` keeps the shell/layout and temporary compatibility wrappers.
- Each admin area lives in `src/features/admin/<area>`.
- Feature code can fetch admin APIs and own local UI state.
- Shared business rules must stay server-side in `src/server`.

## Current features

- `shop`: shop items, order list, shop-specific image helpers.
- `partners`: homepage partner/publicity management.

## Migration target

Move the remaining large panels here progressively:

- `users`
- `roles`
- `content`
- `theme`

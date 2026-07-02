# Admin feature architecture

This folder owns admin business features.

## Rules

- `src/components/admin/ui` contains reusable admin primitives only.
- `src/components/admin` keeps the shell/layout and temporary compatibility wrappers.
- Each admin area lives in `src/features/admin/<area>`.
- Feature code can fetch admin APIs and own local UI state.
- Shared business rules must stay server-side in `src/server`.

## Current features

- `dashboard`: admin overview and view orchestration.
- `content`: articles, forum content, comments and stories.
- `users`: user search, roles, coins, sanctions, history modal and row action state.
- `roles`: role CRUD, admin access and default role seeding.
- `theme`: header logo/background configuration.
- `shop`: shop items, order list, shop-specific image helpers.
- `partners`: homepage partner/publicity management.

## Legacy wrappers

The temporary `src/components/admin/Admin*Panel.tsx` bridge files have been removed.
Admin features should be imported directly from `src/features/admin`.

# Multi-team expansion — chairman preview

Status: development only. Do not merge into main or deploy until tested and approved.

## Compatibility contract
- Existing members remain on First Team; single-team members see no team selector.
- Shared Club page and Tote remain club-wide.
- One player identity and one personal ledger/fines account across all teams.
- Matches, training, availability, selections, stats and team staff are team-scoped.
- Chair may administer all teams. Team managers only their assigned teams.
- Draft teams, budgets and management actions are chair-only; enforce at database RLS and UI.
- Keep existing tables/records intact. Introduce team links with safe defaults and migrate in verified steps.
- No direct production schema changes until a reviewed migration and rollback plan.
- Budgets are internal allocations, not separate bank balances. Transfers are balanced, audited and do not change total cash.
- Reserve spending must be distinguished from internal budget reallocations.
- Existing financial permissions for treasurer and fines officers remain unchanged until explicit rollout.

## Proposed schema (to validate against current data)
- club_teams (id, name, status, created_by, timestamps)
- club_team_memberships (team_id, player_id, status, dates, role)
- club_team_staff (team_id, user_id, role)
- club_budget_accounts (id, team_id nullable, type, season, allocation_pence)
- club_budget_movements (id, source_account_id, destination_account_id, amount_pence, reason, created_by, created_at)
- club_development_flags (feature, enabled_for_user, published)

## Implementation sequence
1. Audit live schema, existing policies and application entry points.
2. Add additive migration, guarded RLS, chair-only feature flag and rollback.
3. Map existing football records to First Team, without touching ledger or fines ownership.
4. Build chairman team and budget screens; no other user-facing changes.
5. Test permissions as chair, treasurer, manager, player and multi-team player.
6. Verify financial reconciliation, historical stats and existing Hub regression.
7. Present for chairman approval before enabling any wider access.

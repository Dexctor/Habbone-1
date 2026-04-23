/**
 * Per-row action state for the admin users panel.
 *
 * Extracted from AdminUsersPanel.tsx so it can be unit-tested without JSDOM.
 * Tracks, for each mutation type (saveRole / ban / delete / coins), which user
 * row is currently in-flight. Lets the UI show a spinner on the right row and
 * disable buttons during concurrent clicks.
 */

export type RowAction = 'saveRole' | 'ban' | 'delete' | 'coins';
export type RowActionState = Partial<Record<RowAction, string | null>>;

export type RowActionEvent =
  | { type: 'start'; action: RowAction; userId: string }
  | { type: 'end'; action: RowAction };

export function rowActionReducer(state: RowActionState, event: RowActionEvent): RowActionState {
  switch (event.type) {
    case 'start':
      return { ...state, [event.action]: event.userId };
    case 'end':
      return { ...state, [event.action]: null };
    default:
      return state;
  }
}

// Room naming utilities — single source of truth for all socket room names.
// No cross-restaurant or cross-branch events are ever emitted.

export const rooms = {
  restaurant:  (rid)  => `restaurant:${rid}`,
  kitchen:     (rid)  => `restaurant:${rid}:kitchen`,
  waiters:     (rid)  => `restaurant:${rid}:waiters`,
  cashiers:    (rid)  => `restaurant:${rid}:cashiers`,
  managers:    (rid)  => `restaurant:${rid}:managers`,
  branch:      (rid, bid) => `restaurant:${rid}:branch:${bid}`,
  platform:    ()     => 'platform',
};

// Roles allowed to join each room
export const ROLE_ROOMS = {
  kitchen:  ['kitchen'],
  waiters:  ['waiter'],
  cashiers: ['cashier'],
  managers: ['manager', 'admin'],
};

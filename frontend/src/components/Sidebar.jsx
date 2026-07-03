import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_CONFIG } from "../utils/roleConfig";
import toast from "react-hot-toast";

const navLink = (active) =>
  `px-4 py-3 rounded-xl flex justify-between items-center text-sm font-medium transition-all duration-200 ${
    active
      ? "bg-white text-black shadow-sm"
      : "text-gray-400 hover:bg-white/10 hover:text-white"
  }`;

const ALERT_STATUSES = ['expired', 'past_due', 'suspended'];
const BILLING_MATCHES = ['/admin/subscription', '/admin/billing', '/admin/payments'];

// ─── Per-role navigation definitions ─────────────────────────────────────────
const ADMIN_NAV = [
  { label: "Dashboard",    to: "/admin/dashboard",    match: "/admin/dashboard"    },
  { label: "Orders",       to: "/admin/orders",       match: "/admin/orders"       },
  { label: "Menu",         to: "/admin/menu",         match: "/admin/menu"         },
  { label: "Tables",       to: "/admin/tables",       match: "/admin/tables"       },
  { label: "Bills",        to: "/admin/bills",        match: "/admin/bills"        },
  { label: "Users",        to: "/admin/users",        match: "/admin/users"        },
  { label: "Branches",     to: "/admin/branches",     match: "/admin/branches"     },
  { label: "Subscription", to: "/admin/subscription", match: "/admin/subscription" },
  { label: "Billing",      to: "/admin/billing",      match: "/admin/billing"      },
  { label: "Payments",     to: "/admin/payments",     match: "/admin/payments"     },
];

const NAV_ITEMS = {
  admin: ADMIN_NAV,
  cashier: [
    { label: "Dashboard", to: "/pos/dashboard", match: "/pos/dashboard" },
    { label: "Menu",      to: "/pos/menu",      match: "/pos/menu"      },
    { label: "Bills",     to: "/pos/bills",     match: "/pos/bills"     },
  ],
  waiter: [
    { label: "Dashboard", to: "/waiter/dashboard", match: "/waiter/dashboard" },
  ],
  delivery: [
    { label: "Dashboard", to: "/delivery/dashboard", match: "/delivery/dashboard" },
  ],
  manager: [
    { label: "Dashboard", to: "/manager/dashboard", match: "/manager/dashboard" },
    { label: "Orders",    to: "/manager/orders",    match: "/manager/orders"    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleConfig  = ROLE_CONFIG[user?.role] ?? null;
  const links       = NAV_ITEMS[user?.role]   ?? [];
  const planStatus  = user?.restaurant?.planStatus;
  const needsAttention = ALERT_STATUSES.includes(planStatus);

  const handleLogout = () => {
    sessionStorage.clear();
    logout();                         // synchronous: clears localStorage + React state immediately
    navigate("/", { replace: true }); // replace prevents back-navigation into protected pages
    toast.success("Logged out");
  };

  return (
    <div className="w-60 h-full bg-black text-white flex flex-col border-r border-gray-800 relative overflow-hidden shrink-0">

      {/* Ambient glow */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
        <div className="absolute top-8  left-8  w-28 h-28 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-16 right-6 w-36 h-36 bg-gray-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full p-5">

        {/* Brand + role badge */}
        <div className="mb-8 shrink-0">
          <div className="bg-white text-black rounded-2xl p-4 text-center shadow-lg">
            <h1 className="text-xl font-black tracking-tight">Bayroute</h1>
            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">
              {roleConfig?.sidebarLabel ?? "Panel"}
            </p>
          </div>
          {/* Subscription alert banner */}
          {needsAttention && (
            <div className="mt-3 flex items-center gap-2 bg-red-950 border border-red-800 rounded-xl px-3 py-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <p className="text-[10px] font-bold text-red-300 leading-tight">
                {planStatus === 'expired'   && 'Plan expired — renew now'}
                {planStatus === 'past_due'  && 'Payment overdue'}
                {planStatus === 'suspended' && 'Account suspended'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation — scrolls independently if items overflow */}
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto min-h-0">
          {links.map(({ label, to, match }) => {
            const isActive   = location.pathname.startsWith(match);
            const isBillingLink = BILLING_MATCHES.includes(match);
            const showBadge  = needsAttention && isBillingLink;

            return (
              <Link
                key={to}
                to={to}
                className={navLink(isActive)}
              >
                {label}
                {showBadge ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                ) : (
                  <span className="text-gray-500 group-hover:text-white">→</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout + footer — always pinned to bottom */}
        <div className="pt-6 border-t border-gray-800 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-white/10 hover:text-red-400 transition-all text-left"
          >
            Sign out
          </button>
          <div className="mt-4 text-center text-gray-600 text-[10px]">
            <p className="font-semibold tracking-wide">ShahnaynLabs © 2026</p>
            <p className="mt-0.5">Built for modern restaurants</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;

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

// ─── Per-role navigation definitions ─────────────────────────────────────────
const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", match: "/admin/dashboard" },
    { label: "Orders",    to: "/admin/orders",    match: "/admin/orders"    },
    { label: "Menu",      to: "/admin/menu",      match: "/admin/menu"      },
    { label: "Tables",    to: "/admin/tables",    match: "/admin/tables"    },
    { label: "Bills",     to: "/admin/bills",     match: "/admin/bills"     },
    { label: "Users",     to: "/admin/users",     match: "/admin/users"     },
  ],
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
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleConfig = ROLE_CONFIG[user?.role] ?? null;
  const links      = NAV_ITEMS[user?.role]   ?? [];

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
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
        </div>

        {/* Navigation — scrolls independently if items overflow */}
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto min-h-0">
          {links.map(({ label, to, match }) => (
            <Link
              key={to}
              to={to}
              className={navLink(location.pathname.startsWith(match))}
            >
              {label}
              <span className="text-gray-500 group-hover:text-white">→</span>
            </Link>
          ))}
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

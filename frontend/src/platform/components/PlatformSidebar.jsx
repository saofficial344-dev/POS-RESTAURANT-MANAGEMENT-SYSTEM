import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Building2, BarChart3, ScrollText,
  Key, HeadphonesIcon, LogOut, Zap,
  Layers, Flag, Receipt, Users2, CreditCard, TrendingUp,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard',      to: '/platform/dashboard',      icon: LayoutDashboard },
  { label: 'Restaurants',    to: '/platform/restaurants',    icon: Building2       },
  { label: 'Analytics',      to: '/platform/analytics',      icon: BarChart3       },
  { label: null }, // divider
  { label: 'Plans',          to: '/platform/plans',          icon: Layers          },
  { label: 'Subscriptions',  to: '/platform/subscriptions',  icon: Users2          },
  { label: 'Invoices',       to: '/platform/invoices',       icon: Receipt         },
  { label: 'Payments',       to: '/platform/payments',       icon: CreditCard      },
  { label: 'Billing',        to: '/platform/billing',        icon: TrendingUp      },
  { label: 'Feature Flags',  to: '/platform/feature-flags',  icon: Flag            },
  { label: null }, // divider
  { label: 'Audit Logs',     to: '/platform/audit-logs',     icon: ScrollText      },
  { label: 'API Keys',       to: '/platform/api-keys',       icon: Key             },
  { label: 'Support',        to: '/platform/support',        icon: HeadphonesIcon  },
];

const PlatformSidebar = () => {
  const { pathname }    = useLocation();
  const { platformAdmin, platformLogout } = usePlatformAuth();
  const navigate        = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    platformLogout();                                    // clears localStorage + state immediately
    navigate('/platform/login', { replace: true });
    toast.success('Logged out of Developer Platform');
    platformAPI.post('/auth/logout').catch(() => {});    // fire-and-forget server-side revocation
  };

  const link = (to) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      pathname.startsWith(to)
        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
    }`;

  return (
    <div className="w-64 h-full bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">

      {/* Brand */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Developer Platform</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Bayroute SaaS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item, i) =>
          item.label === null ? (
            <div key={i} className="my-2 border-t border-gray-800/80" />
          ) : (
            <Link key={item.to} to={item.to} className={link(item.to)}>
              <item.icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          )
        )}
      </nav>

      {/* Admin info + logout */}
      <div className="p-3 border-t border-gray-800">
        <div className="px-4 py-3 rounded-xl bg-gray-900 mb-2">
          <p className="text-xs font-semibold text-gray-300 truncate">{platformAdmin?.admin?.name || 'Developer'}</p>
          <p className="text-[10px] text-gray-600 truncate">{platformAdmin?.admin?.email}</p>
          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
            {platformAdmin?.admin?.role || 'developer'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

    </div>
  );
};

export default PlatformSidebar;

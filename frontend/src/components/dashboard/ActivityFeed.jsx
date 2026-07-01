import { ShoppingBag, Receipt, ChefHat, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const STATUS_CONFIG = {
  Pending:   { color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400'   },
  Cooking:   { color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400'  },
  Ready:     { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  Served:    { color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400'    },
  Completed: { color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400'  },
  Cancelled: { color: 'bg-red-100 text-red-600',       dot: 'bg-red-400'     },
};

const ICON_MAP = {
  order:  { Icon: ShoppingBag, bg: 'bg-blue-50',    text: 'text-blue-500'    },
  bill:   { Icon: Receipt,     bg: 'bg-indigo-50',  text: 'text-indigo-500'  },
  check:  { Icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-500' },
  x:      { Icon: XCircle,     bg: 'bg-red-50',     text: 'text-red-500'     },
  alert:  { Icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-500'   },
  chef:   { Icon: ChefHat,     bg: 'bg-violet-50',  text: 'text-violet-500'  },
};

const ActivityItem = ({ activity }) => {
  const iconCfg    = ICON_MAP[activity.icon] || ICON_MAP.order;
  const { Icon }   = iconCfg;
  const statusCfg  = STATUS_CONFIG[activity.status] || STATUS_CONFIG.Pending;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 group hover:bg-gray-50/50 rounded-xl px-2 -mx-2 transition-colors">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconCfg.bg}`}>
        <Icon size={14} className={iconCfg.text} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-gray-700 leading-snug truncate">{activity.message}</p>
          {activity.urgent && (
            <span className="shrink-0 text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">URGENT</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusCfg.color}`}>
            {activity.status}
          </span>
          <span className="text-[10px] text-gray-400">{activity.by}</span>
          <span className="text-[10px] text-gray-300 ml-auto flex items-center gap-0.5">
            <Clock size={9} />
            {timeAgo(activity.time)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ActivityFeed = ({ activities = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2 bg-gray-50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Live Activity</h3>
          <p className="text-xs text-gray-400 mt-0.5">Real-time orders &amp; transactions</p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600">LIVE</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-3xl mb-2">🌐</p>
          <p className="text-sm font-medium text-gray-400">No recent activity</p>
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto space-y-0 scrollbar-thin">
          {activities.map((a, i) => (
            <ActivityItem key={a.id || i} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;

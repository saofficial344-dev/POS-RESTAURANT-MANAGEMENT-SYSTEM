import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, CheckCheck, ExternalLink, Utensils, CreditCard } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';

const PRIORITY_STYLES = {
  urgent: 'border-l-4 border-red-500 bg-red-50',
  high:   'border-l-4 border-orange-400 bg-orange-50',
  normal: 'border-l-4 border-blue-400 bg-white',
  low:    'border-l-4 border-gray-300 bg-gray-50',
};

const TIME_FMT = (dateStr) => {
  const d      = new Date(dateStr);
  const diffMs  = Date.now() - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
};

// Role → action button config
const ROLE_ACTION = {
  waiter:  { label: 'Serve Order', icon: Utensils,   color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  cashier: { label: 'Open Bill',   icon: CreditCard, color: 'bg-indigo-600 hover:bg-indigo-700 text-white'   },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Click on the notification row: mark read + navigate if actionUrl present
  const handleRowClick = (n) => {
    if (!n.read) markRead(n._id);
    if (n.actionUrl) {
      setOpen(false);
      navigate(n.actionUrl);
    }
  };

  // Click on the role-specific action button
  const handleAction = (e, n) => {
    e.stopPropagation();
    if (!n.read) markRead(n._id);
    const url = n.actionUrl;
    if (url) {
      setOpen(false);
      navigate(url);
    }
  };

  const roleAction = ROLE_ACTION[user?.role];

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-84 bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col max-h-[520px]" style={{ width: 340 }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 className="font-semibold text-gray-800 text-sm">
              Notifications{unreadCount > 0 && <span className="text-red-500 ml-1">({unreadCount})</span>}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading && (
              <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
            )}
            {!loading && notifications.length === 0 && (
              <div className="text-center py-12">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            )}
            {!loading && notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleRowClick(n)}
                className={`px-4 py-3 transition-all select-none ${
                  PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.normal
                } ${n.read ? 'opacity-60' : ''} ${n.actionUrl ? 'cursor-pointer hover:brightness-95' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Title + external-link icon */}
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm text-gray-800 truncate ${!n.read ? 'font-semibold' : 'font-medium'}`}>
                        {n.title}
                      </p>
                      {n.actionUrl && !n.read && (
                        <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>

                    {/* Metadata pills */}
                    {(n.tableNumber || n.orderNumber || n.billNumber) && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {n.tableNumber && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            T-{n.tableNumber}
                          </span>
                        )}
                        {n.orderNumber && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            #{n.orderNumber}
                          </span>
                        )}
                        {n.billNumber && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                            Bill #{n.billNumber}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Role-aware action button — shown only for unread, actionable notifications */}
                    {roleAction && n.actionUrl && !n.read && (
                      <button
                        onClick={(e) => handleAction(e, n)}
                        className={`mt-2 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg transition-colors ${roleAction.color}`}
                      >
                        <roleAction.icon className="w-3 h-3" />
                        {roleAction.label}
                      </button>
                    )}
                  </div>

                  {/* Timestamp + read indicator */}
                  <div className="flex flex-col items-end shrink-0 gap-1 ml-1">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{TIME_FMT(n.createdAt)}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    {n.read  && <Check className="w-3 h-3 text-gray-300" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

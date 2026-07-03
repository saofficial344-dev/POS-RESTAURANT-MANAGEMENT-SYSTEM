import { Clock } from 'lucide-react';

const STATUS_DOT = {
  Pending:   'bg-amber-400',
  Cooking:   'bg-purple-500',
  Ready:     'bg-emerald-500',
  Served:    'bg-blue-500',
  Completed: 'bg-gray-400',
  Cancelled: 'bg-red-400',
};

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

const diffMin = (a, b) => {
  if (!a || !b) return null;
  const diff = Math.round((new Date(a) - new Date(b)) / 60000);
  return diff > 0 ? `+${diff}m` : null;
};

/**
 * Displays an order's timeline array as a vertical timeline.
 * Props:
 *   timeline — array of { status, byName, at, note }
 *   compact  — boolean, shows a condensed single-line version (default false)
 */
export default function OrderTimeline({ timeline = [], compact = false }) {
  if (timeline.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
        <Clock size={12} /> No timeline recorded
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {timeline.map((entry, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[entry.status] || 'bg-gray-300'}`} />
            <span className="text-[10px] text-gray-500 font-medium">{entry.status}</span>
            {i < timeline.length - 1 && (
              <span className="text-gray-200 text-xs">›</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative pl-5 space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

      {timeline.map((entry, i) => {
        const prev = i > 0 ? timeline[i - 1] : null;
        const wait = diffMin(entry.at, prev?.at);
        return (
          <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
            {/* Dot */}
            <div className={`absolute left-[-13px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 ${STATUS_DOT[entry.status] || 'bg-gray-300'}`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-gray-800">{entry.status}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {wait && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{wait}</span>
                  )}
                  <span className="text-[10px] text-gray-400">{fmtTime(entry.at)}</span>
                </div>
              </div>
              {entry.byName && (
                <p className="text-[10px] text-gray-400 mt-0.5">by {entry.byName}</p>
              )}
              {entry.note && (
                <p className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1">{entry.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

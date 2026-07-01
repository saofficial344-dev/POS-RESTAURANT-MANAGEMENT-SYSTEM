import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = (n, isCurrency = false) => {
  if (n === undefined || n === null) return '—';
  const num = Number(n);
  if (isCurrency) {
    if (num >= 1_000_000) return `Rs ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)     return `Rs ${(num / 1_000).toFixed(1)}K`;
    return `Rs ${Math.round(num).toLocaleString()}`;
  }
  return num.toLocaleString();
};

const ACCENTS = {
  indigo:   { bg: 'bg-indigo-50',  text: 'text-indigo-600',  bar: 'bg-indigo-500'  },
  blue:     { bg: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-500'    },
  emerald:  { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber:    { bg: 'bg-amber-50',   text: 'text-amber-600',   bar: 'bg-amber-500'   },
  red:      { bg: 'bg-red-50',     text: 'text-red-600',     bar: 'bg-red-500'     },
  violet:   { bg: 'bg-violet-50',  text: 'text-violet-600',  bar: 'bg-violet-500'  },
  orange:   { bg: 'bg-orange-50',  text: 'text-orange-600',  bar: 'bg-orange-500'  },
  teal:     { bg: 'bg-teal-50',    text: 'text-teal-600',    bar: 'bg-teal-500'    },
  rose:     { bg: 'bg-rose-50',    text: 'text-rose-600',    bar: 'bg-rose-500'    },
  slate:    { bg: 'bg-slate-50',   text: 'text-slate-600',   bar: 'bg-slate-500'   },
  black:    { bg: 'bg-gray-900',   text: 'text-white',       bar: 'bg-white'       },
};

// ── KPICard ────────────────────────────────────────────────────────────────────
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'indigo',
  isCurrency = false,
  trend,          // number: positive = up, negative = down
  trendLabel,     // text label for the trend
  loading = false,
  dark = false,
}) => {
  const a = ACCENTS[accent] || ACCENTS.indigo;
  const hasTrend = trend !== undefined && trend !== null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100" />
          <div className="w-16 h-5 rounded-full bg-gray-100" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-lg mb-2" />
        <div className="h-3 w-32 bg-gray-50 rounded" />
      </div>
    );
  }

  if (dark) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Icon size={18} className="text-white" />
            </div>
          )}
          {hasTrend && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : trend < 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'
            }`}>
              {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-white tracking-tight">
          {fmt(value, isCurrency)}
        </p>
        <p className="text-xs font-medium text-gray-400 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
        {trendLabel && <p className="text-xs text-gray-500 mt-1">{trendLabel}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.bg}`}>
            <Icon size={18} className={a.text} />
          </div>
        )}
        {hasTrend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend > 0 ? 'bg-emerald-50 text-emerald-600' : trend < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
          }`}>
            {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">
        {fmt(value, isCurrency)}
      </p>
      <p className="text-xs font-semibold text-gray-500 mt-1.5 uppercase tracking-widest">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  );
};

export default KPICard;

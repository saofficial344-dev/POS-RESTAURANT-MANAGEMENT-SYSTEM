import { LifeBuoy, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const PLACEHOLDER_STATS = [
  { label: 'Open Tickets',   value: '—', icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10' },
  { label: 'In Progress',    value: '—', icon: Clock,         color: 'text-blue-400  bg-blue-400/10'  },
  { label: 'Resolved Today', value: '—', icon: CheckCircle,   color: 'text-green-400 bg-green-400/10' },
];

const PlatformSupport = () => (
  <div className="p-6 max-w-screen-xl mx-auto">

    <div className="mb-8">
      <h2 className="text-xl font-black text-white">Support Center</h2>
      <p className="text-xs text-gray-600 mt-1">Manage restaurant support tickets</p>
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {PLACEHOLDER_STATS.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${color}`}>
            <Icon size={18} />
          </div>
          <p className="text-2xl font-black text-white">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
      ))}
    </div>

    {/* Coming soon banner */}
    <div className="flex flex-col items-center justify-center bg-gray-800/50 border border-gray-700/50 rounded-2xl p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <LifeBuoy size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-lg font-black text-white mb-2">Support Center</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        Full ticket management is coming in a future phase. Restaurant admins will be able to submit tickets directly from their dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {['Ticket Queue', 'Priority Routing', 'Response Templates', 'SLA Tracking'].map((f) => (
          <span key={f} className="text-[11px] font-semibold px-3 py-1 bg-gray-700/50 text-gray-500 rounded-full border border-gray-700">
            {f}
          </span>
        ))}
      </div>
    </div>

  </div>
);

export default PlatformSupport;

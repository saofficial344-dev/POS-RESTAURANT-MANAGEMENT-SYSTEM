import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const fmtRev = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-bold text-gray-600 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-900">
            {p.name.toLowerCase().includes('revenue')
              ? `Rs ${fmtRev(p.value)}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ROLE_COLORS = {
  Cashiers:  '#6366F1',
  Waiters:   '#3B82F6',
  Kitchen:   '#F59E0B',
  Delivery:  '#F97316',
  Managers:  '#8B5CF6',
};

const EmployeeChart = ({ staffChart = [], cashierPerformance = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-48 bg-gray-100 rounded-lg mb-6" />
        <div className="h-56 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  const staffData  = staffChart.filter(s => s.count > 0);
  const cashierData = cashierPerformance.slice(0, 5);
  const hasStaff   = staffData.length > 0;
  const hasCashier = cashierData.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-900">Staff Overview</h3>
        <p className="text-xs text-gray-400 mt-0.5">Active headcount by role</p>
      </div>

      {!hasStaff ? (
        <div className="h-56 flex flex-col items-center justify-center text-gray-300">
          <p className="text-4xl mb-2">👥</p>
          <p className="text-sm font-medium">No staff data yet</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={staffData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="role"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="count" name="Staff Count" radius={[6, 6, 0, 0]}>
                {staffData.map((entry, i) => (
                  <Cell key={i} fill={ROLE_COLORS[entry.role] || '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Top cashier list */}
          {hasCashier && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Top Cashiers This Month
              </p>
              <div className="space-y-2">
                {cashierData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        Rs {Math.round(c.revenue).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400">{c.bills} bills</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeChart;

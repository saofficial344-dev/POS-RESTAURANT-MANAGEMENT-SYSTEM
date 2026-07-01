import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="text-sm font-semibold text-gray-700">{d.name}</span>
      </div>
      <p className="text-lg font-black text-gray-900 mt-1">{d.value}</p>
      <p className="text-xs text-gray-400">{d.payload.percent ? `${(d.payload.percent * 100).toFixed(1)}%` : ''}</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const DonutChart = ({ title, subtitle, data = [], loading = false, showLegend = true }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-100 rounded-lg mb-6" />
        <div className="flex items-center justify-center">
          <div className="w-44 h-44 rounded-full bg-gray-50" />
        </div>
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map(i => <div key={i} className="h-3 bg-gray-50 rounded" />)}
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const hasData = total > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {!hasData ? (
        <div className="h-56 flex flex-col items-center justify-center text-gray-300">
          <p className="text-4xl mb-2">🍩</p>
          <p className="text-sm font-medium">No data yet</p>
        </div>
      ) : (
        <>
          {/* Centre total */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  dataKey="value"
                  paddingAngle={2}
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-gray-900">{total}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Total</p>
            </div>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
              {data.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-gray-500 truncate">{entry.name}</span>
                  <span className="text-xs font-bold text-gray-900 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DonutChart;

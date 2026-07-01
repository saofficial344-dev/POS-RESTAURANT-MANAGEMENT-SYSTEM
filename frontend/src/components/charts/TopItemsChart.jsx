import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CHART_COLORS = [
  '#6366F1', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#F97316', '#14B8A6',
];

const fmtRev = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl max-w-[220px]">
      <p className="text-xs font-bold text-gray-700 mb-2 break-words">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Sold</span>
          <span className="font-bold text-gray-900">{d.payload.quantity} pcs</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Revenue</span>
          <span className="font-bold text-indigo-600">Rs {d.payload.revenue?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const TopItemsChart = ({ data = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-44 bg-gray-100 rounded-lg mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-24 bg-gray-100 rounded" />
              <div className="flex-1 h-6 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayData = data.slice(0, 8).map(item => ({
    name:     item.name.length > 18 ? item.name.slice(0, 18) + '…' : item.name,
    fullName: item.name,
    quantity: item.quantity,
    revenue:  item.revenue,
  }));

  const hasData = displayData.some(d => d.quantity > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-900">Top Selling Items</h3>
        <p className="text-xs text-gray-400 mt-0.5">Last 30 days — by quantity sold</p>
      </div>

      {!hasData ? (
        <div className="h-56 flex flex-col items-center justify-center text-gray-300">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-sm font-medium">No sales data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            layout="vertical"
            data={displayData}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barSize={18}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="quantity" name="Qty Sold" radius={[0, 6, 6, 0]}>
              {displayData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TopItemsChart;

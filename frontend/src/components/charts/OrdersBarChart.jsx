import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const VIEWS = [
  { label: 'By Day',  key: 'day'  },
  { label: 'By Hour', key: 'hour' },
];

const OrdersBarChart = ({ weeklyRevenue = [], ordersByHour = [], loading = false }) => {
  const [view, setView] = useState('day');

  const data = view === 'day'
    ? weeklyRevenue.map(d => ({ label: d.day, value: d.orders || 0 }))
    : ordersByHour
        .filter((_, i) => i % 2 === 0)   // show every 2 hours to avoid crowding
        .map(d => ({ label: d.hour, value: d.count }));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-32 bg-gray-100 rounded-lg" />
          <div className="h-8 w-36 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-64 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  const hasData = data.some(d => d.value > 0);
  const maxVal   = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">Orders Analytics</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {view === 'day' ? 'Last 7 days' : "Today's hourly breakdown"}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-300">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm font-medium">No order data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barSize={view === 'hour' ? 10 : 32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="value" name="Orders" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.value === maxVal ? '#3B82F6' : '#BFDBFE'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default OrdersBarChart;

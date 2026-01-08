'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { InventoryItem } from '@/lib/supabase';

interface StatisticsProps {
  items: InventoryItem[];
  isAdmin: boolean;
  onClose: () => void;
}

const formatPeso = (amount: number) => '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any) => formatPeso(Number(value) || 0);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPieLabel = ({ name, percent }: any) => name + ' ' + ((percent || 0) * 100).toFixed(0) + '%';

type Period = 'day' | 'week' | 'month' | 'year';
type ViewMode = 'simple' | 'advanced';

export default function Statistics({ items, isAdmin, onClose }: StatisticsProps) {
  const [period, setPeriod] = useState<Period>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

  // Filter items by period
  const filteredItems = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
    }
    return items.filter(item => new Date(item.created_at) >= startDate);
  }, [items, period]);

  // Summary stats
  const summary = useMemo(() => {
    const totalCost = filteredItems.reduce((sum, item) => sum + item.cost * item.qty, 0);
    const totalSale = filteredItems.reduce((sum, item) => sum + item.sale * item.qty, 0);
    const totalFreight = filteredItems.reduce((sum, item) => sum + item.freight_cost, 0);
    const delivered = filteredItems.filter(i => i.status === 'delivered');
    const profit = delivered.reduce((sum, item) => sum + ((item.sale - item.cost) * item.qty - (item.sale * item.qty * (item.discount || 0) / 100)), 0);
    const avgOrderValue = filteredItems.length > 0 ? totalSale / filteredItems.length : 0;
    const pendingPayments = filteredItems.filter(i => i.status === 'delivered' && !i.payment_collected).length;
    return { totalCost, totalSale, totalFreight, profit, avgOrderValue, pendingPayments, totalItems: filteredItems.length };
  }, [filteredItems]);

  // Chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const data: Record<string, { label: string; cost: number; sale: number; profit: number; freight: number; count: number }> = {};
    if (period === 'day') {
      for (let i = 23; i >= 0; i--) {
        const hour = (now.getHours() - i + 24) % 24;
        data[hour.toString()] = { label: hour + ':00', cost: 0, sale: 0, profit: 0, freight: 0, count: 0 };
      }
    } else if (period === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        data[d.toISOString().split('T')[0]] = { label: days[d.getDay()], cost: 0, sale: 0, profit: 0, freight: 0, count: 0 };
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        data[d.toISOString().split('T')[0]] = { label: (d.getMonth() + 1) + '/' + d.getDate(), cost: 0, sale: 0, profit: 0, freight: 0, count: 0 };
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < 12; i++) data[i.toString()] = { label: months[i], cost: 0, sale: 0, profit: 0, freight: 0, count: 0 };
    }
    filteredItems.forEach(item => {
      const itemDate = new Date(item.created_at);
      let key: string;
      if (period === 'day') key = itemDate.getHours().toString();
      else if (period === 'week' || period === 'month') key = itemDate.toISOString().split('T')[0];
      else key = itemDate.getMonth().toString();
      if (data[key]) {
        data[key].cost += item.cost * item.qty;
        data[key].sale += item.sale * item.qty;
        data[key].freight += item.freight_cost;
        data[key].count += 1;
        if (item.status === 'delivered') data[key].profit += (item.sale - item.cost) * item.qty - (item.sale * item.qty * (item.discount || 0) / 100);
      }
    });
    return Object.values(data);
  }, [filteredItems, period]);

  // Status: inquired=blue, bought=red, arrived=yellow, delivered=green
  const statusData = useMemo(() => {
    const counts = { inquired: 0, bought: 0, arrived: 0, delivered: 0 };
    filteredItems.forEach(item => counts[item.status]++);
    return [
      { name: 'Inquired', value: counts.inquired, color: '#3b82f6' },
      { name: 'Bought', value: counts.bought, color: '#ef4444' },
      { name: 'Arrived', value: counts.arrived, color: '#eab308' },
      { name: 'Delivered', value: counts.delivered, color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [filteredItems]);

  const freightData = useMemo(() => {
    const counts = { sea: 0, land: 0, air: 0 };
    filteredItems.forEach(item => counts[item.freight_type]++);
    return [
      { name: 'Sea', value: counts.sea, color: '#3b82f6' },
      { name: 'Land', value: counts.land, color: '#f59e0b' },
      { name: 'Air', value: counts.air, color: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [filteredItems]);

  const vatData = useMemo(() => {
    const counts = { vat: 0, nonVat: 0 };
    filteredItems.forEach(item => { if (item.vat_type === 'vat_inclusive') counts.vat++; else counts.nonVat++; });
    return [
      { name: 'VAT Inclusive', value: counts.vat, color: '#8b5cf6' },
      { name: 'Non-VAT', value: counts.nonVat, color: '#f97316' },
    ].filter(d => d.value > 0);
  }, [filteredItems]);

  const topSuppliers = useMemo(() => {
    const suppliers: Record<string, number> = {};
    filteredItems.forEach(item => { suppliers[item.supplier_name] = (suppliers[item.supplier_name] || 0) + item.cost * item.qty; });
    return Object.entries(suppliers).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  const topCustomers = useMemo(() => {
    const customers: Record<string, number> = {};
    filteredItems.forEach(item => { customers[item.customer] = (customers[item.customer] || 0) + item.sale * item.qty; });
    return Object.entries(customers).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  const gridCols = isAdmin ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
  const profitColor = summary.profit >= 0 ? 'text-emerald-400' : 'text-red-400';
  const profitSign = summary.profit >= 0 ? '+' : '';
  const tickFmt = (v: number) => '₱' + (v/1000).toFixed(0) + 'k';
  const periodLabel = period === 'day' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year';

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto">
      <div className="min-h-screen p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Statistics Dashboard</h1>
            <p className="text-slate-400 mt-1">Analytics for {periodLabel}</p>
          </div>
          <button onClick={onClose} className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={'px-4 py-2 rounded-lg text-sm font-medium transition ' + (period === p ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white')}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button onClick={() => setViewMode('simple')} className={'px-4 py-2 rounded-lg text-sm font-medium transition ' + (viewMode === 'simple' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white')}>Simple</button>
            <button onClick={() => setViewMode('advanced')} className={'px-4 py-2 rounded-lg text-sm font-medium transition ' + (viewMode === 'advanced' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white')}>Advanced</button>
          </div>
        </div>

        <div className={'grid ' + gridCols + ' gap-4 mb-8'}>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Items</p><p className="text-2xl font-bold text-white">{summary.totalItems}</p></div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Total Cost</p><p className="text-2xl font-bold text-red-400">{formatPeso(summary.totalCost)}</p></div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Total Sale</p><p className="text-2xl font-bold text-emerald-400">{formatPeso(summary.totalSale)}</p></div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Total Freight</p><p className="text-2xl font-bold text-orange-400">{formatPeso(summary.totalFreight)}</p></div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Avg Order Value</p><p className="text-2xl font-bold text-cyan-400">{formatPeso(summary.avgOrderValue)}</p></div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Pending Payments</p><p className="text-2xl font-bold text-amber-400">{summary.pendingPayments}</p></div>
          {isAdmin && <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10"><p className="text-slate-400 text-sm">Profit</p><p className={'text-2xl font-bold ' + profitColor}>{profitSign}{formatPeso(summary.profit)}</p></div>}
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">{periodLabel} Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={tickFmt} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={tooltipFormatter} />
              <Legend />
              <Area type="monotone" dataKey="sale" name="Sale" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Area type="monotone" dataKey="cost" name="Cost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {viewMode === 'advanced' && (
          <>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Cost vs Sale vs Freight</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={tickFmt} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={tooltipFormatter} />
                  <Legend />
                  <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sale" name="Sale" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="freight" name="Freight" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>{statusData.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Freight Type</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={freightData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>{freightData.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">VAT Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={vatData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>{vatData.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /></PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Top 5 Suppliers (by Cost)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topSuppliers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={tickFmt} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={tooltipFormatter} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Top 5 Customers (by Sale)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topCustomers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={tickFmt} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={tooltipFormatter} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {isAdmin && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Profit Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={tickFmt} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={tooltipFormatter} />
                    <Legend />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

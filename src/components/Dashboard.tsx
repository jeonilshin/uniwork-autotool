'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut, getUser } from '@/lib/auth';
import {
  supabase,
  getFilteredItems,
  addItem,
  deleteItem,
  uploadImage,
  updateItemStatus,
  InventoryItem,
  ItemStatus,
  FilterOptions,
} from '@/lib/supabase';

interface DashboardProps {
  onLogout: () => void;
}

// Format number as Philippine Peso
const formatPeso = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TruckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zM3 9h13l3 6v4h-3M3 9V5a1 1 0 011-1h9a1 1 0 011 1v4M3 9h10" />
  </svg>
);

const StatusProgressBar = ({ status }: { status: ItemStatus }) => {
  const steps: ItemStatus[] = ['bought', 'delivered', 'received'];
  const currentIndex = steps.indexOf(status);
  // 0 = bought (0%), 1 = delivered (50%), 2 = received (100%)
  const progress = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="relative">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-500" style={{ left: `calc(${progress}% - 12px)` }}>
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <TruckIcon className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs">
        {steps.map((step, i) => (
          <span key={step} className={i <= currentIndex ? 'text-emerald-400' : 'text-slate-500'}>
            {step.charAt(0).toUpperCase() + step.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard({ onLogout }: DashboardProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all' });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const data = await getFilteredItems({ ...filters, searchQuery });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserId(user.id);
      }
      fetchItems();
    };
    init();

    const channel = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchItems())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, filters, fetchItems]);

  const handleLogout = async () => { await signOut(); onLogout(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteItem(id);
      setItems(items.filter(item => item.id !== id));
      setSelectedItem(null);
    } catch (error) { console.error('Failed to delete item:', error); }
  };

  const handleStatusChange = async (id: string, status: ItemStatus) => {
    try {
      const updated = await updateItemStatus(id, status);
      setItems(items.map(item => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) setSelectedItem(updated);
    } catch (error) { console.error('Failed to update status:', error); }
  };

  // Only count received items for profit calculation
  const receivedItems = items.filter(item => item.status === 'received');
  const totalBought = items.reduce((sum, item) => sum + item.bought_price, 0);
  const totalSold = items.reduce((sum, item) => sum + item.sold_price, 0);
  const profit = receivedItems.reduce((sum, item) => sum + (item.sold_price - item.bought_price), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Uniwork</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 hidden sm:block"><span className="text-white font-medium">{userEmail}</span></span>
              <button onClick={handleLogout} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <p className="text-slate-400 text-sm">Total Items</p>
            <p className="text-2xl font-bold text-white">{items.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <p className="text-slate-400 text-sm">Total Bought</p>
            <p className="text-2xl font-bold text-white">{formatPeso(totalBought)}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <p className="text-slate-400 text-sm">Total Sold</p>
            <p className="text-2xl font-bold text-white">{formatPeso(totalSold)}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <p className="text-slate-400 text-sm">Profit (Received Only)</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : '-'}{formatPeso(Math.abs(profit))}
            </p>
          </div>
        </div>

        {/* Search, Filters, View Toggle, and Add */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, customers..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-xl border transition flex items-center gap-2 ${
                  showFilters || filters.status !== 'all' || filters.minPrice || filters.maxPrice
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filters</span>
              </button>
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-lg transition ${viewMode === 'card' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg transition ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Item</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select value={filters.status || 'all'} onChange={(e) => setFilters({ ...filters, status: e.target.value as ItemStatus | 'all' })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                    <option value="all">All Status</option>
                    <option value="bought">Bought</option>
                    <option value="delivered">Delivered</option>
                    <option value="received">Received</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Min Price (₱)</label>
                  <input type="number" value={filters.minPrice || ''} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Price (₱)</label>
                  <input type="number" value={filters.maxPrice || ''} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="100000" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => setFilters({ status: 'all' })} className="w-full px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">Clear Filters</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items Display */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-400">No items found. Add your first item!</p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden hover:border-emerald-500/50 transition cursor-pointer group">
                {item.image_url ? (
                  <div className="aspect-video bg-slate-800 overflow-hidden">
                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{item.product_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'received' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'delivered' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{item.customer_name}</p>
                  <div className="mb-4"><StatusProgressBar status={item.status} /></div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 font-medium">{formatPeso(item.sold_price)}</span>
                    <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-slate-400 font-medium">Product</th>
                  <th className="text-left p-4 text-slate-400 font-medium hidden md:table-cell">Customer</th>
                  <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Status</th>
                  <th className="text-right p-4 text-slate-400 font-medium">Bought</th>
                  <th className="text-right p-4 text-slate-400 font-medium">Sold</th>
                  <th className="text-right p-4 text-slate-400 font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <span className="text-white font-medium">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 hidden md:table-cell">{item.customer_name}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'received' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'delivered' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-red-400">{formatPeso(item.bought_price)}</td>
                    <td className="p-4 text-right text-emerald-400">{formatPeso(item.sold_price)}</td>
                    <td className="p-4 text-right text-slate-500 hidden sm:table-cell">{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showAddModal && <AddItemModal userId={userId} onClose={() => setShowAddModal(false)} onAdd={(item) => { setItems([item, ...items]); setShowAddModal(false); }} />}
      {selectedItem && <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onDelete={() => handleDelete(selectedItem.id)} onStatusChange={(status) => handleStatusChange(selectedItem.id, status)} />}
    </div>
  );
}


function ItemDetailModal({ item, onClose, onDelete, onStatusChange }: { item: InventoryItem; onClose: () => void; onDelete: () => void; onStatusChange: (status: ItemStatus) => void }) {
  const profit = item.sold_price - item.bought_price;
  const statuses: ItemStatus[] = ['bought', 'delivered', 'received'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
        {item.image_url ? (
          <div className="aspect-video bg-slate-900 overflow-hidden">
            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <svg className="w-20 h-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{item.product_name}</h2>
              <p className="text-slate-400">{new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-slate-400 text-sm mb-3">Delivery Status</p>
            <StatusProgressBar status={item.status} />
            <div className="flex gap-2 mt-4">
              {statuses.map((status) => (
                <button key={status} onClick={() => onStatusChange(status)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${item.status === status ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Customer Name</p>
              <p className="text-white font-medium">{item.customer_name}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Bought From</p>
              <p className="text-white font-medium">{item.bought_from}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Sold To</p>
              <p className="text-white font-medium">{item.sold_to}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Profit/Loss {item.status !== 'received' && <span className="text-xs">(pending)</span>}</p>
              <p className={`font-medium ${item.status === 'received' ? (profit >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                {item.status === 'received' ? `${profit >= 0 ? '+' : '-'}${formatPeso(Math.abs(profit))}` : formatPeso(profit)}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm mb-1">Bought Price</p>
              <p className="text-2xl font-bold text-red-400">{formatPeso(item.bought_price)}</p>
            </div>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-emerald-400 text-sm mb-1">Sold Price</p>
              <p className="text-2xl font-bold text-emerald-400">{formatPeso(item.sold_price)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 px-4 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">Close</button>
            <button onClick={onDelete} className="py-3 px-6 bg-red-500/10 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AddItemModal({ userId, onClose, onAdd }: { userId: string; onClose: () => void; onAdd: (item: InventoryItem) => void }) {
  const [formData, setFormData] = useState({ product_name: '', customer_name: '', bought_from: '', sold_to: '', bought_price: '', sold_price: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage(imageFile, userId);
      const item = await addItem({
        product_name: formData.product_name,
        customer_name: formData.customer_name,
        bought_from: formData.bought_from,
        sold_to: formData.sold_to,
        bought_price: Number(formData.bought_price),
        sold_price: Number(formData.sold_price),
        image_url: imageUrl,
        status: 'bought',
        user_id: userId,
      });
      onAdd(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add New Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Product Name *</label>
            <input type="text" value={formData.product_name} onChange={(e) => setFormData({ ...formData, product_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Product name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name *</label>
            <input type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Customer name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bought From *</label>
              <input type="text" value={formData.bought_from} onChange={(e) => setFormData({ ...formData, bought_from: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Source" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sold To *</label>
              <input type="text" value={formData.sold_to} onChange={(e) => setFormData({ ...formData, sold_to: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Destination" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bought Price (₱) *</label>
              <input type="number" value={formData.bought_price} onChange={(e) => setFormData({ ...formData, bought_price: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="0.00" min="0" step="0.01" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sold Price (₱) *</label>
              <input type="number" value={formData.sold_price} onChange={(e) => setFormData({ ...formData, sold_price: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="0.00" min="0" step="0.01" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Image</label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
            <label htmlFor="image-upload" className="flex items-center justify-center w-full px-4 py-8 bg-white/5 border-2 border-dashed border-white/20 rounded-xl text-slate-400 hover:border-emerald-500 hover:text-emerald-400 cursor-pointer transition">
              {imagePreview ? <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" /> : (
                <div className="text-center">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Click to upload image</span>
                </div>
              )}
            </label>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm text-center">{error}</div>}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50">{loading ? 'Adding...' : 'Add Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

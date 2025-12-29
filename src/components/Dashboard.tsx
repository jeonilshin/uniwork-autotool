'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut, getUser, getUserRole } from '@/lib/auth';
import {
  supabase, getFilteredItems, addItem, deleteItem, uploadImage, updateItemStatus, updateItemInquired,
  getSecretaries, inviteSecretary, deleteSecretary,
  InventoryItem, ItemStatus, FreightType, VatType, FilterOptions, UserRole, UserProfile,
} from '@/lib/supabase';

interface DashboardProps {
  onLogout: () => void;
}

const formatPeso = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TruckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zM3 9h13l3 6v4h-3M3 9V5a1 1 0 011-1h9a1 1 0 011 1v4M3 9h10" />
  </svg>
);

const FreightIcon = ({ type, className }: { type: FreightType; className?: string }) => {
  if (type === 'sea') return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h18M3 17l2-9h14l2 9M7 8V6a1 1 0 011-1h8a1 1 0 011 1v2" /></svg>;
  if (type === 'air') return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
  return <TruckIcon className={className} />;
};

const StatusProgressBar = ({ status }: { status: ItemStatus }) => {
  const steps: ItemStatus[] = ['bought', 'arrived', 'delivered'];
  const currentIndex = steps.indexOf(status);
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

const ScreenshotProtection = ({ children, enabled }: { children: React.ReactNode; enabled: boolean }) => {
  useEffect(() => {
    if (!enabled) return;
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && e.key === 'S') || (e.metaKey && e.shiftKey && ['3','4','5'].includes(e.key))) {
        e.preventDefault(); alert('Screenshots are not allowed');
      }
    };
    const handleVisibilityChange = () => {
      const overlay = document.getElementById('screenshot-overlay');
      if (overlay) overlay.style.display = document.hidden ? 'flex' : 'none';
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  if (!enabled) return <>{children}</>;
  return (
    <div className="relative select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      {children}
      <div id="screenshot-overlay" className="fixed inset-0 bg-slate-900 z-[9999] items-center justify-center hidden">
        <p className="text-white text-xl">Content hidden for security</p>
      </div>
    </div>
  );
};

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'secretaries'>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [secretaries, setSecretaries] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSecretaryModal, setShowSecretaryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all', freightType: 'all', vatType: 'all', inquired: 'all' });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('secretary');

  const isAdmin = userRole === 'admin';

  const fetchItems = useCallback(async () => {
    try { const data = await getFilteredItems({ ...filters, searchQuery }); setItems(data); }
    catch (error) { console.error('Failed to fetch items:', error); }
    finally { setLoading(false); }
  }, [filters, searchQuery]);

  const fetchSecretaries = useCallback(async (adminId: string) => {
    try { const data = await getSecretaries(adminId); setSecretaries(data); }
    catch (error) { console.error('Failed to fetch secretaries:', error); }
  }, []);

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (user) {
        setUserEmail(user.email || ''); setUserId(user.id);
        const role = await getUserRole(user.id);
        setUserRole(role);
        if (role === 'admin') fetchSecretaries(user.id);
      }
      fetchItems();
    };
    init();

    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchItems())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchItems, fetchSecretaries]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, filters, fetchItems]);

  const handleLogout = async () => { await signOut(); onLogout(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try { await deleteItem(id); setItems(items.filter(item => item.id !== id)); setSelectedItem(null); }
    catch (error) { console.error('Failed to delete item:', error); }
  };

  const handleDeleteSecretary = async (id: string) => {
    if (!confirm('Remove this secretary?')) return;
    try { await deleteSecretary(id); setSecretaries(secretaries.filter(s => s.id !== id)); }
    catch (error) { console.error('Failed to delete secretary:', error); }
  };

  const handleStatusChange = async (id: string, status: ItemStatus) => {
    try {
      const updated = await updateItemStatus(id, status);
      setItems(items.map(item => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) setSelectedItem(updated);
    } catch (error) { console.error('Failed to update status:', error); }
  };

  const handleInquiredChange = async (id: string, is_inquired: boolean) => {
    try {
      const updated = await updateItemInquired(id, is_inquired);
      setItems(items.map(item => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) setSelectedItem(updated);
    } catch (error) { console.error('Failed to update inquired:', error); }
  };

  const totalBought = items.reduce((sum, item) => sum + item.bought_price, 0);
  const totalSold = items.reduce((sum, item) => sum + item.sold_price, 0);
  const deliveredItems = items.filter(item => item.status === 'delivered');
  const profit = deliveredItems.reduce((sum, item) => sum + (item.sold_price - item.bought_price), 0);
  const inquiredCount = items.filter(item => item.is_inquired).length;

  return (
    <ScreenshotProtection enabled={!isAdmin}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <TruckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">UTS 1.0</h1>
                  <span className={`text-xs px-2 py-0.5 rounded ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {isAdmin ? 'Admin' : 'Secretary'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 hidden sm:block"><span className="text-white font-medium">{userEmail}</span></span>
                <button onClick={handleLogout} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition">Logout</button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'inventory' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
              Inventory
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('secretaries')} className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'secretaries' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                Secretaries ({secretaries.length})
              </button>
            )}
          </div>

          {activeTab === 'inventory' ? (
            <>
              {/* Stats */}
              <div className={`grid ${isAdmin ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'} gap-4 mb-8`}>
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                  <p className="text-slate-400 text-sm">Total Items</p>
                  <p className="text-2xl font-bold text-white">{items.length}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                  <p className="text-slate-400 text-sm">Inquired</p>
                  <p className="text-2xl font-bold text-cyan-400">{inquiredCount}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                  <p className="text-slate-400 text-sm">Total Bought</p>
                  <p className="text-2xl font-bold text-white">{formatPeso(totalBought)}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                  <p className="text-slate-400 text-sm">Total Sold</p>
                  <p className="text-2xl font-bold text-white">{formatPeso(totalSold)}</p>
                </div>
                {isAdmin && (
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                    <p className="text-slate-400 text-sm">Profit (Delivered)</p>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : '-'}{formatPeso(Math.abs(profit))}
                    </p>
                  </div>
                )}
              </div>

              {/* Search, Filters, View Toggle, and Add */}
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products, customers..." className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-3 rounded-xl border transition flex items-center gap-2 ${showFilters || filters.status !== 'all' || filters.freightType !== 'all' || filters.vatType !== 'all' || filters.inquired !== 'all' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      <span className="hidden sm:inline">Filters</span>
                    </button>
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                      <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-lg transition ${viewMode === 'card' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      </button>
                      <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg transition ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      </button>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="hidden sm:inline">Add Item</span>
                    </button>
                  </div>
                </div>

                {showFilters && (
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                        <select value={filters.status || 'all'} onChange={(e) => setFilters({ ...filters, status: e.target.value as ItemStatus | 'all' })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="bought">Bought</option>
                          <option value="arrived">Arrived</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Freight</label>
                        <select value={filters.freightType || 'all'} onChange={(e) => setFilters({ ...filters, freightType: e.target.value as FreightType | 'all' })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="sea">Sea</option>
                          <option value="land">Land</option>
                          <option value="air">Air</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">VAT</label>
                        <select value={filters.vatType || 'all'} onChange={(e) => setFilters({ ...filters, vatType: e.target.value as VatType | 'all' })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="vat_inclusive">VAT</option>
                          <option value="non_vat">Non-VAT</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Inquired</label>
                        <select value={filters.inquired === 'all' ? 'all' : filters.inquired ? 'yes' : 'no'} onChange={(e) => setFilters({ ...filters, inquired: e.target.value === 'all' ? 'all' : e.target.value === 'yes' })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="yes">Inquired</option>
                          <option value="no">Not Inquired</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Min (₱)</label>
                        <input type="number" value={filters.minPrice || ''} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Max (₱)</label>
                        <input type="number" value={filters.maxPrice || ''} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="100000" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                      </div>
                      <div className="flex items-end">
                        <button onClick={() => setFilters({ status: 'all', freightType: 'all', vatType: 'all', inquired: 'all' })} className="w-full px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">Clear</button>
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
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  </div>
                  <p className="text-slate-400">No items found. Add your first item!</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden hover:border-emerald-500/50 transition cursor-pointer group">
                      {item.image_url ? (
                        <div className="aspect-video bg-slate-800 overflow-hidden relative">
                          <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          {item.is_inquired && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-cyan-500 text-white text-xs font-medium rounded">INQUIRED</div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative">
                          <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {item.is_inquired && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-cyan-500 text-white text-xs font-medium rounded">INQUIRED</div>
                          )}
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">{item.product_name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'arrived' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">{item.customer_name}</p>
                        {item.contact && <p className="text-slate-500 text-xs">{item.contact}</p>}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded ${item.vat_type === 'vat_inclusive' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {item.vat_type === 'vat_inclusive' ? 'VAT' : 'Non-VAT'}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-slate-500/20 text-slate-400 flex items-center gap-1">
                            <FreightIcon type={item.freight_type} className="w-3 h-3" />
                            {item.freight_type.charAt(0).toUpperCase() + item.freight_type.slice(1)}
                          </span>
                        </div>
                        <div className="my-4"><StatusProgressBar status={item.status} /></div>
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
                        <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Contact</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Status</th>
                        <th className="text-center p-4 text-slate-400 font-medium hidden md:table-cell">Inquired</th>
                        <th className="text-right p-4 text-slate-400 font-medium">Bought</th>
                        <th className="text-right p-4 text-slate-400 font-medium">Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} onClick={() => setSelectedItem(item)} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {item.image_url ? <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center"><svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                              <span className="text-white font-medium">{item.product_name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-300 hidden md:table-cell">{item.customer_name}</td>
                          <td className="p-4 text-slate-400 hidden lg:table-cell">{item.contact || '-'}</td>
                          <td className="p-4 hidden lg:table-cell">
                            <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'arrived' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4 text-center hidden md:table-cell">
                            {item.is_inquired && <span className="px-2 py-1 text-xs rounded bg-cyan-500/20 text-cyan-400">Yes</span>}
                          </td>
                          <td className="p-4 text-right text-red-400">{formatPeso(item.bought_price)}</td>
                          <td className="p-4 text-right text-emerald-400">{formatPeso(item.sold_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* Secretaries Tab - Admin Only */
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Manage Secretaries</h2>
                <button onClick={() => setShowSecretaryModal(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Secretary
                </button>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-6">
                <p className="text-slate-400 text-sm">Secretaries can view and manage inventory but cannot see profit information.</p>
              </div>
              {secretaries.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10"><p className="text-slate-400">No secretaries added yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {secretaries.map((sec) => (
                    <div key={sec.id} className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{sec.email}</p>
                          <p className="text-slate-500 text-xs mt-1">Added {new Date(sec.created_at).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => handleDeleteSecretary(sec.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {showAddModal && <AddItemModal userId={userId} onClose={() => setShowAddModal(false)} onAdd={(item) => { setItems([item, ...items]); setShowAddModal(false); }} />}
        {showSecretaryModal && <AddSecretaryModal adminId={userId} onClose={() => setShowSecretaryModal(false)} onAdd={(sec) => { setSecretaries([sec, ...secretaries]); setShowSecretaryModal(false); }} />}
        {selectedItem && <ItemDetailModal item={selectedItem} isAdmin={isAdmin} onClose={() => setSelectedItem(null)} onDelete={() => handleDelete(selectedItem.id)} onStatusChange={(status) => handleStatusChange(selectedItem.id, status)} onInquiredChange={(val) => handleInquiredChange(selectedItem.id, val)} />}
      </div>
    </ScreenshotProtection>
  );
}


function ItemDetailModal({ item, isAdmin, onClose, onDelete, onStatusChange, onInquiredChange }: { item: InventoryItem; isAdmin: boolean; onClose: () => void; onDelete: () => void; onStatusChange: (status: ItemStatus) => void; onInquiredChange: (val: boolean) => void }) {
  const statuses: ItemStatus[] = ['bought', 'arrived', 'delivered'];
  const profit = item.sold_price - item.bought_price;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
        {item.image_url ? (
          <div className="aspect-video bg-slate-900 overflow-hidden relative">
            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
            {item.is_inquired && <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-500 text-white text-sm font-medium rounded">INQUIRED</div>}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative">
            <svg className="w-20 h-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {item.is_inquired && <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-500 text-white text-sm font-medium rounded">INQUIRED</div>}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{item.product_name}</h2>
              <p className="text-slate-400">{new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Inquired Toggle */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-cyan-400 font-medium">Mark as Inquired</span>
              <button onClick={() => onInquiredChange(!item.is_inquired)} className={`w-12 h-6 rounded-full transition ${item.is_inquired ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition transform ${item.is_inquired ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            <span className={`px-3 py-1 text-sm rounded-full ${item.vat_type === 'vat_inclusive' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
              {item.vat_type === 'vat_inclusive' ? 'VAT Inclusive' : 'Non-VAT'}
            </span>
            <span className="px-3 py-1 text-sm rounded-full bg-slate-500/20 text-slate-400 flex items-center gap-1">
              <FreightIcon type={item.freight_type} className="w-4 h-4" />
              {item.freight_type.charAt(0).toUpperCase() + item.freight_type.slice(1)} Freight
            </span>
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
              <p className="text-slate-400 text-sm mb-1">Contact</p>
              <p className="text-white font-medium">{item.contact || '-'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Bought From</p>
              <p className="text-white font-medium">{item.bought_from}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Purchaser</p>
              <p className="text-white font-medium">{item.purchaser}</p>
            </div>
          </div>

          <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm mb-1">Bought Price</p>
              <p className="text-xl font-bold text-red-400">{formatPeso(item.bought_price)}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-emerald-400 text-sm mb-1">Sold Price</p>
              <p className="text-xl font-bold text-emerald-400">{formatPeso(item.sold_price)}</p>
            </div>
            {isAdmin && (
              <div className={`${profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-xl p-4 text-center`}>
                <p className={`text-sm mb-1 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Profit</p>
                <p className={`text-xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{profit >= 0 ? '+' : '-'}{formatPeso(Math.abs(profit))}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 px-4 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">Close</button>
            <button onClick={onDelete} className="py-3 px-6 bg-red-500/10 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AddItemModal({ userId, onClose, onAdd }: { userId: string; onClose: () => void; onAdd: (item: InventoryItem) => void }) {
  const [formData, setFormData] = useState({ product_name: '', customer_name: '', contact: '', bought_from: '', purchaser: '', bought_price: '', sold_price: '', freight_type: 'sea' as FreightType, vat_type: 'vat_inclusive' as VatType, is_inquired: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result as string); reader.readAsDataURL(file); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage(imageFile, userId);
      const item = await addItem({
        product_name: formData.product_name, customer_name: formData.customer_name, contact: formData.contact,
        bought_from: formData.bought_from, purchaser: formData.purchaser,
        bought_price: Number(formData.bought_price), sold_price: Number(formData.sold_price),
        image_url: imageUrl, status: 'bought', freight_type: formData.freight_type, vat_type: formData.vat_type,
        is_inquired: formData.is_inquired, user_id: userId,
      });
      onAdd(item);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add item'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add New Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Product Name *</label>
            <input type="text" value={formData.product_name} onChange={(e) => setFormData({ ...formData, product_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Product name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name *</label>
              <input type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Customer" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contact</label>
              <input type="text" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Phone/Email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bought From *</label>
              <input type="text" value={formData.bought_from} onChange={(e) => setFormData({ ...formData, bought_from: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Source" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Purchaser *</label>
              <input type="text" value={formData.purchaser} onChange={(e) => setFormData({ ...formData, purchaser: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Purchaser" required />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Freight Type</label>
              <select value={formData.freight_type} onChange={(e) => setFormData({ ...formData, freight_type: e.target.value as FreightType })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                <option value="sea">Sea Freight</option>
                <option value="land">Land Freight</option>
                <option value="air">Air Freight</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">VAT</label>
              <select value={formData.vat_type} onChange={(e) => setFormData({ ...formData, vat_type: e.target.value as VatType })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                <option value="vat_inclusive">VAT Inclusive</option>
                <option value="non_vat">Non-VAT</option>
              </select>
            </div>
          </div>

          {/* Inquired Checkbox */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.is_inquired} onChange={(e) => setFormData({ ...formData, is_inquired: e.target.checked })} className="w-5 h-5 rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 bg-transparent" />
              <span className="text-cyan-400 font-medium">Mark as Inquired</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Image</label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
            <label htmlFor="image-upload" className="flex items-center justify-center w-full px-4 py-8 bg-white/5 border-2 border-dashed border-white/20 rounded-xl text-slate-400 hover:border-emerald-500 hover:text-emerald-400 cursor-pointer transition">
              {imagePreview ? <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" /> : (
                <div className="text-center">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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

function AddSecretaryModal({ adminId, onClose, onAdd }: { adminId: string; onClose: () => void; onAdd: (profile: UserProfile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await inviteSecretary(email, password, adminId);
      if (!result.success) throw new Error(result.error);
      setSuccess(true);
      setTimeout(() => { 
        if (result.profile) {
          onAdd(result.profile);
        }
      }, 1500);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create secretary'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Secretary</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-white font-medium">Secretary account created!</p>
            <p className="text-slate-400 text-sm mt-2">They can now log in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
              <p className="text-amber-400 text-sm">Secretaries cannot view profit information.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="secretary@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Min 6 characters" minLength={6} required />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm text-center">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50">{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

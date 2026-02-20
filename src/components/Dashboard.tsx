'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signOut, getUser, getUserRole } from '@/lib/auth';
import {
  supabase, getFilteredItems, addItem, deleteItem, uploadImage, updateItemStatus, collectPayment, updateItem,
  getSecretaries, inviteSecretary, deleteSecretary,
  InventoryItem, ItemStatus, FreightType, VatType, FilterOptions, UserRole, UserProfile, InquiredSupplier,
} from '@/lib/supabase';

interface DashboardProps {
  onLogout: () => void;
}

const formatPeso = (amount: number | null | undefined) => `₱${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

// Status colors: inquired=blue, bought=red, arrived=yellow, delivered=green
const getStatusBadgeClass = (status: ItemStatus) => {
  switch (status) {
    case 'inquired': return 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'bought': return 'bg-red-100 text-red-700 border border-red-300';
    case 'arrived': return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
    case 'delivered': return 'bg-green-100 text-green-700 border border-green-300';
  }
};

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
      <div id="screenshot-overlay" className="fixed inset-0 bg-white z-[9999] items-center justify-center hidden">
        <p className="text-gray-900 text-xl">Content hidden for security</p>
      </div>
    </div>
  );
};

const getDaysRemaining = (deliveredAt: string | null): number | null => {
  if (!deliveredAt) return null;
  const delivered = new Date(deliveredAt);
  const deadline = new Date(delivered.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};


const NotificationBell = ({ items, onSelectItem }: { items: InventoryItem[]; onSelectItem: (item: InventoryItem) => void }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const overdueItems = items.filter(item => {
    if (item.status !== 'delivered' || item.payment_collected) return false;
    const days = getDaysRemaining(item.delivered_at);
    return days !== null && days <= 0;
  });

  const urgentItems = items.filter(item => {
    if (item.status !== 'delivered' || item.payment_collected) return false;
    const days = getDaysRemaining(item.delivered_at);
    return days !== null && days > 0 && days <= 7;
  });

  const notifications = [...overdueItems, ...urgentItems];
  const hasNotifications = notifications.length > 0;

  return (
    <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)} className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {hasNotifications && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-gray-900 text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-gray-900 font-medium">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map(item => {
                const days = getDaysRemaining(item.delivered_at);
                const isOverdue = days !== null && days <= 0;
                return (
                  <button key={item.id} onClick={() => { onSelectItem(item); setShowDropdown(false); }} className="w-full p-3 hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium truncate">{item.brand} - {item.particular}</p>
                        <p className="text-gray-600 text-sm">{item.customer_name}</p>
                        <p className={`text-sm mt-1 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                          {isOverdue ? `Payment overdue by ${Math.abs(days!)} days` : `${days} days left to collect`}
                        </p>
                      </div>
                      <span className="text-emerald-400 font-medium text-sm">{formatPeso(item.sale)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all', freightType: 'all', inquired: 'all' });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('secretary');
  const [zoomLevel, setZoomLevel] = useState(100); // 100 = normal, 80 = smaller, 120 = larger

  // Find feature states
  const [showFindDialog, setShowFindDialog] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatches, setFindMatches] = useState<Array<{ itemId: string; field: string; index: number }>>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [highlightedMatch, setHighlightedMatch] = useState<{ itemId: string; field: string } | null>(null);

  const isAdmin = userRole === 'admin';

  // Zoom controls
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 150));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 60));
  const resetZoom = () => setZoomLevel(100);

  // Find feature handlers
  const performFind = useCallback((query: string) => {
    if (!query.trim()) {
      setFindMatches([]);
      setHighlightedMatch(null);
      return;
    }

    const matches: Array<{ itemId: string; field: string; index: number }> = [];
    const searchFields = ['brand', 'part_number', 'particular', 'supplier_name', 'customer_name', 'unit', 'remark'];
    
    items.forEach((item) => {
      searchFields.forEach((field) => {
        const value = String((item as any)[field] || '').toLowerCase();
        const searchQuery = query.toLowerCase();
        if (value.includes(searchQuery)) {
          matches.push({ itemId: item.id, field, index: matches.length });
        }
      });
    });

    setFindMatches(matches);
    setCurrentMatchIndex(0);
    if (matches.length > 0) {
      setHighlightedMatch({ itemId: matches[0].itemId, field: matches[0].field });
      // Scroll to first match
      setTimeout(() => {
        const element = document.getElementById(`cell-${matches[0].itemId}-${matches[0].field}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      setHighlightedMatch(null);
    }
  }, [items]);

  const goToNextMatch = () => {
    if (findMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIndex);
    const match = findMatches[nextIndex];
    setHighlightedMatch({ itemId: match.itemId, field: match.field });
    setTimeout(() => {
      const element = document.getElementById(`cell-${match.itemId}-${match.field}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const goToPrevMatch = () => {
    if (findMatches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? findMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    const match = findMatches[prevIndex];
    setHighlightedMatch({ itemId: match.itemId, field: match.field });
    setTimeout(() => {
      const element = document.getElementById(`cell-${match.itemId}-${match.field}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const closeFindDialog = () => {
    setShowFindDialog(false);
    setFindQuery('');
    setFindMatches([]);
    setHighlightedMatch(null);
    setCurrentMatchIndex(0);
  };

  // Keyboard shortcut for Cmd+F / Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindDialog(true);
      }
      if (e.key === 'Escape' && showFindDialog) {
        closeFindDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindDialog]);

  // Toggle all rows expanded/collapsed
  const [allExpanded, setAllExpanded] = useState(true);

  const toggleAllRows = () => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(items.filter(i => i.is_inquired && i.inquired_list?.length).map(i => i.id)));
    }
    setAllExpanded(!allExpanded);
  };

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  // Initialize expanded rows when items load
  useEffect(() => {
    if (items.length > 0 && allExpanded) {
      setExpandedRows(new Set(items.filter(i => i.is_inquired && i.inquired_list?.length).map(i => i.id)));
    }
  }, [items, allExpanded]);

  const fetchItems = useCallback(async () => {
    try { 
      const data = await getFilteredItems({ ...filters, searchQuery }); 
      setItems(data); 
    }
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
    setSearching(true);
    const debounce = setTimeout(() => {
      fetchItems();
      setSearching(false);
    }, 500);
    return () => {
      clearTimeout(debounce);
      setSearching(false);
    };
  }, [searchQuery, filters, fetchItems]);

  const handleLogout = async () => { await signOut(); onLogout(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try { await deleteItem(id); setItems(items.filter(item => item.id !== id)); }
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
    } catch (error) { 
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update status:', msg, error); 
      alert('Failed to update status: ' + msg);
    }
  };

  const handleCollectPayment = async (id: string) => {
    if (!confirm('Mark payment as collected?')) return;
    try {
      const updated = await collectPayment(id);
      setItems(items.map(item => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) setSelectedItem(updated);
    } catch (error) { 
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to collect payment:', msg, error); 
      alert('Failed to collect payment: ' + msg);
    }
  };

  // Inline editing handlers
  const startEdit = (itemId: string, field: string, currentValue: any) => {
    setEditingItemId(itemId);
    setEditingField(field);
    setEditValue(String(currentValue || ''));
  };

  const saveEdit = async () => {
    if (!editingItemId || !editingField) return;
    
    try {
      let updateData: any = {};
      
      // Parse value based on field type
      if (['qty', 'cost', 'freight_cost', 'sale'].includes(editingField)) {
        const numValue = parseFloat(editValue.replace(/,/g, ''));
        if (isNaN(numValue)) {
          alert('Please enter a valid number');
          return;
        }
        updateData[editingField] = numValue;
      } else if (editingField === 'status') {
        updateData[editingField] = editValue as ItemStatus;
      } else if (editingField === 'description') {
        // Map 'description' UI field to 'particular' database field
        updateData['particular'] = editValue;
      } else {
        updateData[editingField] = editValue;
      }
      
      const updated = await updateItem(editingItemId, updateData);
      setItems(items.map(item => (item.id === editingItemId ? updated : item)));
      
      setEditingItemId(null);
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update:', msg, error);
      alert('Failed to update: ' + msg);
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Time-based filtering helpers - simplified for dashboard
  const deliveredNotPaidItems = items.filter(item => item.status === 'delivered' && !item.payment_collected);
  const totalCost = deliveredNotPaidItems.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const totalFreight = deliveredNotPaidItems.reduce((sum, item) => sum + item.freight_cost, 0);
  const paidItems = items.filter(item => item.status === 'delivered' && item.payment_collected);
  const profit = paidItems.reduce((sum, item) => {
    const discountVal = item.discount ? parseFloat(String(item.discount).split('/')[0]) || 0 : 0;
    return sum + ((item.sale - item.cost) * item.qty - (item.sale * item.qty * discountVal / 100));
  }, 0);
  const inquiredCount = items.filter(item => item.is_inquired).length;


  return (
    <ScreenshotProtection enabled={!isAdmin}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <TruckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">UTS 1.0</h1>
                  <span className={`text-xs px-2 py-0.5 rounded ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-300/20 text-gray-600'}`}>
                    {isAdmin ? 'Admin' : 'Secretary'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 hidden sm:block"><span className="text-gray-900 font-medium">{userEmail}</span></span>
                <button onClick={handleLogout} className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">Logout</button>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'inventory' ? 'bg-emerald-500 text-gray-900' : 'bg-gray-50 text-gray-600 hover:text-gray-900'}`}>
              Inventory
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('secretaries')} className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'secretaries' ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-600 hover:text-gray-900'}`}>
                Secretaries ({secretaries.length})
              </button>
            )}
          </div>

          {activeTab === 'inventory' ? (
            <>
              {/* Search, Filters, and Add */}
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search brand, part number, description, supplier, customer..." className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                    {searching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-3 rounded-xl border transition flex items-center gap-2 ${showFilters || filters.status !== 'all' || filters.freightType !== 'all' || filters.inquired !== 'all' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      <span className="hidden sm:inline">Filters</span>
                    </button>
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2">
                      <button onClick={zoomOut} disabled={zoomLevel <= 60} className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition" title="Zoom Out">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                      </button>
                      <button onClick={resetZoom} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 font-medium min-w-[45px]" title="Reset Zoom">
                        {zoomLevel}%
                      </button>
                      <button onClick={zoomIn} disabled={zoomLevel >= 150} className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition" title="Zoom In">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="hidden sm:inline">Add Item</span>
                    </button>
                  </div>
                </div>

                {showFilters && (
                  <div className="bg-gray-50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select value={filters.status || 'all'} onChange={(e) => setFilters({ ...filters, status: e.target.value as ItemStatus | 'all' })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="inquired">Inquired</option>
                          <option value="bought">Bought</option>
                          <option value="arrived">Arrived</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Freight</label>
                        <select value={filters.freightType || 'all'} onChange={(e) => setFilters({ ...filters, freightType: e.target.value as FreightType | 'all' })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="sea">Sea</option>
                          <option value="land">Land</option>
                          <option value="air">Air</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Inquired</label>
                        <select value={filters.inquired === 'all' ? 'all' : filters.inquired ? 'yes' : 'no'} onChange={(e) => setFilters({ ...filters, inquired: e.target.value === 'all' ? 'all' : e.target.value === 'yes' })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="all">All</option>
                          <option value="yes">Inquired</option>
                          <option value="no">Not Inquired</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min Cost (₱)</label>
                        <input type="number" value={filters.minCost || ''} onChange={(e) => setFilters({ ...filters, minCost: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Cost (₱)</label>
                        <input type="number" value={filters.maxCost || ''} onChange={(e) => setFilters({ ...filters, maxCost: e.target.value ? Number(e.target.value) : undefined })} placeholder="100000" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                      </div>
                      <div className="flex items-end">
                        <button onClick={() => setFilters({ status: 'all', freightType: 'all', inquired: 'all' })} className="w-full px-4 py-3 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition">Clear</button>
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
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  </div>
                  <p className="text-gray-600">No items found. Add your first item!</p>
                </div>
              ) : (
                /* List View - Excel Style */
                <div className="bg-white border border-gray-300 shadow-sm overflow-hidden relative">
                  <div className="overflow-x-auto overflow-y-visible" style={{maxHeight: 'calc(100vh - 300px)'}}>
                    <div style={{transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', width: `${10000 / zoomLevel}%`}}>
                      <table className="w-full text-sm" style={{borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '1600px'}}>
                      <thead>
                        <tr className="border-b-2 border-gray-400 bg-gray-100">
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300 w-12">#</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300 w-10">
                            <button onClick={toggleAllRows} className="flex items-center justify-center gap-1 hover:text-gray-900 transition mx-auto">
                              <svg className={`w-4 h-4 transition-transform ${allExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          </th>
                          <th className="text-center p-2 text-gray-700 font-semibold whitespace-nowrap border-r border-gray-300" style={{width: '100px'}}>Date</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '130px'}}>Brand</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '130px'}}>Part Number</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '400px'}}>Description</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '120px'}}>Cost</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '80px'}}>Unit</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '90px'}}>Discount</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '150px'}}>Supplier</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '120px'}}>Sale</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '150px'}}>Customer</th>
                          <th className="text-center p-2 text-gray-700 font-semibold border-r border-gray-300" style={{width: '70px'}}>Qty</th>
                          <th className="text-center p-2 text-gray-700 font-semibold" style={{width: '150px'}}>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const hasInquired = item.is_inquired && item.inquired_list && item.inquired_list.length > 0;
                          const isExpanded = expandedRows.has(item.id);
                          return (
                            <React.Fragment key={item.id}>
                              <tr className="border-b border-gray-200 hover:bg-blue-50 transition even:bg-gray-50">
                                <td className="p-2 text-center text-gray-600 font-medium border-r border-gray-200 w-12">{index + 1}</td>
                                <td className="p-2 border-r border-gray-200 w-10">
                                  {hasInquired && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }} className="text-gray-600 hover:text-gray-900 transition">
                                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                  )}
                                </td>
                                <td className="p-2 text-center text-gray-600 text-xs whitespace-nowrap border-r border-gray-200" style={{width: '100px'}}>
                                  {formatDate(item.created_at)}
                                </td>
                                <td className="p-2 text-gray-900 border-r border-gray-200" style={{width: '130px'}} id={`cell-${item.id}-brand`}>
                                  {editingItemId === item.id && editingField === 'brand' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'brand', item.brand)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'brand' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.brand || '-'}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-900 border-r border-gray-200" style={{width: '130px'}} id={`cell-${item.id}-part_number`}>
                                  {editingItemId === item.id && editingField === 'part_number' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'part_number', item.part_number)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'part_number' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.part_number || '-'}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-900 border-r border-gray-200" style={{width: '400px'}} id={`cell-${item.id}-particular`}>
                                  {editingItemId === item.id && editingField === 'description' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'description', item.particular)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'particular' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.particular || '-'}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-right border-r border-gray-200" style={{width: '120px'}}>
                                  {editingItemId === item.id && editingField === 'cost' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded text-right focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'cost', item.cost)} className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded">
                                      <span className="text-red-600 font-medium">{formatPeso(item.cost)}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-900 font-medium border-r border-gray-200" style={{width: '80px'}} id={`cell-${item.id}-unit`}>
                                  {editingItemId === item.id && editingField === 'unit' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'unit', item.unit)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'unit' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.unit}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-right text-orange-600 border-r border-gray-200" style={{width: '90px'}}>
                                  {editingItemId === item.id && editingField === 'discount' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded text-right focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'discount', item.discount)} className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded">
                                      {item.discount ? String(item.discount).split('/').map(d => `${d.trim()}%`).join('/') : '-'}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-900 border-r border-gray-200" style={{width: '150px'}} id={`cell-${item.id}-supplier_name`}>
                                  {editingItemId === item.id && editingField === 'supplier_name' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'supplier_name', item.supplier_name)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'supplier_name' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.supplier_name}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-right border-r border-gray-200" style={{width: '120px'}}>
                                  {editingItemId === item.id && editingField === 'sale' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded text-right focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'sale', item.sale)} className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded">
                                      <span className="text-green-600 font-medium">{formatPeso(item.sale)}</span>
                                      {item.vat_type === 'vat_inclusive' && <span className="ml-1 px-1 py-0.5 text-xs rounded bg-purple-100 text-purple-700 border border-purple-300">VAT</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-900 border-r border-gray-200" style={{width: '150px'}} id={`cell-${item.id}-customer_name`}>
                                  {editingItemId === item.id && editingField === 'customer_name' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'customer_name', item.customer_name)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'customer_name' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.customer_name}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-center text-gray-900 border-r border-gray-200" style={{width: '70px'}}>
                                  {editingItemId === item.id && editingField === 'qty' ? (
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded text-center focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'qty', item.qty)} className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded">
                                      {item.qty}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-900" style={{width: '150px'}} id={`cell-${item.id}-remark`}>
                                  {editingItemId === item.id && editingField === 'remark' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                      autoFocus
                                      className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
                                    />
                                  ) : (
                                    <div onClick={() => startEdit(item.id, 'remark', item.remark)} className={`cursor-pointer px-2 py-1 rounded ${highlightedMatch?.itemId === item.id && highlightedMatch?.field === 'remark' ? 'bg-yellow-200' : 'hover:bg-blue-100'}`}>
                                      {item.remark || '-'}
                                    </div>
                                  )}
                                </td>
                              </tr>
                              {/* Inquired rows */}
                              {hasInquired && isExpanded && item.inquired_list!.map((inq, idx) => (
                                <tr key={`${item.id}-inq-${idx}`} className="bg-cyan-500/5 border-b border-gray-100">
                                  <td></td>
                                  <td className="p-2 pl-6 text-gray-500">
                                    {idx === item.inquired_list!.length - 1 ? '└' : '├'}
                                  </td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td className="p-2 text-gray-500 text-xs"><span className="text-cyan-400">Inquired #{idx + 1}</span></td>
                                  <td className="p-2 text-right text-cyan-400/70 text-xs">{formatPeso(inq.cost)}</td>
                                  <td className="p-2 text-right text-orange-400/70 text-xs">{inq.discount ? String(inq.discount).split('/').map(d => `${d.trim()}%`).join('/') : '-'}</td>
                                  <td></td>
                                  <td className="p-2 text-cyan-400 text-xs">{inq.supplier_name}</td>
                                  <td colSpan={4}></td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Secretaries Tab - Admin Only */
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Manage Secretaries</h2>
                <button onClick={() => setShowSecretaryModal(true)} className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Secretary
                </button>
              </div>
              <div className="bg-gray-50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 mb-6">
                <p className="text-gray-600 text-sm">Secretaries can view and manage inventory but cannot see profit information.</p>
              </div>
              {secretaries.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200"><p className="text-gray-600">No secretaries added yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {secretaries.map((sec) => (
                    <div key={sec.id} className="bg-gray-50 backdrop-blur-lg rounded-2xl p-5 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-900 font-medium">{sec.email}</p>
                          <p className="text-gray-500 text-xs mt-1">Added {formatDate(sec.created_at)}</p>
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

        {showAddModal && <AddItemModal userId={userId} items={items} onClose={() => setShowAddModal(false)} onAdd={(item) => { setItems([item, ...items]); setShowAddModal(false); }} />}
        {showSecretaryModal && <AddSecretaryModal adminId={userId} onClose={() => setShowSecretaryModal(false)} onAdd={(sec) => { setSecretaries([sec, ...secretaries]); setShowSecretaryModal(false); }} />}
        
        {/* Find Dialog */}
        {showFindDialog && (
          <div className="fixed top-20 right-8 bg-white rounded-xl shadow-2xl border border-gray-300 p-4 z-50 w-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-semibold">Find</h3>
              <button onClick={closeFindDialog} className="text-gray-600 hover:text-gray-900 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={findQuery}
                onChange={(e) => {
                  setFindQuery(e.target.value);
                  performFind(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      goToPrevMatch();
                    } else {
                      goToNextMatch();
                    }
                  }
                }}
                placeholder="Search in table..."
                autoFocus
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              {findMatches.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {currentMatchIndex + 1} of {findMatches.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={goToPrevMatch}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
                      title="Previous (Shift+Enter)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      onClick={goToNextMatch}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
                      title="Next (Enter)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </div>
              )}
              {findQuery && findMatches.length === 0 && (
                <p className="text-sm text-gray-500">No matches found</p>
              )}
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Esc</kbd> to close
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenshotProtection>
  );
}


function AddItemModal({ userId, items, onClose, onAdd }: { userId: string; items: InventoryItem[]; onClose: () => void; onAdd: (item: InventoryItem) => void }) {
  const [formData, setFormData] = useState({
    brand: '', part_number: '', particular: '', cost: '', unit: '', discount: '', 
    supplier_name: '', supplier_contact: '', sale: '', customer_name: '', customer_contact: '', 
    qty: '1', remark: '', vat_type: 'non_vat' as VatType, freight_cost: '', freight_type: 'sea' as FreightType,
  });
  const [inquiredList, setInquiredList] = useState<{ supplier_name: string; supplier_contact: string; cost: string; discount: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState<'particular' | 'supplier' | 'customer_name' | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Get unique values from existing items
  const allParticulars = [...new Set(items.map(item => item.particular).filter(Boolean))];
  const allSuppliers = [...new Set(items.map(item => item.supplier_name).filter(Boolean))];
  const allCustomerNames = [...new Set(items.map(item => item.customer_name).filter(Boolean))];

  const handleFieldChange = (field: 'particular' | 'supplier_name' | 'customer_name', value: string) => {
    setFormData({ ...formData, [field]: value });
    if (value.length >= 2) {
      const source = field === 'particular' ? allParticulars : field === 'supplier_name' ? allSuppliers : allCustomerNames;
      const filtered = source.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setActiveField(field === 'supplier_name' ? 'supplier' : field === 'particular' ? 'particular' : 'customer_name');
    } else {
      setActiveField(null);
    }
  };

  const selectSuggestion = (value: string, field: 'particular' | 'supplier_name' | 'customer_name') => {
    setFormData({ ...formData, [field]: value });
    setActiveField(null);
  };

  const formatNumberInput = (value: string) => {
    const num = value.replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseNumber = (value: string) => parseFloat(value.replace(/,/g, '')) || 0;

  const addInquiry = () => {
    if (inquiredList.length < 3) setInquiredList([...inquiredList, { supplier_name: '', supplier_contact: '', cost: '', discount: '' }]);
  };

  const removeInquiry = (index: number) => setInquiredList(inquiredList.filter((_, i) => i !== index));

  const updateInquiry = (index: number, field: string, value: string) => {
    const updated = [...inquiredList];
    if (field === 'cost') {
      updated[index] = { ...updated[index], [field]: formatNumberInput(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setInquiredList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const finalInquiredList: InquiredSupplier[] = inquiredList.map(inq => ({
        supplier_name: inq.supplier_name,
        supplier_contact: inq.supplier_contact,
        cost: parseNumber(inq.cost),
        discount: inq.discount || null,
      }));

      const item = await addItem({
        image_url: null,
        brand: formData.brand || '',
        part_number: formData.part_number || null,
        qty: parseInt(formData.qty) || 1,
        unit: formData.unit,
        particular: formData.particular,
        cost: parseNumber(formData.cost),
        discount: formData.discount || null,
        vat_type: formData.vat_type,
        supplier_name: formData.supplier_name,
        supplier_contact: formData.supplier_contact || '',
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact || null,
        sale: parseNumber(formData.sale),
        freight_cost: parseNumber(formData.freight_cost) || 0,
        freight_type: formData.freight_type,
        status: 'inquired',
        is_inquired: inquiredList.length > 0,
        inquired_list: inquiredList.length > 0 ? finalInquiredList : null,
        delivered_at: null,
        payment_collected: false,
        remark: formData.remark || null,
        user_id: userId,
      });
      onAdd(item);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add item'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New Item</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Brand, Part Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Brand name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Part Number</label>
              <input type="text" value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Part #" />
            </div>
          </div>

          {/* Description (Particular) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Particular *</label>
            <input 
              type="text" 
              value={formData.particular} 
              onChange={(e) => handleFieldChange('particular', e.target.value)} 
              onFocus={() => formData.particular.length >= 2 && suggestions.length > 0 && setActiveField('particular')}
              onBlur={() => setTimeout(() => setActiveField(null), 200)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" 
              placeholder="Item description" 
              required 
            />
            {activeField === 'particular' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSuggestion(item, 'particular')}
                    className="w-full px-4 py-3 text-left text-gray-900 hover:bg-emerald-100 transition border-b border-gray-100 last:border-0"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cost, Discount, VAT */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cost (₱) *</label>
              <input type="text" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: formatNumberInput(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
              <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="pcs/box" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input type="text" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="e.g. 10 or 40/50" />
            </div>
          </div>

          {/* Supplier Name, Sale, Customer Name */}
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
              <input 
                type="text" 
                value={formData.supplier_name} 
                onChange={(e) => handleFieldChange('supplier_name', e.target.value)} 
                onFocus={() => formData.supplier_name.length >= 2 && setActiveField('supplier')}
                onBlur={() => setTimeout(() => setActiveField(null), 200)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" 
                placeholder="Supplier" 
                required 
              />
              {activeField === 'supplier' && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestion(item, 'supplier_name')}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-emerald-100 transition border-b border-gray-100 last:border-0"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale (₱) *</label>
              <input type="text" value={formData.sale} onChange={(e) => setFormData({ ...formData, sale: formatNumberInput(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="0.00" required />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <input 
                type="text" 
                value={formData.customer_name} 
                onChange={(e) => handleFieldChange('customer_name', e.target.value)} 
                onFocus={() => formData.customer_name.length >= 2 && setActiveField('customer_name')}
                onBlur={() => setTimeout(() => setActiveField(null), 200)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" 
                placeholder="Customer name" 
                required 
              />
              {activeField === 'customer_name' && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestion(item, 'customer_name')}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-emerald-100 transition border-b border-gray-100 last:border-0"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Qty, Remark */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qty *</label>
              <input type="number" value={formData.qty} onChange={(e) => setFormData({ ...formData, qty: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="1" min="1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
              <input type="text" value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Optional note" />
            </div>
          </div>

          {/* Hidden fields for compatibility */}
          <div className="hidden">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VAT</label>
                <button type="button" onClick={() => setFormData({ ...formData, vat_type: formData.vat_type === 'vat_inclusive' ? 'non_vat' : 'vat_inclusive' })} className={`w-full px-4 py-3 rounded-xl font-medium transition ${formData.vat_type === 'vat_inclusive' ? 'bg-purple-500 text-gray-900' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}>
                  {formData.vat_type === 'vat_inclusive' ? 'VAT Inclusive' : 'Non-VAT'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Contact</label>
                <input type="text" value={formData.supplier_contact} onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Phone/Email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Contact</label>
                <input type="text" value={formData.customer_contact} onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Phone/Email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Freight (₱)</label>
                <input type="text" value={formData.freight_cost} onChange={(e) => setFormData({ ...formData, freight_cost: formatNumberInput(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Freight Type</label>
                <select value={formData.freight_type} onChange={(e) => setFormData({ ...formData, freight_type: e.target.value as FreightType })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                  <option value="sea">Sea Freight</option>
                  <option value="land">Land Freight</option>
                  <option value="air">Air Freight</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inquired Section - Keep but hide for now */}
          <div className="hidden bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-cyan-400 font-medium">Inquired Suppliers ({inquiredList.length}/3)</span>
              {inquiredList.length < 3 && (
                <button type="button" onClick={addInquiry} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add
                </button>
              )}
            </div>
            {inquiredList.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No inquired suppliers. Click &quot;Add&quot; to add up to 3.</p>}
            <div className="space-y-3">
              {inquiredList.map((inq, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-cyan-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-cyan-300 text-sm font-medium">#{index + 1}</span>
                    <button type="button" onClick={() => removeInquiry(index)} className="text-red-400 hover:text-red-300 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={inq.supplier_name} onChange={(e) => updateInquiry(index, 'supplier_name', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition text-sm" placeholder="Supplier Name *" />
                      <input type="text" value={inq.supplier_contact} onChange={(e) => updateInquiry(index, 'supplier_contact', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition text-sm" placeholder="Contact" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={inq.cost} onChange={(e) => updateInquiry(index, 'cost', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition text-sm" placeholder="Cost *" />
                      <input type="text" value={inq.discount} onChange={(e) => updateInquiry(index, 'discount', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition text-sm" placeholder="Discount %" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm text-center">{error}</div>}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50">{loading ? 'Adding...' : 'Add Item'}</button>
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
      setTimeout(() => { if (result.profile) onAdd(result.profile); }, 1500);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create secretary'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add Secretary</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-300">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-gray-900 font-medium">Secretary account created!</p>
            <p className="text-gray-600 text-sm mt-2">They can now log in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
              <p className="text-amber-400 text-sm">Secretaries cannot view profit information.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="secretary@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="Min 6 characters" minLength={6} required />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm text-center">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50">{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

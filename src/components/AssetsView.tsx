import { useState, useMemo, useEffect, FormEvent } from 'react';
import { Plus, Search, Filter, Trash2, Edit3, Wrench, CheckCircle2, AlertTriangle, ShieldAlert, X, Calendar, DollarSign } from 'lucide-react';
import { HomeAsset, AssetCategory, AssetStatus } from '../types';
import { formatCurrency, getCurrencySymbol } from '../config/locationCurrencyConfig';
import { ContextualHelp } from './help/ContextualHelp';

interface AssetsViewProps {
  assets: HomeAsset[];
  currency: string;
  isLoading: boolean;
  onAddAsset: (asset: Omit<HomeAsset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateAsset: (id: string, updated: Partial<HomeAsset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
  onAddModalOpened?: () => void;
}

export function AssetsView({
  assets,
  currency,
  isLoading,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  autoOpenAdd,
  onAddModalOpened,
}: AssetsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<HomeAsset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('hvac');
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [expectedLifespanYears, setExpectedLifespanYears] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [currentStatus, setCurrentStatus] = useState<AssetStatus>('operational');
  const [roomLocation, setRoomLocation] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        a.name.toLowerCase().includes(searchLower) ||
        (a.brand || '').toLowerCase().includes(searchLower) ||
        (a.modelNumber || '').toLowerCase().includes(searchLower) ||
        (a.roomLocation || '').toLowerCase().includes(searchLower);

      const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || a.currentStatus === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, searchTerm, selectedCategory, selectedStatus]);

  const openAddModal = () => {
    setEditingAsset(null);
    setName('');
    setCategory('hvac');
    setBrand('');
    setModelNumber('');
    setSerialNumber('');
    setInstallDate('');
    setWarrantyExpiryDate('');
    setExpectedLifespanYears('10');
    setPurchaseCost('');
    setCurrentStatus('operational');
    setRoomLocation('');
    setMaintenanceNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenAdd) {
      openAddModal();
      onAddModalOpened?.();
    }
  }, [autoOpenAdd]);

  const openEditModal = (asset: HomeAsset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setCategory(asset.category);
    setBrand(asset.brand || '');
    setModelNumber(asset.modelNumber || '');
    setSerialNumber(asset.serialNumber || '');
    setInstallDate(asset.installDate || '');
    setWarrantyExpiryDate(asset.warrantyExpiryDate || '');
    setExpectedLifespanYears(asset.expectedLifespanYears ? asset.expectedLifespanYears.toString() : '');
    setPurchaseCost(asset.purchaseCost ? asset.purchaseCost.toString() : '');
    setCurrentStatus(asset.currentStatus);
    setRoomLocation(asset.roomLocation || '');
    setMaintenanceNotes(asset.maintenanceNotes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Asset name is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      brand: brand.trim() || undefined,
      modelNumber: modelNumber.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      installDate: installDate.trim() || undefined,
      warrantyExpiryDate: warrantyExpiryDate.trim() || undefined,
      expectedLifespanYears: expectedLifespanYears ? parseInt(expectedLifespanYears, 10) : undefined,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost) : undefined,
      currentStatus,
      roomLocation: roomLocation.trim() || undefined,
      maintenanceNotes: maintenanceNotes.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      if (editingAsset) {
        await onUpdateAsset(editingAsset.id, payload);
      } else {
        await onAddAsset(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save home asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await onDeleteAsset(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Home Assets & Appliances</h1>
            <ContextualHelp
              id="help-assets"
              title="Home Assets & Equipment"
              summary="Register mechanical equipment, appliances, electronics, and structural assets."
              bullets={[
                'Track installation age and calculated replacement lifespan years.',
                'Record serial numbers, user manuals, and purchase receipts.',
                'Asset health status directly impacts your overall Household Health score.',
              ]}
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Track warranties, operational health, and maintenance lifespans.</p>
        </div>

        <button
          id="add-asset-btn"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by asset name, brand, model, or room location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="hvac">HVAC</option>
            <option value="plumbing">Plumbing</option>
            <option value="kitchen">Kitchen</option>
            <option value="laundry">Laundry</option>
            <option value="roofing_exterior">Roofing & Exterior</option>
            <option value="electrical">Electrical</option>
            <option value="other">Other</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="operational">Operational</option>
            <option value="needs_maintenance">Needs Service</option>
            <option value="critical">Critical</option>
            <option value="replaced">Replaced</option>
          </select>
        </div>
      </div>

      {/* Asset Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Loading home assets...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-slate-800">No home assets found</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'No records match your active search filter.'
              : 'Register your HVAC system, water heater, roof, and appliances to track warranties and upkeep.'}
          </p>
          {assets.length === 0 && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register First Asset</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              id={`asset-card-${asset.id}`}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
            >
              <div className="space-y-3">
                {/* Status & Category Strip */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    {asset.category.replace('_', ' ')}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${
                      asset.currentStatus === 'operational'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : asset.currentStatus === 'needs_maintenance'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {asset.currentStatus === 'operational' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {asset.currentStatus === 'needs_maintenance' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {asset.currentStatus === 'critical' && <ShieldAlert className="w-3.5 h-3.5" />}
                    {asset.currentStatus.replace('_', ' ')}
                  </span>
                </div>

                {/* Title & Brand */}
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{asset.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {asset.brand && <span className="font-medium text-slate-700">{asset.brand} </span>}
                    {asset.modelNumber && <span>({asset.modelNumber})</span>}
                    {asset.roomLocation && <span> • {asset.roomLocation}</span>}
                  </div>
                </div>

                {/* Details Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Installed</span>
                    <span className="font-medium text-slate-700">{asset.installDate || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Warranty Expiry</span>
                    <span className="font-medium text-slate-700">{asset.warrantyExpiryDate || 'None / Expired'}</span>
                  </div>
                  {asset.purchaseCost !== undefined && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Purchase Cost</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(asset.purchaseCost, currency)}
                      </span>
                    </div>
                  )}
                  {asset.expectedLifespanYears !== undefined && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Est. Lifespan</span>
                      <span className="font-medium text-slate-700">{asset.expectedLifespanYears} years</span>
                    </div>
                  )}
                </div>

                {/* Maintenance Notes */}
                {asset.maintenanceNotes && (
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 block mb-0.5">Upkeep Log:</span>
                    <p className="line-clamp-2">{asset.maintenanceNotes}</p>
                  </div>
                )}
              </div>

              {/* Bottom Card Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono">
                  {asset.serialNumber ? `S/N: ${asset.serialNumber}` : 'ID: ' + asset.id.slice(0, 8)}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(asset)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="Edit Asset"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(asset.id);
                      setDeletingName(asset.name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-base">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <span>{editingAsset ? 'Edit Home Asset' : 'Register Home Asset'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Asset / Equipment Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Trane Heat Pump, Rheem Water Heater, Bosch Dishwasher"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as AssetCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
                    >
                      <option value="hvac">HVAC & Climate</option>
                      <option value="plumbing">Plumbing & Water</option>
                      <option value="kitchen">Kitchen Appliances</option>
                      <option value="laundry">Laundry</option>
                      <option value="roofing_exterior">Roofing & Exterior</option>
                      <option value="electrical">Electrical & Solar</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Current Operational Status
                    </label>
                    <select
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value as AssetStatus)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
                    >
                      <option value="operational">Operational</option>
                      <option value="needs_maintenance">Needs Maintenance</option>
                      <option value="critical">Critical / Failing</option>
                      <option value="replaced">Replaced / Retired</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Brand / Maker
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Bosch"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Model Number
                    </label>
                    <input
                      type="text"
                      value={modelNumber}
                      onChange={(e) => setModelNumber(e.target.value)}
                      placeholder="e.g. SHP878ZD5N"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Room Location
                    </label>
                    <input
                      type="text"
                      value={roomLocation}
                      onChange={(e) => setRoomLocation(e.target.value)}
                      placeholder="e.g. Kitchen, Basement"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Install / Purchase Date
                    </label>
                    <input
                      type="date"
                      value={installDate}
                      onChange={(e) => setInstallDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Warranty Expiration Date
                    </label>
                    <input
                      type="date"
                      value={warrantyExpiryDate}
                      onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Expected Lifespan (Years)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={expectedLifespanYears}
                      onChange={(e) => setExpectedLifespanYears(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Purchase Cost ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Optional manufacturer serial number..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Maintenance & Filter Log Notes
                  </label>
                  <textarea
                    rows={2}
                    value={maintenanceNotes}
                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                    placeholder="Filter specifications, last technician visit, warranty notes..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingAsset ? 'Update Asset' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-semibold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Home Asset</span>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <strong className="text-slate-900">{deletingName}</strong>?
              </p>
              <p className="text-xs text-slate-400">
                All maintenance history and warranty specs for this asset will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

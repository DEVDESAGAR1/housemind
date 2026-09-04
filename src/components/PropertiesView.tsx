import React, { useState, useEffect } from 'react';
import {
  Home,
  Plus,
  Layers,
  MapPin,
  Calendar,
  DollarSign,
  Maximize2,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { Property, Room, HomeAsset, PropertyType, RoomType } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ContextualHelp } from './help/ContextualHelp';

interface PropertiesViewProps {
  properties: Property[];
  rooms: Room[];
  assets?: HomeAsset[];
  onRefresh: () => void;
  onOpenEntityExtractor: (entityType?: any) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  currency?: string;
  autoOpenAdd?: boolean;
  onAddModalOpened?: () => void;
}

export function PropertiesView({
  properties = [],
  rooms = [],
  assets = [],
  onRefresh,
  onOpenEntityExtractor,
  addToast,
  currency = 'USD',
  autoOpenAdd,
  onAddModalOpened,
}: PropertiesViewProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties?.[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Deletion confirmation states
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [isDeletingProperty, setIsDeletingProperty] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  // Form states
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    propertyType: 'primary_home' as PropertyType,
    purchaseDate: '',
    purchaseValue: 0,
    currentEstimatedValue: 0,
    squareFootage: 0,
    yearBuilt: new Date().getFullYear(),
    notes: '',
    address: {
      street: '',
      city: '',
      region: '',
      postalCode: '',
      country: 'United States',
    },
  });

  const [roomForm, setRoomForm] = useState({
    name: '',
    roomType: 'living_room' as RoomType,
    floorLevel: 'Main Level',
    squareFootage: 0,
    notes: '',
  });

  useEffect(() => {
    if ((properties || []).length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = (properties || []).find((p) => p && p.id === selectedPropertyId) || properties?.[0];
  const propertyRooms = (rooms || []).filter((r) => r && r.propertyId === (selectedProperty?.id || ''));

  const handleOpenNewProperty = () => {
    setEditingProperty(null);
    setPropertyForm({
      name: '',
      propertyType: 'primary_home',
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseValue: 350000,
      currentEstimatedValue: 425000,
      squareFootage: 2200,
      yearBuilt: 2012,
      notes: '',
      address: {
        street: '124 Maplewood Drive',
        city: 'Portland',
        region: 'OR',
        postalCode: '97201',
        country: 'United States',
      },
    });
    setIsPropertyModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenAdd) {
      handleOpenNewProperty();
      onAddModalOpened?.();
    }
  }, [autoOpenAdd]);

  const handleOpenEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setPropertyForm({
      name: prop.name,
      propertyType: prop.propertyType,
      purchaseDate: prop.purchaseDate || '',
      purchaseValue: prop.purchaseValue || 0,
      currentEstimatedValue: prop.currentEstimatedValue || 0,
      squareFootage: prop.squareFootage || 0,
      yearBuilt: prop.yearBuilt || 2000,
      notes: prop.notes || '',
      address: {
        street: prop.address?.street || '',
        city: prop.address?.city || '',
        region: prop.address?.region || '',
        postalCode: prop.address?.postalCode || '',
        country: prop.address?.country || 'United States',
      },
    });
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await api.updateProperty(editingProperty.id, propertyForm);
        addToast('success', 'Property Updated', `Updated "${propertyForm.name}".`);
      } else {
        const created = await api.createProperty(propertyForm);
        setSelectedPropertyId(created.id);
        addToast('success', 'Property Added', `Added "${created.name}".`);
      }
      setIsPropertyModalOpen(false);
      onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Property', err.message);
    }
  };

  const handlePromptDeleteProperty = (prop: Property) => {
    setDeletingProperty(prop);
  };

  const handleConfirmDeleteProperty = async () => {
    if (!deletingProperty) return;
    try {
      setIsDeletingProperty(true);
      await api.deleteProperty(deletingProperty.id);
      if (selectedPropertyId === deletingProperty.id) {
        const remaining = properties.filter((p) => p.id !== deletingProperty.id);
        setSelectedPropertyId(remaining.length > 0 ? remaining[0].id : '');
      }
      addToast('info', 'Property Removed', `Deleted "${deletingProperty.name}".`);
      setDeletingProperty(null);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setIsDeletingProperty(false);
    }
  };

  const handleOpenNewRoom = () => {
    if (!selectedProperty) {
      addToast('error', 'No Property', 'Please select or create a property first.');
      return;
    }
    setEditingRoom(null);
    setRoomForm({
      name: '',
      roomType: 'living_room',
      floorLevel: 'Main Level',
      squareFootage: 240,
      notes: '',
    });
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      roomType: room.roomType,
      floorLevel: room.floorLevel || 'Main Level',
      squareFootage: room.squareFootage || 0,
      notes: room.notes || '',
    });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    try {
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, {
          ...roomForm,
          propertyId: selectedProperty.id,
        });
        addToast('success', 'Room Updated', `Updated "${roomForm.name}".`);
      } else {
        await api.createRoom({
          ...roomForm,
          propertyId: selectedProperty.id,
        });
        addToast('success', 'Room Added', `Created "${roomForm.name}".`);
      }
      setIsRoomModalOpen(false);
      onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Room', err.message);
    }
  };

  const handlePromptDeleteRoom = (room: Room) => {
    setDeletingRoom(room);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deletingRoom) return;
    try {
      setIsDeletingRoom(true);
      await api.deleteRoom(deletingRoom.id);
      addToast('info', 'Room Removed', `Deleted "${deletingRoom.name}".`);
      setDeletingRoom(null);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const roomTypeLabels: Record<RoomType, string> = {
    living_room: 'Living Room',
    kitchen: 'Kitchen',
    master_bedroom: 'Master Suite',
    bedroom: 'Bedroom',
    bathroom: 'Bathroom',
    balcony: 'Balcony / Terrace',
    basement: 'Basement',
    attic: 'Attic',
    garage: 'Garage',
    laundry: 'Laundry Room',
    office: 'Office',
    home_office: 'Home Office',
    storage: 'Storage',
    garden: 'Garden',
    outdoor: 'Outdoor / Yard',
    dining_room: 'Dining Room',
    hallway: 'Hallway / Corridor',
    utility_area: 'Utility Area',
    utility_room: 'Mechanical / Utility',
    other: 'General Area',
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Home className="w-6 h-6 text-indigo-600" />
            <span>Properties & Rooms Management</span>
            <ContextualHelp
              id="help-properties"
              title="Properties & Space Architecture"
              summary="Define primary residences, secondary units, and room allocations."
              bullets={[
                'Map rooms (Kitchen, Utility, Garage) to accurately localize appliances.',
                'Record physical specifications (square footage, year built, archetypes).',
                'Rooms serve as physical anchor points for maintenance routing.',
              ]}
            />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize household structures, multi-unit properties, floorplans, and assigned equipment zones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenEntityExtractor('property')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Extract from Deed/Doc</span>
          </button>

          <button
            onClick={handleOpenNewProperty}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Property Selector Tabs */}
      {properties.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {properties.map((prop) => (
            <button
              key={prop.id}
              onClick={() => setSelectedPropertyId(prop.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedProperty?.id === prop.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>{prop.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase ${
                  selectedProperty?.id === prop.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {prop.propertyType?.replace('_', ' ') || 'Property'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Property Details & Rooms */}
      {selectedProperty ? (
        <div className="space-y-6">
          {/* Property Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{selectedProperty.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 capitalize">
                    {selectedProperty.propertyType?.replace('_', ' ') || 'Property'}
                  </span>
                </div>
                {selectedProperty.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedProperty.address.street}, {selectedProperty.address.city},{' '}
                    {selectedProperty.address.region} {selectedProperty.address.postalCode}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditProperty(selectedProperty)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Property</span>
                </button>
                <button
                  onClick={() => handlePromptDeleteProperty(selectedProperty)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Property"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Est. Value</span>
                <p className="text-sm font-bold text-slate-900">
                  {currency} {(selectedProperty.currentEstimatedValue || selectedProperty.purchaseValue || 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Area</span>
                <p className="text-sm font-bold text-slate-900">
                  {selectedProperty.squareFootage ? `${selectedProperty.squareFootage.toLocaleString()} sq ft` : 'N/A'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Year Built</span>
                <p className="text-sm font-bold text-slate-900">
                  {selectedProperty.yearBuilt || 'N/A'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Configured Rooms</span>
                <p className="text-sm font-bold text-indigo-600">
                  {propertyRooms.length} Zones
                </p>
              </div>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Rooms & Floor Zones ({propertyRooms.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage rooms to accurately assign appliances, electronics, and maintenance tasks.
                </p>
              </div>

              <button
                onClick={handleOpenNewRoom}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Room / Zone</span>
              </button>
            </div>

            {propertyRooms.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">No rooms mapped yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Add rooms (Kitchen, Living Room, HVAC Utility, Garage) to easily link equipment and filter repairs.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewRoom}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Room</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {propertyRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 transition shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                            {roomTypeLabels[room.roomType] || room.roomType}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{room.name}</h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditRoom(room)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                            title="Edit Room"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePromptDeleteRoom(room)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {room.notes && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{room.notes}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>{room.floorLevel || 'Main Floor'}</span>
                      <span>{room.squareFootage ? `${room.squareFootage} sq ft` : 'Standard'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto">
            <Home className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No properties registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add your primary residence or rental properties to unlock complete room partitioning, appliance assignments, and utility tracking.
            </p>
          </div>
          <button
            onClick={handleOpenNewProperty}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Property</span>
          </button>
        </div>
      )}

      {/* Property Modal */}
      {isPropertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h3>
              <button
                onClick={() => setIsPropertyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maplewood Haven Primary Residence"
                  value={propertyForm.name}
                  onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={propertyForm.propertyType}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, propertyType: e.target.value as PropertyType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="primary_home">Primary Home</option>
                    <option value="rental_property">Rental Property</option>
                    <option value="vacation_home">Vacation Home</option>
                    <option value="land">Land / Acreage</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Value ({currency})</label>
                  <input
                    type="number"
                    value={propertyForm.currentEstimatedValue}
                    onChange={(e) =>
                      setPropertyForm({
                        ...propertyForm,
                        currentEstimatedValue: Number(e.target.value),
                        purchaseValue: propertyForm.purchaseValue || Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Square Footage</label>
                  <input
                    type="number"
                    placeholder="e.g. 2400"
                    value={propertyForm.squareFootage || ''}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, squareFootage: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year Built</label>
                  <input
                    type="number"
                    value={propertyForm.yearBuilt || ''}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, yearBuilt: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Address</label>
                <input
                  type="text"
                  placeholder="Street Address"
                  value={propertyForm.address.street}
                  onChange={(e) =>
                    setPropertyForm({
                      ...propertyForm,
                      address: { ...propertyForm.address, street: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={propertyForm.address.city}
                    onChange={(e) =>
                      setPropertyForm({
                        ...propertyForm,
                        address: { ...propertyForm.address, city: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="State / Region"
                    value={propertyForm.address.region}
                    onChange={(e) =>
                      setPropertyForm({
                        ...propertyForm,
                        address: { ...propertyForm.address, region: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="ZIP / Postal"
                    value={propertyForm.address.postalCode}
                    onChange={(e) =>
                      setPropertyForm({
                        ...propertyForm,
                        address: { ...propertyForm.address, postalCode: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPropertyModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRoom ? 'Edit Room / Zone' : 'Add Room / Zone'}
              </h3>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bedroom, HVAC Basement"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                  <select
                    value={roomForm.roomType}
                    onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value as RoomType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  >
                    {Object.entries(roomTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Floor Level</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor, Basement"
                    value={roomForm.floorLevel}
                    onChange={(e) => setRoomForm({ ...roomForm, floorLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Key equipment located in this zone..."
                  value={roomForm.notes}
                  onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Property Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingProperty)}
        title="Delete Property"
        itemName={deletingProperty?.name || 'Property'}
        itemType="property"
        description="Are you sure you want to permanently delete this property and its associated layout data?"
        warningNote="All assigned rooms and layout mapping for this property will be removed."
        confirmLabel="Delete Property"
        isDeleting={isDeletingProperty}
        onConfirm={handleConfirmDeleteProperty}
        onCancel={() => setDeletingProperty(null)}
      />

      {/* Delete Room Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingRoom)}
        title="Delete Room"
        itemName={deletingRoom?.name || 'Room'}
        itemType="room"
        description="Are you sure you want to permanently delete this room?"
        warningNote="Any assets assigned to this room will have their room assignment cleared."
        confirmLabel="Delete Room"
        isDeleting={isDeletingRoom}
        onConfirm={handleConfirmDeleteRoom}
        onCancel={() => setDeletingRoom(null)}
      />
    </div>
  );
}

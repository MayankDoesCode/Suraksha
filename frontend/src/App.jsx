import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BrandList from './components/BrandList';
import BrandModal from './components/BrandModal';
import BrandDetailDrawer from './components/BrandDetailDrawer';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import DiagnosticsView from './components/DiagnosticsView';
import PlannedModuleView from './components/PlannedModuleView';
import api from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState('brands');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Health Diagnostics
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [deletingBrand, setDeletingBrand] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Health Telemetry
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      setHealth({
        status: 'degraded',
        error: err.message,
        database: { connected: false, status: 'Connection error' },
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch Brands List
  const fetchBrands = useCallback(async (searchTerm = search) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listBrands({ search: searchTerm });
      setBrands(response.data || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch brand profiles.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Initial Data Load
  useEffect(() => {
    fetchHealth();
    fetchBrands('');
  }, [fetchHealth]);

  // Handle Search Input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrands(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchBrands]);

  // Save Brand (Create or Update)
  const handleSaveBrand = async (payload) => {
    if (editingBrand) {
      const updated = await api.updateBrand(editingBrand.id, payload);
      showToast(`Brand "${updated.data.name}" updated successfully.`);
      if (selectedBrand?.id === editingBrand.id) {
        setSelectedBrand(updated.data);
      }
    } else {
      const created = await api.createBrand(payload);
      showToast(`Brand "${created.data.name}" registered successfully.`);
    }
    await fetchBrands(search);
    setIsModalOpen(false);
    setEditingBrand(null);
  };

  // Delete Brand
  const handleConfirmDelete = async (brandId) => {
    setDeleting(true);
    try {
      await api.deleteBrand(brandId);
      showToast('Brand profile deleted permanently.', 'info');
      setDeletingBrand(null);
      if (selectedBrand?.id === brandId) {
        setSelectedBrand(null);
      }
      await fetchBrands(search);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (brand) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-cyber-darkest text-cyber-textMain select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        health={health}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Header */}
        <Header
          currentView={currentView}
          health={health}
          healthLoading={healthLoading}
          onRefresh={() => {
            fetchHealth();
            if (currentView === 'brands') fetchBrands();
          }}
          onOpenCreateModal={handleOpenCreate}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Notification Toast */}
          {toast && (
            <div
              className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-3 border transition-all animate-in slide-in-from-top-2 duration-200 ${
                toast.type === 'error'
                  ? 'bg-cyber-rose/90 border-cyber-rose text-white shadow-glowRose'
                  : toast.type === 'info'
                  ? 'bg-cyber-surface border-cyber-border text-white'
                  : 'bg-cyber-surface border-cyber-emerald/60 text-cyber-emerald shadow-glowEmerald'
              }`}
            >
              <span>{toast.message}</span>
            </div>
          )}

          {/* Views */}
          {currentView === 'brands' && (
            <BrandList
              brands={brands}
              loading={loading}
              error={error}
              search={search}
              setSearch={setSearch}
              onRefresh={() => fetchBrands(search)}
              onOpenCreate={handleOpenCreate}
              onSelectBrand={setSelectedBrand}
              onEditBrand={handleOpenEdit}
              onDeleteBrand={setDeletingBrand}
            />
          )}

          {currentView === 'diagnostics' && (
            <DiagnosticsView
              health={health}
              loading={healthLoading}
              onRefresh={fetchHealth}
            />
          )}

          {['social', 'domains', 'apps', 'campaigns'].includes(currentView) && (
            <PlannedModuleView
              moduleId={currentView}
              brandCount={brands.length}
              onSwitchToBrands={() => setCurrentView('brands')}
            />
          )}
        </main>
      </div>

      {/* Brand Create/Edit Modal */}
      <BrandModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBrand(null);
        }}
        onSave={handleSaveBrand}
        initialData={editingBrand}
        isEditing={!!editingBrand}
      />

      {/* Brand Inspect Detail Drawer */}
      <BrandDetailDrawer
        brand={selectedBrand}
        onClose={() => setSelectedBrand(null)}
        onEdit={(brand) => {
          setSelectedBrand(null);
          handleOpenEdit(brand);
        }}
        onDelete={(brand) => {
          setSelectedBrand(null);
          setDeletingBrand(brand);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingBrand}
        brand={deletingBrand}
        onClose={() => setDeletingBrand(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />
    </div>
  );
}

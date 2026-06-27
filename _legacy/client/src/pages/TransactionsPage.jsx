import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useBudget } from '../hooks/useBudget';
import api from '../api/axios';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionFilters from '../components/transactions/TransactionFilters';
import TransactionModal from '../components/transactions/TransactionModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { SkeletonTable } from '../components/common/Skeletons';

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { evaluateTransaction } = useNotifications();
  const { budgets } = useBudget();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    startDate: '',
    endDate: '',
    sort: '',
    search: '',
    minAmount: '',
    maxAmount: '',
    page: 1,
    limit: 10
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const isAdmin = user?.role === 'admin';

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.sort) params.sort = filters.sort;
      if (filters.search) params.search = filters.search;
      params.page = String(filters.page);
      params.limit = String(filters.limit);

      // Convert date string parameters to full ISO datetime required by Zod validator
      if (filters.startDate) {
        params.startDate = new Date(filters.startDate).toISOString();
      }
      if (filters.endDate) {
        params.endDate = new Date(filters.endDate).toISOString();
      }

      const response = await api.get('/transactions', { params });
      setTransactions(response.data.data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [
    filters.type,
    filters.category,
    filters.startDate,
    filters.endDate,
    filters.sort,
    filters.search,
    filters.page
  ]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;

    if (action === 'add') {
      const type = searchParams.get('type') || 'expense';
      setSelectedTx({ type, date: new Date().toISOString(), _isNew: true });
      setModalOpen(true);
      
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      newParams.delete('type');
      setSearchParams(newParams, { replace: true });
    } else if (action === 'edit') {
      const id = searchParams.get('id');
      if (id) {
        const found = transactions.find(t => t._id === id);
        if (found) {
          setSelectedTx(found);
          setModalOpen(true);
          
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('action');
          newParams.delete('id');
          setSearchParams(newParams, { replace: true });
        } else if (!loading) {
          api.get(`/transactions/${id}`)
            .then(res => {
              if (res.data?.data) {
                setSelectedTx(res.data.data);
                setModalOpen(true);
              }
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('action');
              newParams.delete('id');
              setSearchParams(newParams, { replace: true });
            })
            .catch(err => {
              console.error('Failed to fetch transaction for editing:', err);
              toast.error('Could not find the requested transaction.');
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('action');
              newParams.delete('id');
              setSearchParams(newParams, { replace: true });
            });
        }
      }
    }
  }, [searchParams, transactions, loading]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: name === 'page' ? value : 1 // Reset to page 1 on input filter modifications
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      type: '',
      category: '',
      startDate: '',
      endDate: '',
      sort: '',
      search: '',
      minAmount: '',
      maxAmount: '',
      page: 1,
      limit: 10
    });
  };

  const handleCreateOrUpdate = async (data) => {
    try {
      if (selectedTx && !selectedTx._isNew) {
        // Edit flow
        const response = await api.put(`/transactions/${selectedTx._id}`, data);
        toast.success('Transaction updated successfully');
        setTransactions(prev => prev.map(tx => tx._id === selectedTx._id ? response.data.data : tx));
      } else {
        // Create flow
        const created = await api.post('/transactions', data);
        toast.success('Transaction created successfully');
        // Evaluate alert rules against the newly created transaction
        if (created.data?.data) evaluateTransaction(created.data.data, budgets, transactions);
        fetchTransactions(); // Refetch list to calculate page indexes
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save transaction');
      throw err;
    }
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/transactions/${deleteTargetId}`);
      toast.success('Transaction deleted successfully');
      setTransactions(prev => prev.filter(tx => tx._id !== deleteTargetId));
      if (transactions.length <= 1 && filters.page > 1) {
        handleFilterChange('page', filters.page - 1);
      } else {
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete transaction');
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Client-side amount filtering
  const filteredByAmount = transactions.filter(tx => {
    if (filters.minAmount && tx.amount < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && tx.amount > parseFloat(filters.maxAmount)) return false;
    return true;
  });

  const openAddModal = () => {
    setSelectedTx(null);
    setModalOpen(true);
  };

  const openEditModal = (tx) => {
    setSelectedTx(tx);
    setModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions Ledger</h1>
          <p className="page-subtitle">Manage and inspect all financial activities</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchTransactions} title="Refresh Ledger">
            <RefreshCw size={16} />
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              Add Transaction
            </button>
          )}
        </div>
      </div>

      {/* Inputs Filter Component */}
      <TransactionFilters 
        filters={filters} 
        onChange={handleFilterChange} 
        onClear={handleClearFilters} 
      />

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <>
          {/* Data Table */}
          <TransactionTable 
            transactions={filteredByAmount} 
            isAdmin={isAdmin}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />

          {/* Table Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  className={`pagination-btn ${filters.page === pageNum ? 'active' : ''}`}
                  onClick={() => handleFilterChange('page', pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                className="pagination-btn"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={filters.page >= pagination.pages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Popup Form Modal */}
      <TransactionModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        transaction={selectedTx}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteTargetId(null); }}
        onConfirm={confirmDeleteAction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

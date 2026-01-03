
import React, { useState, useEffect } from 'react';
import { Loader2, Menu } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { EmployeesView } from './views/EmployeesView';
import { EntriesView } from './components/EntriesView';
import { CashFlowPage } from './components/cash-flow/CashFlowPage';
import { OrdersPage } from './components/orders/OrdersPage';
import { InventoryPage } from './components/inventory/InventoryPage';
import { RecipesView } from './views/RecipesView';
import { AnalysisView } from './views/AnalysisView'; 
import { MenuEditorView } from './views/MenuEditorView';
import { StoreSettingsView } from './views/StoreSettingsView';
import { DashboardView } from './views/DashboardView';
import { CustomersView } from './views/CustomersView';
import { POSPage } from './views/POSPage';
import { DeliveryPage } from './views/DeliveryPage';
import { FinancialPage } from './views/FinancialPage';
import { AuthScreen } from './components/AuthScreen';
import { ConfirmModal } from './components/ConfirmModal';

import { Transaction, TransactionType } from './types';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, isOpen: boolean }>({ id: '', isOpen: false });

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsDemoMode(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (user && !isDemoMode) {
        const fetchT = async () => {
            const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false });
            if (data) setTransactions(data.map((t:any) => ({ ...t, date: new Date(t.date) })));
        };
        fetchT();
    } else if (isDemoMode) {
        setTransactions([
            { id: '1', description: 'Venda Pizza', amount: 89.90, type: 'income', category: 'Pizzas', date: new Date() },
            { id: '2', description: 'Venda Pizza', amount: 120.50, type: 'income', category: 'Pizzas', date: new Date() },
            { id: '3', description: 'Compra Queijo', amount: 450.00, type: 'expense', category: 'Suprimentos', date: new Date() },
            { id: '4', description: 'Energia Elétrica', amount: 850.00, type: 'expense', category: 'Manutenção', date: new Date() },
            { id: '5', description: 'Venda Pizza', amount: 45.00, type: 'income', category: 'Bebidas', date: new Date() },
            { id: '6', description: 'Embalagens', amount: 200.00, type: 'expense', category: 'Insumos', date: new Date() }
        ]);
    }
  }, [user, isDemoMode]);

  const handleAddTransaction = async (description: string, amount: number, type: TransactionType, category: string, dateStr?: string) => {
    setIsLoading(true);
    const transactionDate = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
    
    if (isDemoMode) {
        setTransactions(prev => [{ id: Math.random().toString(), description, amount, type, category, date: transactionDate }, ...prev]);
    } else {
        await supabase.from('transactions').insert({ 
            description, 
            amount, 
            type, 
            category, 
            user_id: user.id, 
            date: transactionDate.toISOString() 
        });
        const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false });
        if (data) setTransactions(data.map((t:any) => ({ ...t, date: new Date(t.date) })));
    }
    setIsLoading(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      } else {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    } catch (err: any) {
      alert("Erro ao excluir lançamento: " + err.message);
    } finally {
      setIsLoading(false);
      setConfirmDelete({ id: '', isOpen: false });
    }
  };

  const activateDemoMode = () => {
    setIsDemoMode(true);
    setUser({ id: 'demo-user', email: 'visitante@pizzaria.com' });
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-stone-950"><Loader2 className="animate-spin text-red-600" size={48}/></div>;
  if (!user) return <AuthScreen onBypass={activateDemoMode} />;

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark bg-stone-950 text-white' : 'bg-stone-50 text-stone-900'}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        user={user} 
        isDarkMode={isDarkMode} 
        toggleTheme={() => setIsDarkMode(!isDarkMode)} 
        onLogout={() => supabase.auth.signOut()} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between p-4 bg-stone-900 dark:bg-stone-950 border-b border-stone-800 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-stone-400 hover:text-white">
            <Menu size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-lg font-black text-white uppercase tracking-tighter">
              CH
              <div className="flex flex-col w-2 h-5 gap-0.5 justify-center">
                <div className="bg-[#008C45] h-1 w-full rounded-sm"></div>
                <div className="bg-white h-1 w-full rounded-sm"></div>
                <div className="bg-[#CD212A] h-1 w-full rounded-sm"></div>
              </div>
              GOU
            </div>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black text-xs">
            {(user.email?.[0] || 'U').toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-12">
          {activeTab === 'dashboard' && <DashboardView transactions={transactions} />}
          {activeTab === 'entries' && <EntriesView onAdd={handleAddTransaction} transactions={transactions} onDelete={async (id) => setConfirmDelete({id, isOpen: true})} user={user} isLoading={isLoading} />}
          {activeTab === 'financeiro' && <FinancialPage />}
          {activeTab === 'pos' && <POSPage user={user} onAddTransaction={handleAddTransaction} />}
          {activeTab === 'recipes' && <RecipesView user={user} />}
          {activeTab === 'analysis' && <AnalysisView user={user} />}
          {activeTab === 'employees' && <EmployeesView user={user} onAddTransaction={handleAddTransaction} />}
          {activeTab === 'cash-flow' && <CashFlowPage transactions={transactions} user={user} />}
          {activeTab === 'orders' && <OrdersPage user={user} onAddTransaction={handleAddTransaction} />}
          {activeTab === 'logistics' && <DeliveryPage user={user} />}
          {activeTab === 'inventory-control' && <InventoryPage user={user} />}
          {activeTab === 'menu-editor' && <MenuEditorView user={user} />}
          {activeTab === 'customers' && <CustomersView user={user} />}
          {activeTab === 'settings' && <StoreSettingsView user={user} />}
        </main>
      </div>

      <ConfirmModal 
        isOpen={confirmDelete.isOpen} 
        onCancel={() => setConfirmDelete({id: '', isOpen: false})} 
        onConfirm={() => handleDeleteTransaction(confirmDelete.id)} 
        loading={isLoading}
        title="Excluir Lançamento" 
        message="Tem certeza que deseja remover este lançamento? Esta ação não pode ser desfeita." 
      />
    </div>
  );
}

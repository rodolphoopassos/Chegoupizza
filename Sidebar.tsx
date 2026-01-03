import React from 'react';
import { 
  PieChart, 
  Wallet, 
  Package, 
  BookOpen, 
  BarChart3,
  Users,
  ChefHat, 
  Menu,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  DollarSign,
  ShoppingBag,
  Layers,
  X,
  ClipboardList,
  Monitor
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  user: any;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
}

const SidebarLink = ({ active, onClick, icon, label, isOpen, isSpecial }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; isOpen: boolean; isSpecial?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 p-3.5 md:p-3 rounded-xl w-full transition-all ${
      active 
        ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 translate-x-1' 
        : isSpecial 
          ? 'text-red-500 hover:bg-red-500/10'
          : 'hover:bg-white/10 text-stone-400 hover:text-white'
    }`}
  >
    <div className={`${active ? 'text-white' : isSpecial ? 'text-red-500' : 'text-stone-500'} transition-colors`}>{icon}</div>
    <span className={`font-bold text-xs uppercase tracking-widest transition-all duration-300 overflow-hidden whitespace-nowrap ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 md:hidden'} ${isSpecial && !active ? 'text-red-500' : ''}`}>
      {label}
    </span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setSidebarOpen,
  user,
  isDarkMode,
  toggleTheme,
  onLogout
}) => {
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed md:static inset-y-0 left-0 flex flex-col bg-stone-900 dark:bg-stone-950 text-white transition-all duration-300 shadow-2xl z-50 border-r border-stone-800 
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-24 -translate-x-full md:translate-x-0 md:w-24'}`}
      >
        <div className="h-24 flex items-center justify-between px-6 border-b border-stone-800">
          <div className={`flex flex-col items-center gap-0 overflow-hidden transition-all ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 md:hidden'}`}>
            <div className="flex items-center gap-1 text-xl font-black text-white uppercase tracking-tighter">
              CH
              <div className="flex flex-col w-2.5 h-6 gap-0.5 justify-center">
                <div className="bg-[#008C45] h-1.5 w-full rounded-sm"></div>
                <div className="bg-white h-1.5 w-full rounded-sm"></div>
                <div className="bg-[#CD212A] h-1.5 w-full rounded-sm"></div>
              </div>
              GOU
            </div>
            <div className="text-[10px] font-light tracking-[0.4em] text-stone-500 uppercase -mt-1">PIZZA</div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-stone-500"
          >
            {isSidebarOpen ? (
              <ChevronLeft size={20} className="hidden md:block" />
            ) : (
              <Menu size={24} className="hidden md:block" />
            )}
            <X size={24} className="md:hidden" />
          </button>
        </div>

        <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => handleTabClick('dashboard')} icon={<PieChart size={20} />} label="Dashboard" isOpen={isSidebarOpen} />
          <SidebarLink active={activeTab === 'pos'} onClick={() => handleTabClick('pos')} icon={<Monitor size={20} />} label="Frente de Caixa" isOpen={isSidebarOpen} isSpecial={true} />
          <SidebarLink active={activeTab === 'entries'} onClick={() => handleTabClick('entries')} icon={<Wallet size={20} />} label="Lançamentos" isOpen={isSidebarOpen} />
          
          <div className="my-6 border-t border-stone-800/50 mx-2"></div>

          <SidebarLink active={activeTab === 'orders'} onClick={() => handleTabClick('orders')} icon={<ShoppingBag size={20} />} label="Pedidos & Cozinha" isOpen={isSidebarOpen} />
          <SidebarLink active={activeTab === 'cash-flow'} onClick={() => handleTabClick('cash-flow')} icon={<DollarSign size={20} />} label="Caixa & Movimento" isOpen={isSidebarOpen} />
          <SidebarLink active={activeTab === 'recipes'} onClick={() => handleTabClick('recipes')} icon={<BookOpen size={20} />} label="Fichas Técnicas" isOpen={isSidebarOpen} />
          <SidebarLink active={activeTab === 'inventory-control'} onClick={() => handleTabClick('inventory-control')} icon={<Layers size={20} />} label="Estoque & Compras" isOpen={isSidebarOpen} />
          
          <div className="my-6 border-t border-stone-800/50 mx-2"></div>
          
          <SidebarLink active={activeTab === 'analysis'} onClick={() => handleTabClick('analysis')} icon={<BarChart3 size={20} />} label="Margens & Lucro" isOpen={isSidebarOpen} />
          <SidebarLink active={activeTab === 'employees'} onClick={() => handleTabClick('employees')} icon={<Users size={20} />} label="RH & Folha" isOpen={isSidebarOpen} />
          <SidebarLink active={activeTab === 'menu-editor'} onClick={() => handleTabClick('menu-editor')} icon={<ClipboardList size={20} />} label="Editor de Cardápio" isOpen={isSidebarOpen} />
        </div>

        <div className="p-6 border-t border-stone-800 bg-stone-900/40 space-y-4">
          {isSidebarOpen && (
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
               <div className="flex items-center gap-3">
                 {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                 <span>Tema {isDarkMode ? 'Claro' : 'Escuro'}</span>
               </div>
            </button>
          )}

          <div className={`flex items-center gap-4 ${!isSidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-red-900/40">
              {(user.email?.[0] || 'U').toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-black truncate uppercase tracking-tighter" title={user.email || 'Usuário'}>
                  {user.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Master</p>
              </div>
            )}
            {isSidebarOpen && (
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-red-600/10 rounded-lg text-stone-500 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
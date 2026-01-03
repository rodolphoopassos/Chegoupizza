import React from 'react';
import { User as UserIcon, Clock, Percent, DollarSign } from 'lucide-react';

interface ModuleTabsProps {
  activeSubTab: 'cadastro' | 'horas' | 'comissoes' | 'folha';
  setActiveSubTab: (tab: 'cadastro' | 'horas' | 'comissoes' | 'folha') => void;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({ activeSubTab, setActiveSubTab }) => {
  const tabs = [
    { id: 'cadastro', label: 'Cadastro', icon: <UserIcon size={18}/> },
    { id: 'horas', label: 'Controle de Horas', icon: <Clock size={18}/> },
    { id: 'comissoes', label: 'Vendas/Comissões', icon: <Percent size={18}/> },
    { id: 'folha', label: 'Folha de Pagamento', icon: <DollarSign size={18}/> }
  ];

  return (
    <div className="flex overflow-x-auto gap-2 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl">
       {tabs.map(tab => (
          <button
             key={tab.id}
             onClick={() => setActiveSubTab(tab.id as any)}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                activeSubTab === tab.id 
                ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
             }`}
          >
             {tab.icon} {tab.label}
          </button>
       ))}
    </div>
  );
};

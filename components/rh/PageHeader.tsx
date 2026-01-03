import React from 'react';
import { Users, Calendar } from 'lucide-react';

interface PageHeaderProps {
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ currentMonth, setCurrentMonth }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
       <h2 className="text-2xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
          <Users className="text-blue-600"/> Gestão de Pessoal
       </h2>
       <div className="flex items-center gap-2 bg-white dark:bg-stone-800 p-2 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm">
          <Calendar size={18} className="text-stone-500"/>
          <span className="text-xs font-bold uppercase text-stone-500">Mês de Referência:</span>
          <input 
            type="month" 
            value={currentMonth} 
            onChange={e => setCurrentMonth(e.target.value)}
            className="bg-transparent font-bold text-stone-800 dark:text-white outline-none"
          />
       </div>
    </div>
  );
};

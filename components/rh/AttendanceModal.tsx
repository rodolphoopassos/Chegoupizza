
import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, Trash2, CheckCircle2 } from 'lucide-react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDays: number[]) => void;
  monthRef: string; // "YYYY-MM"
  initialDays: number[];
  employeeName: string;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  monthRef,
  initialDays,
  employeeName
}) => {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedDays(Array.isArray(initialDays) ? initialDays : []);
    }
  }, [isOpen, initialDays]);

  if (!isOpen) return null;

  // Extrair Ano e Mês
  const [yearStr, monthStr] = monthRef.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // JS Date months are 0-indexed

  // Gerar dados do calendário
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo

  // Dias da semana
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const selectAll = () => {
    const all = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    setSelectedDays(all);
  };

  const selectWeekdays = () => {
    const weekdays: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month, d).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0=Dom, 6=Sab
            weekdays.push(d);
        }
    }
    setSelectedDays(weekdays);
  };

  const clearAll = () => setSelectedDays([]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#121212] w-full max-w-md rounded-[2.5rem] border border-stone-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-6 bg-stone-900 border-b border-stone-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
               <Calendar size={16} className="text-blue-500"/> Frequência Detalhada
            </h3>
            <p className="text-[10px] font-bold text-stone-500 uppercase mt-1 tracking-widest">{employeeName}</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
            <X size={20}/>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
           <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black text-white uppercase bg-stone-800 px-3 py-1 rounded-lg">
                 {new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                 {selectedDays.length} Dias Selecionados
              </span>
           </div>

           {/* Grid Calendar */}
           <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDays.map((d, i) => (
                 <div key={i} className="text-center text-[10px] font-black text-stone-500 uppercase py-2">
                    {d}
                 </div>
              ))}
              
              {/* Espaços vazios antes do dia 1 */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                 <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {/* Dias */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                 const day = i + 1;
                 const isSelected = selectedDays.includes(day);
                 const dateObj = new Date(year, month, day);
                 const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                 return (
                    <button
                       key={day}
                       onClick={() => toggleDay(day)}
                       className={`aspect-square rounded-xl text-xs font-black transition-all flex items-center justify-center border ${
                          isSelected 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20 scale-105' 
                          : isWeekend 
                             ? 'bg-stone-900/50 border-stone-800 text-stone-600 hover:bg-stone-800 hover:text-stone-400' 
                             : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-white'
                       }`}
                    >
                       {day}
                    </button>
                 );
              })}
           </div>

           {/* Quick Actions */}
           <div className="flex gap-2 justify-center mb-2">
              <button onClick={selectWeekdays} className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-[9px] font-bold text-stone-400 hover:text-white uppercase tracking-widest transition-colors">Seg-Sex</button>
              <button onClick={selectAll} className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-[9px] font-bold text-stone-400 hover:text-white uppercase tracking-widest transition-colors">Todos</button>
              <button onClick={clearAll} className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-[9px] font-bold text-stone-400 hover:text-red-500 uppercase tracking-widest transition-colors">Limpar</button>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 flex gap-3">
           <button onClick={onClose} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase text-stone-500 hover:bg-stone-800 transition-colors">Cancelar</button>
           <button 
             onClick={() => { onConfirm(selectedDays); onClose(); }}
             className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
           >
              <CheckCircle2 size={16}/> Confirmar ({selectedDays.length})
           </button>
        </div>
      </div>
    </div>
  );
};

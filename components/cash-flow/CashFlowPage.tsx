
import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Calculator, 
  Save, 
  Clock, 
  User, 
  Play, 
  XCircle,
  TrendingUp,
  TrendingDown,
  History,
  Lock
} from 'lucide-react';
import { Transaction } from '../../types';

interface CashFlowPageProps {
  transactions: Transaction[];
  user: any;
}

export const CashFlowPage: React.FC<CashFlowPageProps> = ({ transactions, user }) => {
  // Persistence logic for cashier session
  const [isCashierOpen, setIsCashierOpen] = useState(() => {
    const saved = localStorage.getItem('cashier_status');
    return saved === 'open';
  });

  const [openingData, setOpeningData] = useState(() => {
    const saved = localStorage.getItem('cashier_opening');
    return saved ? JSON.parse(saved) : {
      time: '17:00',
      responsible: user?.email?.split('@')[0] || 'rodmastter',
      balance: 0
    };
  });

  const [physicalCash, setPhysicalCash] = useState<number>(0);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('cashier_status', isCashierOpen ? 'open' : 'closed');
    localStorage.setItem('cashier_opening', JSON.stringify(openingData));
  }, [isCashierOpen, openingData]);

  // Filtrar transações de HOJE
  const todayTransactions = useMemo(() => {
    const today = new Date().toLocaleDateString();
    return transactions.filter(t => new Date(t.date).toLocaleDateString() === today);
  }, [transactions]);

  // Resumo de Receitas
  const incomeSummary = useMemo(() => {
    const incomes = todayTransactions.filter(t => t.type === 'income');
    const summary: Record<string, { qty: number, val: number }> = {};
    
    incomes.forEach(t => {
      const key = t.category || 'Geral';
      if (!summary[key]) summary[key] = { qty: 0, val: 0 };
      summary[key].qty += 1;
      summary[key].val += t.amount;
    });

    return Object.entries(summary).map(([name, data]) => ({
      id: name,
      description: name,
      quantity: data.qty,
      value: data.val
    }));
  }, [todayTransactions]);

  // Lista de Despesas
  const expenseSummary = useMemo(() => {
    return todayTransactions.filter(t => t.type === 'expense').map(t => ({
      id: t.id,
      description: t.description,
      category: t.category,
      value: t.amount
    }));
  }, [todayTransactions]);

  // Cálculos Financeiros
  const totalIncome = useMemo(() => incomeSummary.reduce((acc, curr) => acc + curr.value, 0), [incomeSummary]);
  const totalExpense = useMemo(() => expenseSummary.reduce((acc, curr) => acc + curr.value, 0), [expenseSummary]);
  const calculatedBalance = openingData.balance + totalIncome - totalExpense;
  const difference = physicalCash - calculatedBalance;
  
  const hasDivergence = Math.abs(difference) >= 0.01;
  const status = hasDivergence ? 'DIVERGÊNCIA' : 'OK';

  const handleOpenCashier = () => {
    setIsCashierOpen(true);
  };

  const handleCloseCashier = () => {
    if (hasDivergence) {
      if (!confirm(`Atenção: Existe uma divergência de R$ ${difference.toFixed(2)}. Deseja fechar assim mesmo?`)) return;
    }
    setIsCashierOpen(false);
    setPhysicalCash(0);
    alert("Movimento encerrado com sucesso!");
  };

  if (!isCashierOpen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-stone-200 dark:border-stone-800 p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-stone-900 dark:text-white">
            <Lock size={120} />
          </div>
          
          <div className="text-center mb-10 relative z-10">
            <div className="bg-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20 text-white">
              <DollarSign size={32} />
            </div>
            <h2 className="text-3xl font-black text-stone-800 dark:text-white uppercase tracking-tighter">Abertura de Caixa</h2>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] mt-1">Inicie o movimento para registrar vendas</p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Horário</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={16}/>
                  <input 
                    type="time" 
                    value={openingData.time}
                    onChange={e => setOpeningData({...openingData, time: e.target.value})}
                    className="w-full p-4 pl-12 bg-stone-100 dark:bg-stone-800 border-none rounded-2xl text-stone-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Responsável</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={16}/>
                  <input 
                    type="text" 
                    value={openingData.responsible}
                    onChange={e => setOpeningData({...openingData, responsible: e.target.value})}
                    className="w-full p-4 pl-12 bg-stone-100 dark:bg-stone-800 border-none rounded-2xl text-stone-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Fundo de Troco Inicial (Dinheiro)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600 font-black text-xl">R$</span>
                <input 
                  type="number" 
                  value={openingData.balance}
                  onChange={e => setOpeningData({...openingData, balance: Number(e.target.value)})}
                  className="w-full p-6 pl-14 bg-stone-100 dark:bg-stone-800 border-none rounded-[1.5rem] text-3xl font-black text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="0,00"
                />
              </div>
            </div>

            <button 
              onClick={handleOpenCashier}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-red-900/20 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-widest mt-4"
            >
              <Play size={20} fill="currentColor"/> Abrir Movimento do Dia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-stone-800 dark:text-stone-100 p-4 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* --- HEADER (BANNER VERMELHO) --- */}
      <div className="bg-[#b91c1c] text-white p-5 rounded-t-[1.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
            <DollarSign className="w-6 h-6" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter">
            CONTROLE DE CAIXA - {new Date().toLocaleDateString('pt-BR')}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-inner ${hasDivergence ? 'bg-black/30 animate-pulse' : 'bg-green-600'}`}>
              Status: {status}
          </div>
          <button 
            onClick={() => setIsCashierOpen(false)} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Fechar temporariamente"
          >
            <XCircle size={20}/>
          </button>
        </div>
      </div>

      {/* --- ABERTURA INFO --- */}
      <div className="bg-[#1c1917] border-x border-b border-stone-800 rounded-b-[1.5rem] p-8 shadow-sm">
        <h3 className="text-[10px] font-black uppercase text-stone-500 mb-6 border-b border-stone-800 pb-3 flex items-center gap-2 tracking-[0.2em]">
            <Clock size={14} className="text-red-500"/> Abertura de Caixa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-stone-500 tracking-widest">Horário Abertura</label>
            <div className="text-lg font-black text-stone-200">{openingData.time}</div>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-stone-500 tracking-widest">Responsável</label>
            <div className="text-lg font-black text-stone-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {openingData.responsible}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-stone-500 tracking-widest">Valor Inicial (Fundo)</label>
            <div className="text-lg font-black text-blue-400">R$ {openingData.balance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* --- TABLES SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INCOME TABLE */}
        <div className="bg-white dark:bg-[#121212] rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="bg-green-500/5 dark:bg-green-500/5 p-5 border-b border-green-500/10">
             <h4 className="font-black text-green-600 dark:text-green-500 flex items-center gap-2 uppercase tracking-[0.2em] text-[10px]">
               <TrendingUp size={16}/> Receitas do Dia (Entradas)
             </h4>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-900/50 text-stone-500 font-black uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4 text-left">Categoria</th>
                <th className="p-4 text-center">Lançamentos</th>
                <th className="p-4 text-right pr-8">Subtotal (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {incomeSummary.length > 0 ? incomeSummary.map(item => (
                <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                  <td className="p-4 pl-8 font-bold text-stone-700 dark:text-stone-300">{item.description}</td>
                  <td className="p-4 text-center font-black text-stone-400">{item.quantity}</td>
                  <td className="p-4 text-right pr-8 font-black text-green-600">R$ {item.value.toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={3} className="p-12 text-center text-stone-500 italic text-xs uppercase tracking-widest font-bold">Nenhuma entrada registrada hoje.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-stone-50 dark:bg-stone-900/80 font-black border-t-2 border-stone-100 dark:border-stone-800">
              <tr>
                <td colSpan={2} className="p-5 text-right uppercase text-[10px] tracking-widest text-stone-500">Total Receitas</td>
                <td className="p-5 text-right pr-8 text-green-600 text-lg">R$ {totalIncome.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* EXPENSE TABLE */}
        <div className="bg-white dark:bg-[#121212] rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="bg-red-500/5 dark:bg-red-500/5 p-5 border-b border-red-500/10">
             <h4 className="font-black text-red-600 dark:text-red-500 flex items-center gap-2 uppercase tracking-[0.2em] text-[10px]">
               <TrendingDown size={16}/> Despesas do Dia (Saídas)
             </h4>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-900/50 text-stone-500 font-black uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4 text-left">Descrição</th>
                <th className="p-4 text-left">Categoria</th>
                <th className="p-4 text-right pr-8">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {expenseSummary.length > 0 ? expenseSummary.map(item => (
                <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                  <td className="p-4 pl-8 font-bold text-stone-700 dark:text-stone-300">{item.description}</td>
                  <td className="p-4 text-[10px] font-black text-stone-500 uppercase tracking-tighter">{item.category}</td>
                  <td className="p-4 text-right pr-8 font-black text-red-600">R$ {item.value.toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={3} className="p-12 text-center text-stone-500 italic text-xs uppercase tracking-widest font-bold">Nenhuma saída hoje.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-stone-50 dark:bg-stone-900/80 font-black border-t-2 border-stone-100 dark:border-stone-800">
              <tr>
                <td colSpan={2} className="p-5 text-right uppercase text-[10px] tracking-widest text-stone-500">Total Despesas</td>
                <td className="p-5 text-right pr-8 text-red-600 text-lg">R$ {totalExpense.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* --- CLOSING SECTION --- */}
      <div className={`bg-white dark:bg-[#121212] border-2 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 ${hasDivergence ? 'border-red-600/50' : 'border-green-600/50'}`}>
        <div className="p-6 bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800">
           <h4 className="font-black flex justify-center items-center gap-3 uppercase text-xs tracking-[0.3em] text-stone-500">
             <Calculator size={18} className="text-red-600"/> Fechamento & Conferência de Caixa
           </h4>
        </div>
        
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
           
           {/* Summary Math */}
           <div className="space-y-4">
             <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
               <span className="text-stone-500">Fundo Inicial (Abertura):</span>
               <span className="text-stone-700 dark:text-stone-300">R$ {openingData.balance.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-green-600">
               <span>(+) Entradas no Dia:</span>
               <span>R$ {totalIncome.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-red-600 border-b border-stone-100 dark:border-stone-800 pb-5">
               <span>(-) Saídas no Dia:</span>
               <span>R$ {totalExpense.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center bg-stone-50 dark:bg-stone-900/80 p-6 rounded-[2rem] border border-stone-100 dark:border-stone-800">
               <span className="text-sm font-black text-stone-500 uppercase tracking-widest">Saldo em Caixa (Sistema):</span>
               <span className="text-3xl font-black text-blue-500 tracking-tighter">R$ {calculatedBalance.toFixed(2)}</span>
             </div>
           </div>

           {/* Physical Count & Status */}
           <div className="space-y-8">
              <div className="bg-stone-100 dark:bg-stone-900/50 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-700 shadow-inner">
                <label className="block text-[10px] font-black mb-4 uppercase text-stone-400 tracking-[0.3em] text-center">Dinheiro Físico (Contagem na Gaveta)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 text-2xl font-black">R$</span>
                  <input 
                    type="number" 
                    value={physicalCash}
                    onChange={e => setPhysicalCash(Number(e.target.value))}
                    className={`w-full p-6 pl-16 border-2 rounded-3xl text-4xl font-black bg-white dark:bg-[#0a0a0a] focus:ring-8 outline-none text-center transition-all ${!hasDivergence ? 'border-green-500 focus:ring-green-500/10' : 'border-red-500 focus:ring-red-500/10'}`}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className={`flex items-center justify-between p-6 rounded-[1.5rem] border-2 shadow-xl ${!hasDivergence ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                 <div>
                    <p className="font-black uppercase text-[10px] opacity-60 tracking-widest mb-1">Diferença Encontrada</p>
                    <p className="text-2xl font-black tracking-tighter">
                      R$ {difference.toFixed(2)}
                    </p>
                 </div>
                 <div className="flex flex-col items-center">
                    {!hasDivergence ? <CheckCircle size={36}/> : <AlertTriangle size={36} className="animate-bounce"/>}
                    <span className="text-[9px] font-black uppercase mt-1 tracking-widest">{status}</span>
                 </div>
              </div>
           </div>
        </div>
        
        <div className="bg-stone-50 dark:bg-[#18181b] p-6 flex flex-col md:flex-row justify-between items-center border-t border-stone-200 dark:border-stone-800 gap-4">
           <div className="flex items-center gap-3">
              <History size={18} className="text-stone-500" />
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Atenção: Revise todos os lançamentos antes do fechamento definitivo.</p>
           </div>
           <button 
             onClick={handleCloseCashier}
             className={`flex items-center gap-3 font-black py-4 px-12 rounded-2xl shadow-2xl transition-all active:scale-95 text-white uppercase text-xs tracking-widest ${!hasDivergence ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'}`}
           >
              <Save size={20} /> Encerrar Movimento
           </button>
        </div>
      </div>

    </div>
  );
};

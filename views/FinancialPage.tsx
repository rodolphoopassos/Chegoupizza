import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Trash, Paperclip, 
  ArrowUpCircle, ArrowDownCircle, Loader2,
  X, Search, Sparkles, Brain, Clock, Wallet,
  Receipt, CheckCircle2, FileText, AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast, Toaster } from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";
import { ConfirmModal } from '../components/ConfirmModal';

const formatMoney = (val: any) => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
};

// Helper para renderizar strings de forma segura
const safeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const candidate = val.description || val.nome || val.name || val.title;
    if (candidate && (typeof candidate === 'string' || typeof candidate === 'number')) {
      return String(candidate);
    }
    return ''; 
  }
  return String(val || '');
};

export const FinancialPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- ESTADOS DO FORMULÁRIO ---
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'entry' | 'exit'>('exit');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [searchTerm, setSearchTerm] = useState('');

  // --- ESTADOS DE CONFIRMAÇÃO ---
  const [confirmDelete, setConfirmDelete] = useState<{ id: number | null, isOpen: boolean }>({ id: null, isOpen: false });

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar dados financeiros.");
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const handleAddTransaction = async () => {
    if (!description || !amount) return toast.error("Preencha descrição e valor.");

    const val = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(val)) return toast.error("Valor inválido.");

    const payload = {
      description: safeString(description).toUpperCase(),
      amount: val,
      type: type === 'entry' ? 'income' : 'expense',
      date: date,
      category: type === 'entry' ? 'Receita Extra' : 'Despesa Operacional',
      due_date: dueDate || null,
      payment_method: paymentMethod,
    };

    setLoading(true);
    const { error } = await supabase.from('transactions').insert([payload]);

    if (error) {
      console.error(error);
      toast.error("Erro ao salvar lançamento.");
    } else {
      toast.success(type === 'entry' ? "Entrada registrada!" : "Saída registrada!");
      fetchTransactions();
      setDescription('');
      setAmount('');
      setDueDate('');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    const id = confirmDelete.id;
    if (!id) return;

    setIsDeleting(true);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    
    if (error) {
      console.error(error);
      toast.error("Erro ao remover lançamento.");
    } else {
      toast.success("Lançamento removido com sucesso.");
      setTransactions(transactions.filter(t => t.id !== id));
    }
    
    setIsDeleting(false);
    setConfirmDelete({ id: null, isOpen: false });
  };

  // --- LÓGICA DE SCANNER IA ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Analise este documento financeiro (boleto, fatura ou cupom fiscal).
      Extraia os seguintes campos:
      1. Descrição ou favorecido (description).
      2. Valor total (amount).
      3. Data de vencimento (dueDate no formato YYYY-MM-DD).
      4. Sugestão de método de pagamento (paymentMethod - PIX, Boleto, Cartão ou Dinheiro).

      Retorne APENAS um objeto JSON puro:
      {
        "description": "string",
        "amount": 0.00,
        "dueDate": "YYYY-MM-DD",
        "paymentMethod": "string"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }
        ]
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{.*\}/s);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setDescription(safeString(result.description));
        setAmount(String(result.amount || ''));
        if (result.dueDate) setDueDate(String(result.dueDate));
        if (result.paymentMethod) setPaymentMethod(String(result.paymentMethod));
        
        toast.success("Dados extraídos com sucesso! Revise os campos.", { icon: '✨' });
      }
    } catch (error) {
      console.error("AI Scan Error:", error);
      toast.error("Não foi possível processar o documento automaticamente.");
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  // --- CÁLCULOS DO DASHBOARD ---
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const incoming = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const outgoing = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const dueToday = transactions.filter(t => t.due_date === today && t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    return { incoming, outgoing, balance: incoming - outgoing, dueToday };
  }, [transactions]);

  const filteredTransactions = transactions.filter(t => 
    safeString(t.description).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <Toaster />

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onCancel={() => setConfirmDelete({ id: null, isOpen: false })}
        onConfirm={handleDelete}
        title="Excluir Lançamento"
        message="Tem certeza que deseja remover este lançamento financeiro? Esta ação não pode ser desfeita e afetará seu saldo imediato."
        loading={isDeleting}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-[#161616] p-8 rounded-[2.5rem] border border-stone-800 shadow-2xl flex flex-col justify-center">
           <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">Contas & Vencimentos</h1>
           <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] mt-2">
              Gestão Financeira Avançada e Inteligência AI
           </p>
           <div className="mt-6 flex gap-4">
              <input 
                type="file" 
                ref={scanInputRef} 
                className="hidden" 
                capture="environment"
                accept="image/*,application/pdf"
                onChange={handleScanReceipt}
              />
              <button 
                onClick={() => scanInputRef.current?.click()}
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isScanning ? <Loader2 size={18} className="animate-spin text-blue-200" /> : <Sparkles size={18} className="text-blue-200" />} 
                {isScanning ? 'Analisando Documento...' : 'Scanner IA de Boletos/NF'}
              </button>
           </div>
        </div>

        <div className="bg-[#161616] p-6 rounded-[2.5rem] border border-stone-800 shadow-2xl">
           <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">A Pagar Hoje</p>
           <h4 className="text-3xl font-black text-red-500 tracking-tighter">{formatMoney(stats.dueToday)}</h4>
           <div className="mt-4 flex items-center gap-2 text-stone-600 text-[9px] font-bold uppercase">
              <Clock size={12}/> Vencimentos do dia
           </div>
        </div>

        <div className="bg-[#161616] p-6 rounded-[2.5rem] border border-stone-800 shadow-2xl">
           <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">Saldo em Carteira</p>
           <h4 className={`text-3xl font-black tracking-tighter ${stats.balance >= 0 ? 'text-green-500' : 'text-red-600'}`}>
              {formatMoney(stats.balance)}
           </h4>
           <div className="mt-4 flex items-center gap-2 text-stone-600 text-[9px] font-bold uppercase">
              <Wallet size={12}/> Disponível p/ Operação
           </div>
        </div>
      </div>

      <div className="bg-[#161616] p-10 rounded-[2.5rem] border border-stone-800 shadow-2xl space-y-8">
         <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-3 text-stone-500 text-[10px] font-black uppercase tracking-widest">
               <div className={`w-3 h-3 rounded-full ${type === 'entry' ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div> 
               {type === 'entry' ? 'Registrar Recebimento (Contas a Receber)' : 'Registrar Pagamento (Contas a Pagar)'}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            <div className="md:col-span-4 space-y-2">
               <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Descrição / Favorecido</label>
               <input 
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 placeholder="Ex: Distribuidora de Queijos"
                 className="w-full bg-[#0a0a0a] border border-stone-800 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner"
               />
            </div>

            <div className="md:col-span-2 space-y-2">
               <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Valor Bruto</label>
               <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-sm font-black">R$</span>
                 <input 
                   type="text"
                   value={amount}
                   onChange={e => setAmount(e.target.value)}
                   placeholder="0,00"
                   className="w-full bg-[#0a0a0a] border border-stone-800 rounded-2xl p-4 pl-10 text-sm font-black text-white outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner"
                 />
               </div>
            </div>

            <div className="md:col-span-3 space-y-2">
               <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Vencimento</label>
               <input 
                 type="date"
                 value={dueDate}
                 onChange={e => setDueDate(e.target.value)}
                 className="w-full bg-[#0a0a0a] border border-stone-800 rounded-2xl p-4 text-xs font-black text-stone-300 outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner"
               />
            </div>

            <div className="md:col-span-3 space-y-2">
               <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Método de Pagto</label>
               <select 
                 value={paymentMethod}
                 onChange={e => setPaymentMethod(e.target.value)}
                 className="w-full bg-[#0a0a0a] border border-stone-800 rounded-2xl p-4 text-xs font-black text-stone-300 outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner appearance-none"
               >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Boleto">Boleto Bancário</option>
               </select>
            </div>

            <div className="md:col-span-12 lg:col-span-4 flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-stone-800 h-[64px]">
               <button 
                 onClick={() => setType('entry')}
                 className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${type === 'entry' ? 'bg-white text-stone-900 shadow-xl' : 'text-stone-500 hover:text-stone-300'}`}
               >
                 <ArrowUpCircle size={18} className={type === 'entry' ? 'text-green-600' : ''}/> Entrada
               </button>
               <button 
                 onClick={() => setType('exit')}
                 className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${type === 'exit' ? 'bg-white text-stone-900 shadow-xl' : 'text-stone-500 hover:text-stone-300'}`}
               >
                 <ArrowDownCircle size={18} className={type === 'exit' ? 'text-red-600' : ''}/> Saída
               </button>
            </div>

            <div className="md:col-span-12 lg:col-span-8 flex gap-3 h-[64px]">
               <button className="px-6 bg-[#0a0a0a] border border-stone-800 rounded-2xl text-stone-600 hover:text-white transition-all shadow-inner"><Paperclip size={20}/></button>
               <button 
                 onClick={handleAddTransaction}
                 disabled={loading || isScanning}
                 className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-red-900/20 active:scale-95 disabled:opacity-50"
               >
                 {loading ? <Loader2 size={20} className="animate-spin mx-auto"/> : 'Confirmar Lançamento'}
               </button>
            </div>
         </div>
      </div>

      <div className="bg-[#121212] rounded-[2.5rem] border border-stone-800 shadow-2xl flex flex-col overflow-hidden">
         <div className="p-8 border-b border-stone-800 bg-stone-900/20 flex flex-col md:flex-row justify-between items-center gap-6">
            <h3 className="text-[11px] font-black text-stone-500 uppercase tracking-[0.2em]">Fluxo de Caixa Consolidado</h3>
            
            <div className="relative w-full md:w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600" size={16}/>
               <input 
                 placeholder="Pesquisar histórico..."
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="w-full bg-[#1a1a1a] border border-stone-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-red-600"
               />
            </div>
         </div>

         <div className="flex-1 overflow-x-auto custom-scrollbar-h">
            {loading && transactions.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                  <Loader2 className="animate-spin text-stone-700" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Registros...</p>
               </div>
            ) : (
               <table className="w-full text-left">
                  <thead className="bg-[#1a1a1a] text-[9px] font-black uppercase text-stone-600 tracking-[0.2em]">
                     <tr>
                        <th className="p-6">Data</th>
                        <th className="p-6">Descrição</th>
                        <th className="p-6">Vencimento</th>
                        <th className="p-6">Método</th>
                        <th className="p-6 text-right">Valor</th>
                        <th className="p-6 w-20"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/50">
                     {filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-white/5 transition-all group">
                           <td className="p-6 text-xs font-bold text-stone-500 whitespace-nowrap font-mono">
                              {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '---'}
                           </td>
                           <td className="p-6">
                              <span className="font-black text-xs text-white uppercase tracking-tight group-hover:text-red-500 transition-colors">
                                 {safeString(t.description)}
                              </span>
                           </td>
                           <td className="p-6">
                              {t.due_date ? (
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${new Date(t.due_date) < new Date() ? 'bg-red-950 text-red-500' : 'bg-stone-900 text-stone-500'}`}>
                                  {new Date(t.due_date).toLocaleDateString('pt-BR')}
                                </span>
                              ) : <span className="text-[10px] text-stone-700 font-black uppercase">À Vista</span>}
                           </td>
                           <td className="p-6">
                              <span className="inline-flex items-center gap-2 text-[8px] font-black text-stone-400 uppercase bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full">
                                 {safeString(t.payment_method || 'PIX')}
                              </span>
                           </td>
                           <td className={`p-6 text-right font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'income' ? '+' : '-'} {formatMoney(t.amount)}
                           </td>
                           <td className="p-6 text-right">
                              <button 
                                onClick={() => setConfirmDelete({ id: t.id, isOpen: true })} 
                                className="p-2 text-stone-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                              >
                                 <Trash size={16}/>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
    </div>
  );
};
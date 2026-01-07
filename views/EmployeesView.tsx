import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Clock, DollarSign, FileText, 
  Save, Trash, Edit, Check, AlertCircle, Send, Calendar, Loader2, X, Pencil
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

// Formatador de Moeda
const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para evitar erro [object Object]
const safeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  
  if (typeof val === 'object') {
    const candidate = val.nome || val.name || val.description || val.label || val.title;
    if (candidate && (typeof candidate === 'string' || typeof candidate === 'number')) {
        return String(candidate);
    }
    return ''; 
  }
  return String(val);
};

export const EmployeesView: React.FC<{ user: any; onAddTransaction?: any }> = ({ user, onAddTransaction }) => {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'horas' | 'folha'>('cadastro');
  const [employees, setEmployees] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]); // Dados do mês (extras, dias, etc)
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Estado para Edição e Exclusão
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number | null, isOpen: boolean }>({ id: null, isOpen: false });

  // Data de Referência (Mês/Ano)
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthRef = currentDate.toISOString().slice(0, 7); // "2026-01"

  // Estado Formulário Novo Funcionário
  const [newEmp, setNewEmp] = useState({ 
    nome: '', cargo: '', regime: 'Mensalista', salario_base: '', comissao_pct: '' 
  });

  useEffect(() => {
    fetchData();
  }, [user, monthRef]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    // 1. Busca Funcionários
    const { data: empData } = await supabase.from('funcionarios').select('*').order('nome');
    if (empData) setEmployees(empData);

    // 2. Busca Eventos do Mês (Extras, Dias trabalhados...)
    const { data: evtData } = await supabase
      .from('folha_eventos')
      .select('*')
      .eq('mes_ref', monthRef);
    if (evtData) setEvents(evtData);
    
    setLoading(false);
  };

  // --- LÓGICA DE CADASTRO ---
  const handleSaveEmployee = async () => {
    if (!newEmp.nome || !newEmp.salario_base) return toast.error("Preencha nome e salário");

    const payload = {
      nome: safeString(newEmp.nome),
      cargo: safeString(newEmp.cargo || 'Funcionario'),
      regime: newEmp.regime,
      salario_base: parseFloat(newEmp.salario_base.replace(',', '.')) || 0,
      comissao_pct: parseFloat(newEmp.comissao_pct.replace(',', '.')) || 0,
      ativo: true
    };

    const { error } = await supabase.from('funcionarios').insert([payload]);
    if (!error) {
      toast.success("Funcionário Cadastrado!");
      setNewEmp({ nome: '', cargo: '', regime: 'Mensalista', salario_base: '', comissao_pct: '' });
      fetchData();
    } else {
      toast.error("Erro ao cadastrar");
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmp) return;
    if (!editingEmp.nome || editingEmp.salario_base === undefined) return toast.error("Dados inválidos");

    const payload = {
      nome: safeString(editingEmp.nome),
      cargo: safeString(editingEmp.cargo),
      regime: editingEmp.regime,
      salario_base: typeof editingEmp.salario_base === 'string' 
        ? parseFloat(editingEmp.salario_base.replace(',', '.')) 
        : editingEmp.salario_base,
      comissao_pct: typeof editingEmp.comissao_pct === 'string'
        ? parseFloat(editingEmp.comissao_pct.replace(',', '.'))
        : editingEmp.comissao_pct,
    };

    const { error } = await supabase.from('funcionarios').update(payload).eq('id', editingEmp.id);
    
    if (!error) {
      toast.success("Cadastro Atualizado!");
      setEditingEmp(null);
      fetchData();
    } else {
      toast.error("Erro ao atualizar");
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('funcionarios').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      
      toast.success("Funcionário removido!");
      setEmployees(prev => prev.filter(e => e.id !== confirmDelete.id));
    } catch (err) {
      toast.error("Erro ao excluir funcionário");
    } finally {
      setIsActionLoading(false);
      setConfirmDelete({ id: null, isOpen: false });
    }
  };

  // --- LÓGICA DE EVENTOS (Controle de Horas/Extras) ---
  const handleUpdateEvent = async (empId: number, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    // Verifica se já existe registro desse funcionário neste mês
    const existingEvent = events.find(e => e.funcionario_id === empId);

    if (existingEvent) {
      // Atualiza
      const { error } = await supabase
        .from('folha_eventos')
        .update({ [field]: numValue })
        .eq('id', existingEvent.id);
      
      if (!error) {
         setEvents(events.map(e => e.id === existingEvent.id ? { ...e, [field]: numValue } : e));
      }
    } else {
      // Cria Novo
      const { data, error } = await supabase
        .from('folha_eventos')
        .insert([{ 
           funcionario_id: empId, 
           mes_ref: monthRef,
           [field]: numValue 
        }])
        .select();

      if (!error && data) {
         setEvents([...events, data[0]]);
      }
    }
  };

  // --- CÁLCULO DA FOLHA ---
  const calculatePayroll = (emp: any) => {
    const evt = events.find(e => e.funcionario_id === emp.id) || {};
    
    const diasTrab = evt.dias_trabalhados || 0;
    const extras = evt.valor_extras || 0;
    const bonus = evt.valor_bonus || 0;
    const descontos = evt.valor_descontos || 0;
    const comissoes = evt.valor_comissoes || 0;

    let proventosBase = 0;

    if (emp.regime === 'Diarista') {
       proventosBase = (Number(emp.salario_base) || 0) * diasTrab; 
    } else {
       proventosBase = Number(emp.salario_base) || 0;
    }

    const totalBruto = proventosBase + extras + bonus + comissoes;
    const totalLiquido = totalBruto - descontos;

    return { proventosBase, extras, bonus, comissoes, descontos, totalBruto, totalLiquido };
  };

  const handleLaunchFinance = async () => {
    const totalCost = employees.reduce((acc, emp) => acc + calculatePayroll(emp).totalLiquido, 0);
    if (totalCost <= 0) return toast.error("Valor total zerado.");

    // Mantendo o confirm aqui conforme solicitado para mexer apenas na rotina de delete
    if (!window.confirm(`Lançar folha de ${formatMoney(totalCost)} no financeiro?`)) return;

    if (onAddTransaction) {
      await onAddTransaction(
        `Folha de Pagamento: ${monthRef}`,
        totalCost,
        'expense',
        'Recursos Humanos',
        new Date().toISOString().split('T')[0]
      );
      toast.success("Folha lançada com sucesso!");
    } else {
        const { error } = await supabase.from('transactions').insert([{
        description: `Folha de Pagamento: ${monthRef}`,
        amount: totalCost, 
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: 'Recursos Humanos',
        payment_method: 'PIX',
        }]);

        if (!error) toast.success("Folha lançada com sucesso!");
        else toast.error("Erro ao lançar");
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40}/>
        <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Carregando Módulo de RH...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full font-sans text-white flex-col gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onCancel={() => setConfirmDelete({ id: null, isOpen: false })}
        onConfirm={executeDelete}
        loading={isActionLoading}
        title="Excluir Colaborador"
        message="Tem certeza que deseja remover este funcionário? Os dados históricos de folha não serão apagados, mas ele não aparecerá mais nas listas ativas."
      />

      {/* MODAL DE EDIÇÃO */}
      {editingEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#161616] w-full max-w-2xl rounded-[3rem] border border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white/20 rounded-2xl"><Edit size={24}/></div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Editar Cadastro</h3>
                      <p className="text-xs font-bold text-white/70 uppercase">Alterando dados de {safeString(editingEmp.nome)}</p>
                   </div>
                </div>
                <button onClick={() => setEditingEmp(null)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X/></button>
             </div>

             <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Nome Completo</label>
                      <input 
                        value={editingEmp.nome} 
                        onChange={e => setEditingEmp({...editingEmp, nome: e.target.value})}
                        className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600"
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Cargo</label>
                      <input 
                        value={editingEmp.cargo} 
                        onChange={e => setEditingEmp({...editingEmp, cargo: e.target.value})}
                        className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Regime</label>
                      <select 
                        value={editingEmp.regime} 
                        onChange={e => setEditingEmp({...editingEmp, regime: e.target.value})}
                        className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none"
                      >
                         <option value="Mensalista">Mensalista</option>
                         <option value="Diarista">Diarista</option>
                      </select>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Salário / Diária (R$)</label>
                      <input 
                        type="text" 
                        value={editingEmp.salario_base} 
                        onChange={e => setEditingEmp({...editingEmp, salario_base: e.target.value})}
                        className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600"
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">% Comissão</label>
                      <input 
                        type="text" 
                        value={editingEmp.comissao_pct} 
                        onChange={e => setEditingEmp({...editingEmp, comissao_pct: e.target.value})}
                        className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600"
                      />
                   </div>
                </div>

                <div className="flex gap-4 pt-6">
                   <button 
                     onClick={() => setEditingEmp(null)} 
                     className="flex-1 px-8 py-5 rounded-2xl font-black text-stone-500 uppercase text-[10px] tracking-widest hover:bg-stone-900 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleUpdateEmployee} 
                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
                   >
                      <Check size={18}/> Salvar Alterações
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#161616] p-6 rounded-3xl border border-stone-800 gap-4">
         <div>
            <h1 className="text-2xl font-black uppercase flex items-center gap-2 text-blue-500 tracking-tight">
               <Users /> Gestão de Pessoal
            </h1>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Controle de Equipe e Performance</p>
         </div>
         <div className="flex items-center gap-2 bg-[#0f0f0f] px-4 py-3 rounded-xl border border-stone-800">
            <Calendar size={16} className="text-stone-500"/>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Referência:</span>
            <input 
              type="month" 
              value={monthRef}
              onChange={e => setCurrentDate(new Date(e.target.value + '-01'))}
              className="bg-transparent text-white font-bold outline-none text-xs uppercase cursor-pointer"
            />
         </div>
      </div>

      {/* MENU DE ABAS */}
      <div className="flex flex-wrap gap-2 bg-[#161616] p-1.5 rounded-xl border border-stone-800 w-fit">
         <button onClick={() => setActiveTab('cadastro')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'cadastro' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-white'}`}>
            <UserPlus size={14}/> Cadastro
         </button>
         <button onClick={() => setActiveTab('horas')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'horas' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-white'}`}>
            <Clock size={14}/> Controle de Horas
         </button>
         <button onClick={() => setActiveTab('folha')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'folha' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-stone-500 hover:text-white'}`}>
            <DollarSign size={14}/> Folha Mensal
         </button>
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 overflow-hidden flex flex-col">

         {/* ABA 1: CADASTRO */}
         {activeTab === 'cadastro' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* Formulário */}
              <div className="bg-[#161616] p-8 rounded-[2rem] border border-stone-800 shadow-xl">
                 <h3 className="text-xs font-black uppercase text-blue-500 mb-6 flex items-center gap-2 tracking-[0.2em]"><UserPlus size={16}/> Novo Colaborador</h3>
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-4">
                       <label className="text-[9px] font-black uppercase text-stone-500 tracking-widest ml-1">Nome Completo</label>
                       <input value={newEmp.nome} onChange={e=>setNewEmp({...newEmp, nome: e.target.value})} className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600 transition-all" placeholder="Ex: João Silva"/>
                    </div>
                    <div className="md:col-span-3">
                       <label className="text-[9px] font-black uppercase text-stone-500 tracking-widest ml-1">Cargo</label>
                       <input value={newEmp.cargo} onChange={e=>setNewEmp({...newEmp, cargo: e.target.value})} className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600 transition-all" placeholder="Ex: Atendente"/>
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-[9px] font-black uppercase text-stone-500 tracking-widest ml-1">Regime</label>
                       <select value={newEmp.regime} onChange={e=>setNewEmp({...newEmp, regime: e.target.value})} className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none">
                          <option value="Mensalista">Mensalista</option>
                          <option value="Diarista">Diarista</option>
                       </select>
                    </div>
                    <div className="md:col-span-3">
                       <button onClick={handleSaveEmployee} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95">Cadastrar Membro</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                    <div className="md:col-span-3">
                       <label className="text-[9px] font-black uppercase text-stone-500 tracking-widest ml-1">Salário / Diária (R$)</label>
                       <input type="text" value={newEmp.salario_base} onChange={e=>setNewEmp({...newEmp, salario_base: e.target.value})} className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600" placeholder="0,00"/>
                    </div>
                    <div className="md:col-span-3">
                       <label className="text-[9px] font-black uppercase text-stone-500 tracking-widest ml-1">% Comissão (Média)</label>
                       <input type="text" value={newEmp.comissao_pct} onChange={e=>setNewEmp({...newEmp, comissao_pct: e.target.value})} className="w-full bg-[#0f0f0f] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600" placeholder="0"/>
                    </div>
                 </div>
              </div>

              {/* Lista */}
              <div className="bg-[#161616] rounded-[2.5rem] border border-stone-800 overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[#111] text-[9px] font-black uppercase text-stone-600 tracking-[0.2em]">
                          <tr>
                             <th className="p-6">Nome do Colaborador</th>
                             <th className="p-6">Função</th>
                             <th className="p-6">Contrato</th>
                             <th className="p-6 text-right">Base</th>
                             <th className="p-6 text-center">Status</th>
                             <th className="p-6 text-right pr-10">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-stone-800/50">
                          {employees.map(emp => (
                             <tr key={emp.id} className="hover:bg-[#1f1f1f] group transition-colors">
                                <td className="p-6">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-[10px] font-black text-stone-500 uppercase">{safeString(emp.nome).substring(0,2)}</div>
                                      <span className="text-sm font-black text-white uppercase tracking-tight">{safeString(emp.nome)}</span>
                                   </div>
                                </td>
                                <td className="p-6 text-xs text-stone-400 font-bold uppercase tracking-widest">{safeString(emp.cargo)}</td>
                                <td className="p-6"><span className="bg-stone-900 border border-stone-800 px-3 py-1 rounded-full text-[9px] uppercase font-black text-stone-500">{emp.regime}</span></td>
                                <td className="p-6 text-right text-xs font-black text-blue-400">{formatMoney(emp.salario_base || 0)}</td>
                                <td className="p-6 text-center"><span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[9px] uppercase font-black border border-green-500/20">Ativo</span></td>
                                <td className="p-6 text-right pr-10">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => setEditingEmp(emp)} 
                                        className="p-2 text-stone-500 hover:text-blue-500 transition-colors"
                                        title="Editar Cadastro"
                                      >
                                        <Pencil size={16}/>
                                      </button>
                                      <button 
                                        onClick={() => setConfirmDelete({ id: emp.id, isOpen: true })} 
                                        className="p-2 text-stone-500 hover:text-red-500 transition-colors"
                                        title="Excluir Colaborador"
                                      >
                                        <Trash size={16}/>
                                      </button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
         )}

         {/* ABA 2: CONTROLE DE HORAS */}
         {activeTab === 'horas' && (
            <div className="bg-[#161616] rounded-[2.5rem] border border-stone-800 overflow-hidden flex flex-col h-full shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-blue-600 p-6 flex justify-between items-center shadow-lg">
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-3"><Edit size={18}/> Lançamento de Performance Mensal</h3>
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
                     <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                     <span className="text-[9px] font-black text-white uppercase tracking-widest">Sincronização Ativa</span>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                     <thead className="bg-[#111] text-[9px] font-black uppercase text-stone-600 tracking-[0.2em] sticky top-0 z-10 border-b border-stone-800">
                        <tr>
                           <th className="p-6">Colaborador</th>
                           <th className="p-6 w-32 text-center">Dias Trab.</th>
                           <th className="p-6 w-32 text-center">Base Calc.</th>
                           <th className="p-6 w-32 text-center">Extras (R$)</th>
                           <th className="p-6 w-32 text-center">Bônus (R$)</th>
                           <th className="p-6 w-32 text-center">Descontos</th>
                           <th className="p-6 text-right pr-10">Líquido Previsto</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-stone-800/50">
                        {employees.map(emp => {
                           const evt = events.find(e => e.funcionario_id === emp.id) || {};
                           const calcs = calculatePayroll(emp);
                           
                           return (
                              <tr key={emp.id} className="hover:bg-[#1f1f1f] transition-colors">
                                 <td className="p-6">
                                    <div className="flex flex-col">
                                       <span className="text-sm font-black text-white uppercase tracking-tight">{safeString(emp.nome)}</span>
                                       <span className="text-[9px] font-black text-stone-600 uppercase mt-0.5 tracking-widest">{emp.regime}</span>
                                    </div>
                                 </td>
                                 <td className="p-6">
                                    <input 
                                      type="text" 
                                      className="w-full bg-[#0a0a0a] border border-stone-800 rounded-xl p-3 text-center text-xs font-black text-white outline-none focus:ring-1 focus:ring-blue-600 shadow-inner"
                                      value={evt.dias_trabalhados || ''}
                                      onChange={(e) => handleUpdateEvent(emp.id, 'dias_trabalhados', e.target.value)}
                                      placeholder="0"
                                    />
                                 </td>
                                 <td className="p-6 text-center">
                                    <span className="text-[11px] font-black text-stone-400">
                                       {formatMoney(calcs.proventosBase)}
                                    </span>
                                 </td>
                                 <td className="p-6">
                                    <input 
                                      type="text" 
                                      className="w-full bg-[#0a0a0a] border border-stone-800 rounded-xl p-3 text-center text-xs font-black text-white outline-none focus:ring-1 focus:ring-blue-600 shadow-inner"
                                      value={evt.valor_extras || ''}
                                      onChange={(e) => handleUpdateEvent(emp.id, 'valor_extras', e.target.value)}
                                      placeholder="0.00"
                                    />
                                 </td>
                                 <td className="p-6">
                                    <input 
                                      type="text" 
                                      className="w-full bg-[#0a0a0a] border border-stone-800 rounded-xl p-3 text-center text-xs font-black text-white outline-none focus:ring-1 focus:ring-blue-600 shadow-inner"
                                      value={evt.valor_bonus || ''}
                                      onChange={(e) => handleUpdateEvent(emp.id, 'valor_bonus', e.target.value)}
                                      placeholder="0.00"
                                    />
                                 </td>
                                 <td className="p-6">
                                    <input 
                                      type="text" 
                                      className="w-full bg-[#0a0a0a] border border-stone-800 rounded-xl p-3 text-center text-xs font-black text-red-500 outline-none focus:ring-1 focus:ring-red-600 shadow-inner"
                                      value={evt.valor_descontos || ''}
                                      onChange={(e) => handleUpdateEvent(emp.id, 'valor_descontos', e.target.value)}
                                      placeholder="0.00"
                                    />
                                 </td>
                                 <td className="p-6 text-right pr-10 font-black text-green-500 text-sm">
                                    {formatMoney(calcs.totalLiquido)}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* ABA 3: FOLHA DE PAGAMENTO (RESUMO) */}
         {activeTab === 'folha' && (
            <div className="flex flex-col h-full gap-8 animate-in slide-in-from-bottom-4 duration-500">
               
               {/* Tabela de Cálculo */}
               <div className="bg-[#161616] rounded-[2.5rem] border border-stone-800 overflow-hidden flex-1 shadow-2xl flex flex-col">
                  <div className="bg-stone-900 p-6 flex justify-between items-center border-b border-stone-800">
                     <h3 className="text-sm font-black uppercase text-white flex items-center gap-3">
                        <FileText className="text-green-500" size={18}/> Consolidado da Folha
                     </h3>
                     <span className="bg-green-600/10 border border-green-500/20 px-4 py-1.5 rounded-full text-[10px] font-black text-green-500 uppercase tracking-widest">
                        {new Date(currentDate).toLocaleString('pt-BR', {month:'long', year:'numeric'})}
                     </span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                     <table className="w-full text-left">
                        <thead className="bg-[#111] text-[9px] font-black uppercase text-stone-600 tracking-[0.2em] border-b border-stone-800">
                           <tr>
                              <th className="p-6">Nome</th>
                              <th className="p-6 text-right">Base</th>
                              <th className="p-6 text-right">Extras</th>
                              <th className="p-6 text-right">Comissões</th>
                              <th className="p-6 text-right">Bônus</th>
                              <th className="p-6 text-right text-stone-200">Total Bruto</th>
                              <th className="p-6 text-right text-red-500">Descontos</th>
                              <th className="p-6 text-right pr-10 text-green-500">Líquido</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/50">
                           {employees.map(emp => {
                              const calc = calculatePayroll(emp);
                              return (
                                 <tr key={emp.id} className="hover:bg-[#1f1f1f] transition-colors">
                                    <td className="p-6">
                                       <div className="flex flex-col">
                                          <span className="text-sm font-black text-white uppercase tracking-tight">{safeString(emp.nome)}</span>
                                          <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">{emp.regime}</span>
                                       </div>
                                    </td>
                                    <td className="p-6 text-right text-xs font-bold text-stone-400">{formatMoney(calc.proventosBase)}</td>
                                    <td className="p-6 text-right text-xs text-stone-500">{formatMoney(calc.extras)}</td>
                                    <td className="p-6 text-right text-xs text-stone-500">{formatMoney(calc.comissoes)}</td>
                                    <td className="p-6 text-right text-xs text-stone-500">{formatMoney(calc.bonus)}</td>
                                    <td className="p-6 text-right text-xs font-black text-white">{formatMoney(calc.totalBruto)}</td>
                                    <td className="p-6 text-right"><span className="text-[10px] font-black text-red-500">{formatMoney(calc.descontos)}</span></td>
                                    <td className="p-6 text-right pr-10 text-sm font-black text-green-500">{formatMoney(calc.totalLiquido)}</td>
                                 </tr>
                              );
                           })}
                        </tbody>
                        <tfoot className="bg-[#0a0a0a] border-t border-stone-700">
                           <tr className="font-black">
                              <td className="p-8 text-[11px] uppercase tracking-widest text-stone-500">Subtotais do Mês</td>
                              <td className="p-8 text-right text-xs text-stone-500">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).proventosBase,0))}</td>
                              <td className="p-8 text-right text-xs text-stone-500">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).extras,0))}</td>
                              <td colSpan={2}></td>
                              <td className="p-8 text-right text-sm text-white">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).totalBruto,0))}</td>
                              <td className="p-8 text-right text-sm text-red-600">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).descontos,0))}</td>
                              <td className="p-8 text-right pr-10 text-2xl text-green-500 tracking-tighter">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).totalLiquido,0))}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>

               {/* Painel Inferior */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#161616] p-10 rounded-[3rem] border border-stone-800 border-l-8 border-l-amber-600 shadow-2xl flex flex-col justify-center">
                     <h4 className="text-[10px] font-black uppercase text-amber-500 mb-6 tracking-[0.2em] flex items-center gap-2">
                        <AlertCircle size={14}/> Custo Operacional Projetado
                     </h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-widest">
                           <span>Total Proventos:</span>
                           <span className="text-white">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).totalBruto,0))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-widest">
                           <span>Encargos Sociais (Est.):</span>
                           <span className="text-red-500">R$ 0,00</span>
                        </div>
                        <div className="h-px bg-stone-800 my-2"></div>
                        <div className="flex justify-between items-end">
                           <span className="text-sm font-black uppercase text-stone-200 tracking-tight">Investimento em Equipe:</span>
                           <span className="text-3xl font-black text-white tracking-tighter">{formatMoney(employees.reduce((acc,e)=>acc+calculatePayroll(e).totalBruto,0))}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#161616] p-10 rounded-[3rem] border border-stone-800 shadow-2xl flex flex-col justify-between">
                     <div className="space-y-4">
                        <h4 className="text-sm font-black uppercase text-blue-500 flex items-center gap-3">
                           <Send size={20}/> Integração Financeira
                        </h4>
                        <p className="text-xs text-stone-500 font-bold leading-relaxed uppercase tracking-tight">
                           Ao confirmar, o sistema gerará um lançamento de saída automática no seu fluxo de caixa para este mês de referência.
                        </p>
                     </div>
                     <button 
                       onClick={handleLaunchFinance}
                       className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] text-xs uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-900/40 active:scale-95 mt-8"
                     >
                        CONSOLIDAR E LANÇAR NO FLUXO
                     </button>
                  </div>
               </div>

            </div>
         )}

      </div>
    </div>
  );
};
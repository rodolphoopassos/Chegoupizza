
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, MapPin, Navigation, Clock, CheckCircle2, 
  Plus, X, Search, Loader2, Sparkles, AlertCircle,
  Map, ChevronRight, ListChecks, DollarSign
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";

interface Order {
  id: number;
  cliente_nome: string;
  cliente_endereco?: string;
  valor_total: number;
  data_pedido: string;
  status: string;
  taxa_entrega?: number;
  forma_pagamento?: string;
}

export const DeliveryPage: React.FC<{ user: any }> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [batch, setBatch] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReadyOrders();
    const channel = supabase.channel('delivery-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchReadyOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchReadyOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('status', 'Pronto') // Only orders ready to leave
        .order('data_pedido', { ascending: true });
      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToBatch = (order: Order) => {
    if (batch.find(o => o.id === order.id)) return;
    setBatch([...batch, order]);
  };

  const removeFromBatch = (id: number) => {
    setBatch(batch.filter(o => o.id !== id));
  };

  const optimizeRoute = async () => {
    if (batch.length < 2) return toast.error("Adicione ao menos 2 pedidos para otimizar.");
    setIsOptimizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Considere os seguintes endereços de entrega para uma pizzaria: ${batch.map((o, i) => `${i+1}. ${o.cliente_endereco}`).join('; ')}. 
      Sugira a ordem mais lógica de entrega (sequência de 1 a ${batch.length}) para economizar tempo/combustível. 
      Retorne apenas o array de números da sequência sugerida como JSON [2, 1, 3...].`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const match = response.text.match(/\[.*\]/);
      if (match) {
        const sequence = JSON.parse(match[0]);
        const optimized = sequence.map((idx: number) => batch[idx - 1]);
        setBatch(optimized);
        toast.success("Rota otimizada pela IA! 🚀");
      }
    } catch (e) {
      toast.error("Erro na otimização AI.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const dispatchBatch = async () => {
    if (batch.length === 0) return;
    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'Saindo' })
      .in('id', batch.map(o => o.id));

    if (!error) {
      toast.success(`${batch.length} pedidos despachados!`);
      setBatch([]);
      fetchReadyOrders();
    }
  };

  const openInMaps = () => {
    if (batch.length === 0) return;
    const waypoints = batch.map(o => encodeURIComponent(o.cliente_endereco || '')).join('/');
    window.open(`https://www.google.com/maps/dir/Sede/${waypoints}`, '_blank');
  };

  const filteredOrders = orders.filter(o => 
    o.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.cliente_endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const batchTotal = batch.reduce((acc, o) => acc + o.valor_total, 0);
  const batchFees = batch.reduce((acc, o) => acc + (o.taxa_entrega || 0), 0);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-stone-900/50 p-6 rounded-[2.5rem] border border-stone-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/20">
            <Truck size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Console de Logística</h2>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Organize rotas e otimize entregas</p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input 
            placeholder="Buscar endereços..."
            className="w-full bg-stone-900 border border-stone-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* FILA DE PEDIDOS PRONTOS */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={16} className="text-orange-500" /> Aguardando Coleta ({filteredOrders.length})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-stone-700" size={32} /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-stone-900/20 rounded-[2rem] border border-dashed border-stone-800">
                <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">Nenhum pedido pronto para entrega</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => addToBatch(order)}
                  className={`group bg-[#161616] p-5 rounded-[2rem] border border-stone-800 hover:border-blue-600 transition-all cursor-pointer flex items-center justify-between ${batch.find(o => o.id === order.id) ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center text-stone-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-white uppercase truncate max-w-[180px]">{order.cliente_nome}</h4>
                      <p className="text-[10px] text-stone-500 font-bold uppercase truncate max-w-[200px] mt-1">{order.cliente_endereco}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-green-500">R$ {order.valor_total.toFixed(2)}</p>
                    <p className="text-[9px] text-stone-600 font-bold uppercase mt-1">Pedido #{order.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ROTA ATUAL / BATCH BUILDER */}
        <div className="w-full lg:w-[420px] bg-stone-900/40 rounded-[3rem] border border-stone-800 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-8 bg-stone-900 border-b border-stone-800 flex justify-between items-center">
            <h3 className="font-black text-sm text-white uppercase tracking-tight flex items-center gap-2">
              <ListChecks className="text-blue-500" size={20} /> Montar Rota
            </h3>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">{batch.length}</span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {batch.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <Navigation size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Selecione pedidos à esquerda para criar uma rota</p>
              </div>
            ) : (
              batch.map((order, idx) => (
                <div key={order.id} className="relative flex items-start gap-4 animate-in slide-in-from-right duration-300 group">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white z-10 shadow-lg">
                      {idx + 1}
                    </div>
                    {idx < batch.length - 1 && <div className="w-0.5 h-12 bg-stone-800"></div>}
                  </div>
                  <div className="flex-1 bg-stone-900 border border-stone-800 p-4 rounded-2xl relative group-hover:border-stone-700 transition-all">
                    <button 
                      onClick={() => removeFromBatch(order.id)}
                      className="absolute -top-2 -right-2 bg-stone-800 text-stone-500 hover:text-red-500 p-1 rounded-full border border-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <h5 className="text-[11px] font-black text-stone-300 uppercase truncate">{order.cliente_nome}</h5>
                    <p className="text-[9px] text-stone-600 font-bold uppercase mt-1 truncate">{order.cliente_endereco}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] font-black text-stone-700 uppercase">Faturamento: R$ {order.valor_total.toFixed(2)}</span>
                      <span className="text-[9px] font-black text-blue-500 uppercase">Taxa: R$ {order.taxa_entrega?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-8 bg-stone-950 border-t border-stone-800 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase text-stone-500 tracking-widest">
                <span>Total a Receber</span>
                <span className="text-white">R$ {batchTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase text-stone-500 tracking-widest">
                <span>Taxas Motoboy</span>
                <span className="text-blue-500">R$ {batchFees.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={optimizeRoute}
                disabled={isOptimizing || batch.length < 2}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
              >
                {isOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-blue-500" />}
                Otimizar IA
              </button>
              <button 
                onClick={openInMaps}
                disabled={batch.length === 0}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
              >
                <Map size={16} className="text-green-500" />
                Google Maps
              </button>
            </div>

            <button 
              onClick={dispatchBatch}
              disabled={batch.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50 uppercase text-[11px] tracking-widest"
            >
              <CheckCircle2 size={20} strokeWidth={3} />
              Despachar Rota Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

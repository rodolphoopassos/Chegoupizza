import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  ShoppingBag, 
  Truck, 
  DollarSign, 
  Bike, 
  CheckCircle, 
  Loader2, 
  Search, 
  Plus, 
  X, 
  ChefHat,
  MapPin,
  Printer,
  ChevronRight,
  AlertCircle,
  Bell,
  Volume2,
  Trash2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { printOrder } from '../../utils/printHelper';
import { NewOrderModal } from './NewOrderModal';
import { toast } from 'react-hot-toast';

interface OrderItem {
  produto: string;
  qtd: number;
  amount?: number;
  detalhes?: string;
}

interface Order {
  id: number;
  data_pedido: string;
  cliente_nome: string;
  cliente_endereco?: string;
  cliente_telefone?: string;
  itens_pedido: OrderItem[];
  valor_total: number;
  status: string;
  forma_pagamento?: string;
  taxa_entrega?: number;
}

const STATUS_FLOW = [
  { id: 'Novo', label: 'Entrada', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertCircle size={16}/> },
  { id: 'Preparando', label: 'Cozinha', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <ChefHat size={16}/> },
  { id: 'Pronto', label: 'Expedição', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <ShoppingBag size={16}/> },
  { id: 'Saindo', label: 'Entrega', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: <Bike size={16}/> },
  { id: 'Entregue', label: 'Concluído', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: <CheckCircle size={16}/> }
];

export const OrdersPage: React.FC<{ user: any; onAddTransaction?: any }> = ({ user, onAddTransaction }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchOrders();
    
    const channel = supabase
      .channel('realtime-orders-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (payload) => {
        handleNewOrder(payload.new as Order);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .neq('status', 'Cancelado')
        .order('data_pedido', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deductStockFromOrder = async (order: Order) => {
    try {
      for (const item of order.itens_pedido) {
        const { data: menuData } = await supabase
          .from('cardapio')
          .select('ingredientes')
          .eq('nome', item.produto)
          .single();

        if (menuData?.ingredientes && Array.isArray(menuData.ingredientes)) {
          for (const ing of menuData.ingredientes) {
            const totalToDeduct = Number(ing.quantity) * Number(item.qtd);
            
            const { data: stockData } = await supabase
              .from('stock')
              .select('stock_quantity, name')
              .eq('id', ing.stockId)
              .single();

            if (stockData) {
              const newQty = Math.max(0, stockData.stock_quantity - totalToDeduct);
              await supabase
                .from('stock')
                .update({ stock_quantity: newQty })
                .eq('id', ing.stockId);
            }
          }
        }
      }
      toast.success('Insumos baixados do estoque!');
    } catch (e) {
      console.error('Erro na baixa de estoque:', e);
    }
  };

  const handleNewOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-stone-900 shadow-2xl rounded-3xl pointer-events-auto flex ring-1 ring-red-500 border border-stone-800 p-4`}>
        <div className="flex-1 w-0 p-2">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl text-white animate-bounce">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-tighter">Novo Pedido Recebido!</p>
              <p className="mt-1 text-xs text-stone-400 font-bold uppercase">{order.cliente_nome} - R$ {order.valor_total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 5000 });
    
    if (audioRef.current) audioRef.current.play().catch(() => {});
  };

  const updateStatus = async (orderId: number, currentStatus: string) => {
    const nextIdx = STATUS_FLOW.findIndex(s => s.id === currentStatus) + 1;
    if (nextIdx >= STATUS_FLOW.length) return;
    
    const nextStatus = STATUS_FLOW[nextIdx].id;
    const order = orders.find(o => o.id === orderId);

    try {
      const { error } = await supabase.from('pedidos').update({ status: nextStatus }).eq('id', orderId);
      if (error) throw error;

      if (nextStatus === 'Entregue' && order) {
        if (onAddTransaction) {
          await onAddTransaction(
            `VENDA: ${order.cliente_nome} (#${order.id})`,
            order.valor_total,
            'income',
            'Vendas Diretas',
            new Date().toISOString().split('T')[0]
          );
        }
        await deductStockFromOrder(order);
        toast.success('Pedido finalizado com sucesso!');
      }

      fetchOrders();
    } catch (e: any) {
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteOrder = async (id: number) => {
    // Implementação direta sem window.confirm para evitar erros de sandbox
    try {
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
      
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success(`Pedido #${id} excluído com sucesso`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir o pedido');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.id.toString().includes(searchTerm)
    );
  }, [orders, searchTerm]);

  return (
    <div className="h-full flex flex-col gap-6 font-sans overflow-hidden">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
      
      <NewOrderModal 
        isOpen={isNewOrderModalOpen} 
        onClose={() => setNewOrderModalOpen(false)} 
        onSuccess={fetchOrders}
        user={user}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#161616] p-6 rounded-[2.5rem] border border-stone-800 shadow-2xl">
         <div className="flex items-center gap-5">
            <div className="p-4 bg-red-600 rounded-3xl text-white shadow-xl shadow-red-900/30">
               <Bell size={28} className={orders.some(o => o.status === 'Novo') ? 'animate-ring' : ''} />
            </div>
            <div>
               <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Cozinha & Fluxo</h2>
               <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  Sincronização com Estoque Ativa
               </p>
            </div>
         </div>

         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-500" size={18}/>
               <input 
                 placeholder="Filtrar pedidos..."
                 className="w-full bg-stone-900 border border-stone-800 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <button 
               onClick={() => setNewOrderModalOpen(true)}
               className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center gap-3 shrink-0"
            >
               <Plus size={20} strokeWidth={3}/> LANÇAR PEDIDO
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar-h">
         <div className="flex gap-6 h-full min-w-max px-2">
            {STATUS_FLOW.map((col) => {
               const colOrders = filteredOrders.filter(o => o.status === col.id || (!o.status && col.id === 'Novo'));

               return (
                  <div key={col.id} className="w-[340px] flex flex-col gap-5">
                     <div className={`p-5 rounded-[2rem] border ${col.border} ${col.bg} flex items-center justify-between shadow-sm`}>
                        <div className="flex items-center gap-3">
                           <div className={col.color}>{col.icon}</div>
                           <h3 className={`font-black uppercase text-[11px] tracking-[0.2em] ${col.color}`}>{col.label}</h3>
                        </div>
                        <div className="bg-black/40 px-3 py-1 rounded-full text-[10px] font-black text-white border border-white/5">
                           {colOrders.length}
                        </div>
                     </div>
                     
                     <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {colOrders.map((order) => (
                           <div key={order.id} className="bg-[#1a1a1a] border border-stone-800 rounded-[2.2rem] p-6 shadow-xl hover:border-stone-600 transition-all group animate-in slide-in-from-bottom-2">
                              
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">ORDEM</span>
                                    <h4 className="text-xl font-black text-white tracking-tighter leading-none">#{order.id}</h4>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2 text-stone-500 font-bold text-[10px] uppercase">
                                       <Clock size={12}/> {new Date(order.data_pedido).toLocaleTimeString().slice(0,5)}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => printOrder(order)} className="p-2 bg-stone-800 text-stone-400 hover:text-white rounded-xl"><Printer size={14}/></button>
                                       <button onClick={() => deleteOrder(order.id)} className="p-2 bg-stone-800 text-stone-500 hover:text-red-500 rounded-xl"><Trash2 size={14}/></button>
                                    </div>
                                 </div>
                              </div>

                              <div className="space-y-1 mb-5">
                                 <p className="text-[11px] font-black text-stone-300 uppercase truncate">{order.cliente_nome}</p>
                                 <p className="text-[9px] text-stone-500 font-bold uppercase truncate flex items-center gap-1">
                                    <MapPin size={10}/> {order.cliente_endereco || 'BALCÃO'}
                                 </p>
                              </div>

                              <div className="bg-stone-900/80 rounded-2xl p-4 space-y-2 mb-6 border border-stone-800">
                                 {order.itens_pedido.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-[10px]">
                                       <span className="font-black text-stone-300 leading-tight">
                                          <span className="text-red-600 mr-1">{item.qtd}x</span> {item.produto}
                                       </span>
                                    </div>
                                 ))}
                              </div>

                              <div className="flex items-center justify-between">
                                 <div className="text-xl font-black text-green-500 tracking-tighter">R$ {order.valor_total.toFixed(2)}</div>
                                 {col.id !== 'Entregue' && (
                                    <button 
                                       onClick={() => updateStatus(order.id, order.status || 'Novo')}
                                       className="bg-white text-black font-black text-[10px] uppercase px-5 py-3 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                    >
                                       Avançar <ChevronRight size={14} strokeWidth={3}/>
                                    </button>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};

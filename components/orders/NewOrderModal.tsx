import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Minus, ShoppingCart, User, MapPin, CreditCard, Loader2, CheckCircle2, Printer, Truck, DollarSign } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/helpers';
import { printOrder } from '../../utils/printHelper';
import { toast } from 'react-hot-toast';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [shouldPrint, setShouldPrint] = useState(true);
  
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'Cartão (Maquininha)',
    deliveryFee: 0,
    paidAmount: 0
  });

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('cardapio').select('*').order('nome');
    if (data) setProducts(data);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const addToCart = (product: any) => {
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
      setCart(cart.map(c => c.id === product.id ? { ...c, qtd: c.qtd + 1 } : c));
    } else {
      setCart([...cart, { ...product, qtd: 1 }]);
    }
  };

  const removeFromCart = (id: any) => {
    const existing = cart.find(c => c.id === id);
    if (existing?.qtd === 1) {
      setCart(cart.filter(c => c.id !== id));
    } else {
      setCart(cart.map(c => c.id === id ? { ...c, qtd: c.qtd - 1 } : c));
    }
  };

  const subtotal = cart.reduce((acc, curr) => acc + (curr.preco * curr.qtd), 0);
  const totalValue = subtotal + customer.deliveryFee;
  const changeAmount = customer.paidAmount > totalValue ? customer.paidAmount - totalValue : 0;

  const handleSaveOrder = async () => {
    if (cart.length === 0 || !customer.name) {
      toast.error("Adicione itens e o nome do cliente.");
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        cliente_nome: customer.name,
        cliente_telefone: customer.phone,
        cliente_endereco: customer.address,
        itens_pedido: cart.map(c => ({
          produto: c.nome,
          qtd: c.qtd,
          amount: c.preco * c.qtd
        })),
        valor_total: totalValue,
        taxa_entrega: customer.deliveryFee,
        troco: changeAmount,
        status: 'Novo',
        forma_pagamento: customer.paymentMethod,
        data_pedido: new Date().toISOString(),
        user_id: user.id
      };

      const { data, error } = await supabase.from('pedidos').insert([orderPayload]).select().single();
      if (error) throw error;

      if (shouldPrint && data) {
        printOrder(data);
      }

      toast.success('Venda concluída com sucesso!');
      onSuccess();
      onClose();
      setCart([]);
      setCustomer({ name: '', phone: '', address: '', paymentMethod: 'Cartão (Maquininha)', deliveryFee: 0, paidAmount: 0 });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-[#121212] w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden border border-stone-800 flex flex-col md:flex-row">
        
        {/* LADO ESQUERDO: SELEÇÃO DE PRODUTOS */}
        <div className="flex-1 flex flex-col border-r border-stone-800 bg-stone-900/20">
          <div className="p-8 border-b border-stone-800">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-2">
               <Plus className="text-red-500" /> Montar Pedido
            </h3>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
              <input 
                placeholder="Qual o sabor hoje?"
                className="w-full bg-stone-900 border-none rounded-2xl py-5 pl-14 pr-6 text-white font-bold outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
            {filteredProducts.map(p => (
              <button 
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex flex-col gap-3 p-5 bg-[#1a1a1a] hover:bg-[#222] rounded-[2.5rem] border border-stone-800 hover:border-red-600/40 transition-all text-left group shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/5 px-2 py-0.5 rounded-full">{p.categoria}</span>
                  <div className="bg-stone-800 p-2 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all">
                    <Plus size={16} />
                  </div>
                </div>
                <h4 className="font-black text-white uppercase text-xs leading-tight h-10 overflow-hidden">{p.nome}</h4>
                <p className="font-black text-xl text-stone-300 tracking-tighter">R$ {p.preco.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* LADO DIREITO: CARRINHO E CLIENTE */}
        <div className="w-full md:w-[460px] flex flex-col bg-stone-950">
          <div className="p-8 bg-red-600 text-white flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
               <ShoppingCart size={24} strokeWidth={3} />
               <span className="font-black uppercase text-sm tracking-widest">Caixa Expresso</span>
             </div>
             <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {/* CARRINHO */}
            <div className="space-y-4">
              {cart.length === 0 && (
                 <div className="text-center py-12 border-2 border-dashed border-stone-800 rounded-[2.5rem]">
                    <ShoppingCart className="mx-auto text-stone-800 mb-3" size={32}/>
                    <p className="text-stone-600 font-black uppercase text-[10px] tracking-widest">Carrinho de Compras Vazio</p>
                 </div>
              )}
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-[#111] p-4 rounded-3xl border border-stone-800 animate-in fade-in">
                  <div className="flex-1 min-w-0 pr-3">
                    <h5 className="text-xs font-black text-white uppercase truncate">{item.nome}</h5>
                    <p className="text-[10px] text-stone-500 font-bold mt-0.5">R$ {item.preco.toFixed(2)} / un</p>
                  </div>
                  <div className="flex items-center gap-4 bg-stone-900 p-2 rounded-2xl border border-stone-800">
                    <button onClick={() => removeFromCart(item.id)} className="p-1 text-stone-500 hover:text-red-500 transition-colors"><Minus size={14}/></button>
                    <span className="font-black text-white text-xs w-4 text-center">{item.qtd}</span>
                    <button onClick={() => addToCart(item)} className="p-1 text-stone-500 hover:text-green-500 transition-colors"><Plus size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            {/* FINANCEIRO */}
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Truck size={12}/> Taxa de Entrega</label>
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-xs font-black">R$</span>
                   <input 
                     type="number"
                     className="w-full bg-stone-900 border border-stone-800 rounded-2xl p-4 pl-10 text-white font-black text-sm outline-none focus:ring-1 focus:ring-red-600 shadow-inner"
                     value={customer.deliveryFee}
                     onChange={e => setCustomer({...customer, deliveryFee: Number(e.target.value)})}
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2"><DollarSign size={12}/> Valor Pago</label>
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-xs font-black">R$</span>
                   <input 
                     type="number"
                     className="w-full bg-stone-900 border border-stone-800 rounded-2xl p-4 pl-10 text-white font-black text-sm outline-none focus:ring-1 focus:ring-green-600 shadow-inner"
                     value={customer.paidAmount}
                     onChange={e => setCustomer({...customer, paidAmount: Number(e.target.value)})}
                   />
                 </div>
               </div>
            </div>

            {changeAmount > 0 && (
              <div className="p-5 bg-blue-600/10 border border-blue-600/30 rounded-[1.8rem] flex justify-between items-center animate-in zoom-in-95">
                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Troco Necessário:</span>
                 <span className="text-xl font-black text-white">R$ {changeAmount.toFixed(2)}</span>
              </div>
            )}

            {/* CLIENTE */}
            <div className="space-y-4 pt-4 border-t border-stone-800">
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2"><User size={12}/> Nome do Cliente</label>
                 <input 
                   className="w-full bg-stone-900 border border-stone-800 rounded-2xl p-4 text-white font-bold text-xs outline-none focus:ring-1 focus:ring-red-600 uppercase shadow-inner"
                   value={customer.name}
                   onChange={e => setCustomer({...customer, name: e.target.value.toUpperCase()})}
                   placeholder="QUEM ESTÁ PEDINDO?"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={12}/> Local de Entrega</label>
                 <input 
                   className="w-full bg-stone-900 border border-stone-800 rounded-2xl p-4 text-white font-bold text-xs outline-none focus:ring-1 focus:ring-red-600 uppercase shadow-inner"
                   value={customer.address}
                   onChange={e => setCustomer({...customer, address: e.target.value.toUpperCase()})}
                   placeholder="ENDEREÇO OU BALCÃO"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2"><CreditCard size={12}/> Forma de Pagamento</label>
                 <select 
                   className="w-full bg-stone-900 border border-stone-800 rounded-2xl p-4 text-white font-black text-xs outline-none focus:ring-1 focus:ring-red-600 appearance-none shadow-inner"
                   value={customer.paymentMethod}
                   onChange={e => setCustomer({...customer, paymentMethod: e.target.value})}
                 >
                   <option>Cartão (Maquininha)</option>
                   <option>PIX</option>
                   <option>Dinheiro</option>
                   <option>Crédito Online</option>
                 </select>
               </div>
            </div>

            <button 
              onClick={() => setShouldPrint(!shouldPrint)}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${shouldPrint ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-transparent border-stone-800 text-stone-600'}`}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Imprimir Cupom de Cozinha</span>
              <Printer size={18} />
            </button>
          </div>

          <div className="p-10 bg-[#0a0a0a] border-t border-stone-800 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <span className="text-stone-500 font-black uppercase text-[11px] tracking-widest">Total do Pedido</span>
              <span className="text-4xl font-black text-white tracking-tighter">R$ {totalValue.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleSaveOrder}
              disabled={loading || cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-green-900/30 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
              FINALIZAR VENDA AGORA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
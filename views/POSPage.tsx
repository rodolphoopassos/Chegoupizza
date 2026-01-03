import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ShoppingCart, Plus, Minus, MapPin, 
  CheckCircle2, Loader2, Bike, PieChart, X, 
  Trash2, Calculator, DollarSign
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

// Formatador de Dinheiro
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
  cartId: string;
  isHalf?: boolean; // Marca se é meio a meio
}

interface POSPageProps {
  user: any;
  onAddTransaction?: (description: string, amount: number, type: 'income' | 'expense', category: string, dateStr?: string) => Promise<void>;
}

export const POSPage: React.FC<POSPageProps> = ({ user, onAddTransaction }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [categories, setCategories] = useState<string[]>([]);
  
  // --- DADOS DO PEDIDO ---
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [saving, setSaving] = useState(false);

  // --- ESTADOS DO MEIO A MEIO ---
  const [isHalfModalOpen, setIsHalfModalOpen] = useState(false);
  const [firstHalf, setFirstHalf] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('cardapio').select('*').eq('disponivel', true);
    if (data) {
       const mapped = data.map((item: any) => ({
         id: item.id,
         name: item.nome || item.name,
         price: Number(item.preco || item.price),
         category: item.categoria || item.category || 'Outros',
       }));
       setProducts(mapped);
       const cats = Array.from(new Set(mapped.map((p: any) => p.category))) as string[];
       setCategories(['Todas', ...cats]);
    }
    setLoading(false);
  };

  // --- LÓGICA DO CARRINHO ---
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id && !item.isHalf);
    if (existing) {
      setCart(cart.map(item => item.cartId === existing.cartId ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1, cartId: Math.random().toString() }]);
    }
  };

  // --- LÓGICA DO MEIO A MEIO ---
  const handleSelectHalf = (product: Product) => {
    if (!firstHalf) {
      // Selecionou a primeira metade
      setFirstHalf(product);
      toast.success(`1ª Metade: ${product.name} selecionada!`);
    } else {
      // Selecionou a segunda metade -> Adiciona ao carrinho
      // Regra de preço: Média ou Maior Valor (aqui usamos a média como no exemplo fornecido)
      const avgPrice = (firstHalf.price + product.price) / 2;
      const combinedName = `1/2 ${firstHalf.name} + 1/2 ${product.name}`;
      
      const newItem: CartItem = {
        id: Math.random(), // ID temporário
        name: combinedName,
        price: avgPrice,
        category: 'Pizza Mista',
        quantity: 1,
        cartId: Math.random().toString(),
        isHalf: true
      };

      setCart([...cart, newItem]);
      toast.success("Pizza Meio a Meio adicionada!", { icon: '🌓' });
      
      // Reseta o modal
      setFirstHalf(null);
      setIsHalfModalOpen(false);
    }
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  // --- FINALIZAR PEDIDO ---
  const handleFinishSale = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio!");
    const finalName = clientName || 'Cliente Balcão'; 

    setSaving(true);
    
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) + Number(deliveryFee);
    const fullAddress = address || 'Balcão / Retirada';

    try {
      const payload = {
        cliente_nome: finalName,
        cliente_telefone: null,
        cliente_endereco: fullAddress,
        valor_total: total,
        forma_pagamento: paymentMethod,
        taxa_entrega: Number(deliveryFee),
        status: 'Entregue',
        user_id: user?.id || null, 
        data_pedido: new Date().toISOString(),
        itens_pedido: cart.map(item => ({
          produto: item.name,
          qtd: item.quantity,
          preco_unitario: item.price
        }))
      };

      const { data, error } = await supabase.from('pedidos').insert([payload]).select().single();
      if (error) throw error;

      // Integração com o Financeiro
      if (onAddTransaction) {
        await onAddTransaction(
          `VENDA PDV: ${finalName} (#${data.id})`,
          total,
          'income',
          'Vendas Diretas',
          new Date().toISOString().split('T')[0]
        );
      }

      toast.success("Venda Realizada com Sucesso! 💵");
      setCart([]);
      setClientName('');
      setAddress('');
      setDeliveryFee(0);

    } catch (error: any) {
      console.error(error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Filtros
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0f0f0f] -m-4 md:-m-12 overflow-hidden font-sans text-white border-t border-stone-800">
      
      {/* LADO ESQUERDO: CATÁLOGO */}
      <div className="flex-1 flex flex-col border-r border-stone-800 relative">
        <div className="p-6 border-b border-stone-800 bg-[#161616]">
          <h1 className="text-xl font-black uppercase flex items-center gap-2 mb-4">
            <Plus className="text-red-600" /> NOVO PEDIDO
          </h1>
          
          <div className="flex gap-4 mb-4">
             {/* --- BOTÃO DE MEIO A MEIO --- */}
             <button 
               onClick={() => { setIsHalfModalOpen(true); setFirstHalf(null); }}
               className="bg-stone-800 hover:bg-red-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all border border-stone-700 shadow-lg active:scale-95"
             >
               <PieChart size={18} />
               Pizza Meio a Meio
             </button>

             <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input 
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar sabor..."
                  className="w-full bg-[#0f0f0f] border border-stone-800 rounded-xl py-3 pl-12 pr-4 font-bold text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-all"
                />
             </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar-h">
             {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-[#0f0f0f] border-stone-800 text-stone-500 hover:border-stone-700'}`}
                >
                  {cat}
                </button>
             ))}
          </div>
        </div>

        {/* LISTA DE PRODUTOS */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
                <Loader2 className="animate-spin text-red-600" size={40}/>
                <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Cardápio...</p>
             </div>
           ) : (
             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => (
                   <div 
                     key={product.id} 
                     onClick={() => addToCart(product)} 
                     className="bg-[#161616] p-4 rounded-2xl border border-stone-800 cursor-pointer hover:border-red-600 transition-all group active:scale-95 shadow-xl"
                   >
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[8px] font-black uppercase text-red-600 tracking-wider bg-red-600/10 px-1.5 py-0.5 rounded">{product.category}</span>
                         <Plus size={14} className="text-stone-600 group-hover:text-white transition-colors"/>
                      </div>
                      <h3 className="font-black text-xs uppercase text-white mb-1 leading-tight h-8 overflow-hidden line-clamp-2">{product.name}</h3>
                      <p className="text-lg font-black text-stone-300 group-hover:text-white mt-2">{formatMoney(product.price)}</p>
                   </div>
                ))}
             </div>
           )}
        </div>

        {/* --- MODAL DO MEIO A MEIO --- */}
        {isHalfModalOpen && (
          <div className="absolute inset-0 z-50 bg-[#111]/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
             <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-[#1a1a1a] shadow-2xl">
                <div>
                   <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                      <PieChart className="text-red-600" /> Montar Meio a Meio
                   </h2>
                   <p className="text-xs text-stone-400 font-bold mt-1">
                      {firstHalf ? `1ª Metade: ${firstHalf.name} (Escolha a próxima)` : 'Escolha o primeiro sabor da pizza'}
                   </p>
                </div>
                <button onClick={() => setIsHalfModalOpen(false)} className="bg-stone-800 p-2 rounded-full hover:bg-red-600 text-white transition-all"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 custom-scrollbar bg-[#0a0a0a]">
                {products
                  .filter(p => p.category.toUpperCase().includes('PIZZA') || p.category.toUpperCase().includes('ESPECIAIS'))
                  .map(product => (
                   <button 
                     key={product.id} 
                     onClick={() => handleSelectHalf(product)}
                     className={`p-6 rounded-[2.5rem] border text-left transition-all active:scale-95 shadow-2xl flex flex-col h-full group ${
                        firstHalf?.id === product.id 
                        ? 'bg-red-600 border-red-600 shadow-red-900/40' 
                        : 'bg-[#1a1a1a] border-stone-800 hover:border-red-600 hover:bg-[#222]'
                     }`}
                   >
                      <span className={`text-[9px] font-black uppercase tracking-widest mb-2 ${firstHalf?.id === product.id ? 'text-white/60' : 'text-stone-600'}`}>{product.category}</span>
                      <h3 className="font-black text-sm text-white leading-tight flex-1 uppercase">{product.name}</h3>
                      <div className="mt-4 flex justify-between items-end">
                        <p className={`font-black text-lg ${firstHalf?.id === product.id ? 'text-white' : 'text-stone-300'}`}>{formatMoney(product.price)}</p>
                      </div>
                   </button>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* LADO DIREITO: CAIXA */}
      <div className="w-full md:w-[400px] bg-[#161616] flex flex-col shadow-2xl z-10 border-l border-stone-800">
         <div className="p-5 bg-red-600 text-white flex justify-between items-center shadow-lg">
            <h2 className="text-lg font-black uppercase flex items-center gap-2"><ShoppingCart size={20} strokeWidth={3} /> Caixa Expresso</h2>
            <div className="bg-black/20 px-3 py-1 rounded-lg text-xs font-bold border border-white/10">{cart.length} ITENS</div>
         </div>

         <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#0a0a0a] custom-scrollbar">
            {cart.length === 0 && (
              <div className="text-center text-stone-700 py-20 flex flex-col items-center opacity-30">
                <ShoppingCart size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aguardando itens...</p>
              </div>
            )}
            
            {cart.map(item => (
               <div key={item.cartId} className="bg-[#161616] p-4 rounded-[1.8rem] border border-stone-800 flex flex-col gap-3 relative group animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-start">
                     <div className="pr-8">
                        <h4 className="font-black text-xs uppercase text-white leading-tight group-hover:text-red-500 transition-colors">{item.name}</h4>
                        <p className="text-stone-500 text-[9px] font-bold mt-1 uppercase tracking-widest">{formatMoney(item.price)}</p>
                     </div>
                     <button onClick={() => removeFromCart(item.cartId)} className="text-stone-700 hover:text-red-600 absolute top-4 right-4 transition-colors"><X size={16}/></button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-stone-900/50 rounded-2xl p-1.5 border border-stone-800">
                     <div className="flex items-center gap-3">
                        <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1.5 hover:text-red-500 transition-colors bg-stone-800 rounded-lg"><Minus size={12}/></button>
                        <span className="text-xs font-black w-6 text-center text-stone-200">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1.5 hover:text-green-500 transition-colors bg-stone-800 rounded-lg"><Plus size={12}/></button>
                     </div>
                     <span className="text-xs font-black text-stone-400 px-2">{formatMoney(item.price * item.quantity)}</span>
                  </div>
               </div>
            ))}
         </div>

         <div className="p-6 bg-[#121212] border-t border-stone-800 space-y-4 shadow-inner">
            <div className="space-y-3">
                <input 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value.toUpperCase())} 
                    className="w-full bg-[#1a1a1a] border border-stone-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-600/50 transition-all uppercase placeholder-stone-700 shadow-inner" 
                    placeholder="NOME DO CLIENTE" 
                />
                
                <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-4 text-stone-600"/>
                    <textarea 
                        value={address}
                        onChange={e => setAddress(e.target.value.toUpperCase())}
                        placeholder="ENDEREÇO (OU BALCÃO)"
                        className="w-full bg-[#1a1a1a] border border-stone-800 rounded-2xl p-4 pl-12 text-xs font-bold text-white outline-none h-16 resize-none focus:border-red-600/50 transition-all uppercase placeholder-stone-700 shadow-inner"
                    />
                </div>

                <div className="relative">
                    <Bike size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600"/>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-700 text-[10px] font-black uppercase">Taxa</span>
                    <input 
                        type="number" 
                        value={deliveryFee} 
                        onChange={e => setDeliveryFee(Number(e.target.value))} 
                        placeholder="TAXA DE ENTREGA" 
                        className="w-full bg-[#1a1a1a] border border-stone-800 rounded-2xl p-4 pl-12 pr-16 text-xs font-black text-white outline-none focus:border-red-600/50 transition-all shadow-inner" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
               {['Dinheiro', 'Cartão', 'PIX'].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setPaymentMethod(m)} 
                    className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${paymentMethod === m ? 'bg-white text-stone-900 border-white shadow-lg' : 'bg-stone-900 text-stone-600 border-stone-800 hover:border-stone-700'}`}
                  >
                    {m}
                  </button>
               ))}
            </div>

            <div className="pt-4 border-t border-dashed border-stone-800">
               <div className="flex justify-between items-end mb-6">
                  <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Total Geral</span>
                  <span className="text-3xl font-black text-white tracking-tighter">{formatMoney(cartTotal + Number(deliveryFee))}</span>
               </div>
               <button 
                 onClick={handleFinishSale} 
                 disabled={saving || cart.length === 0} 
                 className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 transition-all active:scale-95 shadow-2xl shadow-green-900/30 border-b-4 border-green-800"
               >
                  {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} strokeWidth={3} />}
                  FINALIZAR VENDA
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

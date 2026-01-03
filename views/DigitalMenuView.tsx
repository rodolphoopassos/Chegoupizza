
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  ChevronRight, 
  Star, 
  Clock, 
  MapPin, 
  Smartphone,
  Info,
  Pizza,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface DigitalMenuProps {
  user: any;
  onNavigate?: (tab: string) => void;
}

export const DigitalMenuView: React.FC<DigitalMenuProps> = ({ user, onNavigate }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('PIZZAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.categoria || 'OUTROS')));
    return cats.length > 0 ? cats : ['PIZZAS', 'BEBIDAS', 'ESPECIAIS'];
  }, [products]);

  useEffect(() => {
    fetchMenu();
  }, [user]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cardapio')
        .select('*')
        .order('categoria', { ascending: true });
      
      if (error) throw error;
      if (data) setProducts(data);
    } catch (e) {
      console.error(e);
      // Fallback para demo
      if (user.id === 'demo-user') {
        setProducts([
          { id: 1, nome: 'MARGHERITA PREMIUM', descricao: 'Molho pelati italiano, mussarela de búfala fresca, manjericão colhido na hora e azeite extra virgem.', preco: 45.90, categoria: 'PIZZAS', imagem_url: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&q=80&w=800' },
          { id: 2, nome: 'CALABRESA ARTESANAL', descricao: 'Calabresa premium fatiada finamente, cebola roxa marinada e azeitonas pretas chilenas.', preco: 42.00, categoria: 'PIZZAS', imagem_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800' },
          { id: 3, nome: 'COCA-COLA 2L', descricao: 'Super gelada para acompanhar sua pizza.', preco: 14.00, categoria: 'BEBIDAS', imagem_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800' }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.categoria === activeCategory) && 
      (p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, activeCategory, searchTerm]);

  const handleOrderWhatsApp = (product: any) => {
    const msg = `Olá! Gostaria de pedir uma *${product.nome}* pelo cardápio digital (R$ ${product.preco.toFixed(2)}).`;
    window.open(`https://wa.me/5598999999999?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center py-40 gap-6">
      <div className="relative">
         <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse"></div>
         <Loader2 className="animate-spin text-red-600 relative" size={64} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500 animate-pulse">Sincronizando Sabores...</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-stone-950 -m-4 md:-m-12 relative overflow-hidden font-sans">
      
      {/* HEADER CLIENTE - BANNER GOURMET */}
      <div className="relative h-[40vh] shrink-0 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-stone-950 z-10"></div>
         <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover scale-110 blur-[1px] brightness-75" />
         
         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-8">
            <div className="flex items-center gap-2 text-6xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">
              CH<div className="flex flex-col w-4 h-12 gap-1 justify-center">
                <div className="bg-[#008C45] h-2.5 w-full rounded-sm"></div>
                <div className="bg-white h-2.5 w-full rounded-sm"></div>
                <div className="bg-[#CD212A] h-2.5 w-full rounded-sm"></div>
              </div>GOU
            </div>
            <div className="flex items-center gap-6 text-[11px] font-black text-white/90 uppercase tracking-[0.3em] bg-black/30 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl">
               <span className="flex items-center gap-2"><Clock size={16} className="text-red-500"/> 35-45 min</span>
               <span className="w-1 h-1 bg-white/20 rounded-full"></span>
               <span className="flex items-center gap-2 text-yellow-400"><Star size={16} fill="currentColor"/> 4.9</span>
               <span className="w-1 h-1 bg-white/20 rounded-full"></span>
               <span className="flex items-center gap-2 text-green-400"><MapPin size={16}/> 3km</span>
            </div>
         </div>
      </div>

      {/* NAVEGAÇÃO CATEGORIAS - STICKY GOURMET */}
      <div className="sticky top-0 bg-stone-950/90 backdrop-blur-2xl border-b border-stone-800/50 z-30 px-6 py-6 overflow-x-auto flex gap-10 items-center justify-center custom-scrollbar-h">
         {categories.map(cat => (
           <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap text-[12px] font-black uppercase tracking-[0.2em] transition-all relative pb-2 ${activeCategory === cat ? 'text-red-600' : 'text-stone-500 hover:text-white'}`}
           >
             {cat}
             {activeCategory === cat && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-full animate-in slide-in-from-left duration-300"></div>}
           </button>
         ))}
      </div>

      {/* BUSCA DE ITENS */}
      <div className="px-6 pt-10 pb-6 shrink-0 max-w-2xl mx-auto w-full">
         <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-600 group-focus-within:text-red-600 transition-colors" size={20} />
            <input 
              placeholder="Qual sua pizza favorita hoje?"
              className="w-full bg-stone-900/60 border border-stone-800/50 rounded-[2rem] py-5 pl-14 pr-6 text-white font-bold outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all shadow-2xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {/* LISTA DE PRODUTOS - GRID GOURMET */}
      <div className="flex-1 overflow-y-auto px-6 pb-40 custom-scrollbar">
         <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-stone-900/40 rounded-[3rem] p-5 flex gap-8 items-center border border-stone-800/40 hover:border-red-600/30 transition-all cursor-pointer group shadow-xl hover:shadow-2xl hover:-translate-y-1 duration-500"
              >
                 <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden shrink-0 shadow-2xl border border-stone-800 relative">
                    <img src={product.imagem_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                 </div>
                 <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[9px] font-black bg-red-600/10 text-red-600 px-2.5 py-1 rounded-full uppercase tracking-widest border border-red-600/10">Destaque</span>
                    </div>
                    <h4 className="font-black text-white uppercase text-base tracking-tight truncate group-hover:text-red-500 transition-colors">{product.nome}</h4>
                    <p className="text-[11px] text-stone-500 font-medium line-clamp-2 mt-2 uppercase leading-relaxed tracking-tight">
                       {product.descricao || 'O sabor clássico da verdadeira massa artesanal italiana.'}
                    </p>
                    <div className="flex items-center justify-between mt-5">
                       <span className="font-black text-white text-xl tracking-tighter">R$ {product.preco.toFixed(2)}</span>
                       <div className="bg-red-600 p-3 rounded-2xl text-white shadow-xl shadow-red-900/30 transform group-hover:scale-110 transition-all">
                          <Plus size={20} strokeWidth={3} />
                       </div>
                    </div>
                 </div>
              </div>
            ))}
         </div>
         
         {filteredProducts.length === 0 && (
            <div className="text-center py-20">
               <div className="bg-stone-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Pizza className="text-stone-700" size={32}/>
               </div>
               <p className="text-stone-500 font-black uppercase text-xs tracking-widest">Nenhum sabor encontrado...</p>
            </div>
         )}
      </div>

      {/* MODAL DETALHE PRODUTO - FULL GOURMET */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 backdrop-blur-md">
           <div className="bg-stone-900 w-full max-w-xl rounded-[4rem] overflow-hidden shadow-2xl border border-stone-800 flex flex-col relative">
              
              <div className="h-80 relative overflow-hidden">
                 <img src={selectedProduct.imagem_url} className="w-full h-full object-cover scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent"></div>
                 <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="absolute top-8 right-8 bg-black/50 hover:bg-black p-4 rounded-full text-white backdrop-blur-xl transition-all active:scale-95"
                 >
                  <X size={24}/>
                 </button>
              </div>

              <div className="p-10 -mt-20 relative z-10 space-y-8 bg-gradient-to-b from-transparent via-stone-900 to-stone-900">
                 <div>
                    <span className="text-[10px] font-black bg-red-600 text-white px-5 py-2 rounded-full uppercase tracking-widest shadow-xl shadow-red-900/20">{selectedProduct.categoria}</span>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter mt-6 mb-4">{selectedProduct.nome}</h3>
                    <p className="text-stone-400 text-sm font-bold leading-relaxed uppercase tracking-tight opacity-80">{selectedProduct.descricao}</p>
                 </div>
                 
                 <div className="bg-stone-800/40 p-8 rounded-[3rem] border border-stone-700/50 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl">
                    <div className="text-center sm:text-left">
                       <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.2em] mb-1">Preço do Item</p>
                       <p className="text-4xl font-black text-white tracking-tighter">R$ {selectedProduct.preco.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => handleOrderWhatsApp(selectedProduct)}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-black py-5 px-10 rounded-[1.8rem] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-green-900/30 uppercase text-xs tracking-widest"
                    >
                      <Smartphone size={24} /> Pedir pelo WhatsApp
                    </button>
                 </div>
                 
                 <div className="text-center">
                    <p className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                       <Info size={14}/> Sabor Original ChegouPizza SLZ
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* FLOAT BUTTON WHATSAPP CLIENTE */}
      <div className="fixed bottom-10 right-10 z-40 hidden md:block">
         <button className="bg-green-600 text-white p-6 rounded-full shadow-2xl shadow-green-900/40 hover:scale-110 hover:-rotate-12 transition-all active:scale-95">
            <Smartphone size={32} />
         </button>
      </div>
    </div>
  );
};

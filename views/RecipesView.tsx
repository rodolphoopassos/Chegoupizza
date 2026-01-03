
import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Search, Plus, Save, Trash, 
  ChevronRight, AlertCircle, Calculator 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

// Formatador de Dinheiro
const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para renderizar strings de forma segura e evitar [object Object]
const safeString = (val: any) => {
  if (typeof val === 'object' && val !== null) return val.nome || val.name || JSON.stringify(val);
  return String(val || '');
};

export const RecipesView: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]); // Todos os itens de ficha técnica
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado do Modal de Edição
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para Adicionar Ingrediente
  const [selectedIngId, setSelectedIngId] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Busca Produtos
    const { data: prodData } = await supabase.from('cardapio').select('*').order('nome');
    // Busca Insumos (Estoque)
    const { data: ingData } = await supabase.from('insumos').select('*').order('nome');
    // Busca Fichas Técnicas já montadas
    const { data: recData } = await supabase.from('ficha_tecnica').select('*, insumos(*)');

    if (prodData) setProducts(prodData);
    if (ingData) setIngredients(ingData);
    if (recData) setRecipes(recData || []);
    setLoading(false);
  };

  // Abre o modal para editar a pizza
  const handleOpenRecipe = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    setSelectedIngId('');
    setQuantity('');
  };

  // Adiciona um ingrediente na pizza selecionada
  const handleAddIngredient = async () => {
    if (!selectedIngId || !quantity) return toast.error("Selecione ingrediente e quantidade");

    const payload = {
      produto_nome: safeString(selectedProduct.nome || selectedProduct.name),
      insumo_id: parseInt(selectedIngId),
      quantidade: parseFloat(quantity.replace(',', '.'))
    };

    const { error } = await supabase.from('ficha_tecnica').insert([payload]);

    if (error) {
      toast.error("Erro ao adicionar");
    } else {
      toast.success("Ingrediente adicionado!");
      fetchData(); // Recarrega para atualizar custos
      setQuantity('');
    }
  };

  const handleRemoveIngredient = async (id: number) => {
    const { error } = await supabase.from('ficha_tecnica').delete().eq('id', id);
    if (!error) fetchData();
  };

  // --- CÁLCULOS ---
  // Filtra os ingredientes da pizza atual
  const currentRecipeItems = recipes.filter(r => 
    safeString(r.produto_nome) === safeString(selectedProduct?.nome || selectedProduct?.name)
  );

  // Calcula o Custo Total (CMV) da pizza selecionada
  const currentCost = currentRecipeItems.reduce((acc, item) => {
    // Custo = Quantidade usada * Custo do ingrediente
    return acc + (item.quantidade * (item.insumos?.custo_unitario || 0));
  }, 0);

  // Filtro da lista principal
  const filteredProducts = products.filter(p => 
    safeString(p.nome || p.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#0f0f0f] font-sans text-white p-6 flex-col gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="bg-[#161616] p-6 rounded-3xl border border-stone-800 flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
           <h1 className="text-2xl font-black uppercase flex items-center gap-2 tracking-tight">
             <ChefHat className="text-orange-500" /> Engenharia de Cardápio
           </h1>
           <p className="text-xs text-stone-500 font-bold uppercase mt-1">Defina a composição e controle o CMV</p>
        </div>
        <div className="relative z-10 w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16}/>
           <input 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="Buscar pizza..." 
             className="w-full bg-[#0f0f0f] border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-orange-500 text-white"
           />
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 custom-scrollbar">
         {filteredProducts.map(product => {
            // Calcula o custo deste produto na lista (pra mostrar no card)
            const prodCost = recipes
              .filter(r => safeString(r.produto_nome) === safeString(product.nome || product.name))
              .reduce((acc, item) => acc + (item.quantidade * (item.insumos?.custo_unitario || 0)), 0);
            
            const price = parseFloat(product.preco || product.price || 0);
            const margin = price - prodCost;
            const marginPercent = price > 0 ? (margin / price) * 100 : 0;

            return (
              <div 
                key={product.id} 
                onClick={() => handleOpenRecipe(product)}
                className="bg-[#161616] border border-stone-800 rounded-2xl p-5 hover:border-orange-500 transition-all cursor-pointer group flex flex-col justify-between"
              >
                 <div>
                    <h3 className="font-black uppercase text-sm mb-1">{safeString(product.nome || product.name)}</h3>
                    <span className="text-[10px] font-bold bg-[#0f0f0f] px-2 py-1 rounded text-stone-500 border border-stone-800 uppercase">
                       {safeString(product.categoria || product.category)}
                    </span>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-dashed border-stone-800">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-stone-500 mb-1">
                       <span>Custo (CMV)</span>
                       <span>Lucro</span>
                    </div>
                    <div className="flex justify-between items-end">
                       <span className="text-stone-300 font-bold">{formatMoney(prodCost)}</span>
                       <span className={`font-black text-lg ${marginPercent < 30 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatMoney(margin)}
                       </span>
                    </div>
                    {/* Barra de Margem */}
                    <div className="w-full h-1.5 bg-[#0f0f0f] rounded-full mt-2 overflow-hidden">
                       <div 
                         className={`h-full ${marginPercent < 30 ? 'bg-red-600' : 'bg-green-500'}`} 
                         style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
                       ></div>
                    </div>
                 </div>
              </div>
            );
         })}
      </div>

      {/* MODAL DE EDIÇÃO DA FICHA TÉCNICA */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-[#161616] border border-stone-700 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in flex flex-col max-h-[90vh]">
              
              {/* Header Modal */}
              <div className="p-6 border-b border-stone-800 bg-[#1a1a1a] rounded-t-2xl flex justify-between items-start">
                 <div>
                    <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Editando Ficha Técnica</span>
                    <h2 className="text-2xl font-black uppercase text-white mt-1">{safeString(selectedProduct.nome || selectedProduct.name)}</h2>
                    <p className="text-xs text-stone-500 mt-1">Preço de Venda: <span className="text-white font-bold">{formatMoney(selectedProduct.preco || selectedProduct.price || 0)}</span></p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-stone-500">Custo Atual</p>
                    <p className="text-xl font-black text-white">{formatMoney(currentCost)}</p>
                 </div>
              </div>

              {/* Corpo Modal */}
              <div className="flex-1 overflow-y-auto p-6">
                 
                 {/* Formulário de Adição */}
                 <div className="bg-[#0f0f0f] p-4 rounded-xl border border-stone-800 mb-6">
                    <h4 className="text-[10px] font-black uppercase text-stone-500 mb-3 flex items-center gap-2">
                       <Plus size={12}/> Adicionar Ingrediente
                    </h4>
                    <div className="flex gap-2">
                       <select 
                         value={selectedIngId}
                         onChange={e => setSelectedIngId(e.target.value)}
                         className="flex-1 bg-[#161616] border border-stone-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                       >
                          <option value="">Selecione o Insumo...</option>
                          {ingredients.map(ing => (
                             <option key={ing.id} value={ing.id}>{safeString(ing.nome)} ({safeString(ing.unidade)}) - R$ {ing.custo_unitario}</option>
                          ))}
                       </select>
                       <input 
                         type="text"
                         value={quantity}
                         onChange={e => setQuantity(e.target.value)}
                         placeholder="Qtd (Ex: 0.3)"
                         className="w-24 bg-[#161616] border border-stone-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                       />
                       <button 
                         onClick={handleAddIngredient}
                         className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-lg font-black uppercase text-xs transition-colors"
                       >
                          Adicionar
                       </button>
                    </div>
                    <p className="text-[9px] text-stone-600 mt-2 ml-1">
                       * Exemplo: Para 300g, use 0.3 (se a unidade for KG). Para 2 unidades, use 2.
                    </p>
                 </div>

                 {/* Lista de Ingredientes Cadastrados */}
                 <div className="space-y-2">
                    {currentRecipeItems.length === 0 && (
                       <div className="text-center py-10 opacity-30">
                          <Calculator size={48} className="mx-auto mb-2"/>
                          <p className="text-xs font-black uppercase">Nenhum ingrediente cadastrado</p>
                       </div>
                    )}

                    {currentRecipeItems.map(item => (
                       <div key={item.id} className="flex justify-between items-center bg-[#0f0f0f] p-3 rounded-lg border border-stone-800">
                          <div className="flex items-center gap-3">
                             <div className="w-1 h-8 bg-orange-600 rounded-full"></div>
                             <div>
                                <p className="text-xs font-black uppercase text-white">{safeString(item.insumos?.nome)}</p>
                                <p className="text-[10px] text-stone-500">
                                   {item.quantidade} {safeString(item.insumos?.unidade)} x {formatMoney(item.insumos?.custo_unitario || 0)}
                                </p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <p className="text-xs font-bold text-white">
                                {formatMoney(item.quantidade * (item.insumos?.custo_unitario || 0))}
                             </p>
                             <button onClick={() => handleRemoveIngredient(item.id)} className="text-stone-600 hover:text-red-500">
                                <Trash size={14}/>
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Rodapé Modal */}
              <div className="p-4 border-t border-stone-800 bg-[#1a1a1a] rounded-b-2xl flex justify-end">
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="bg-stone-800 hover:bg-stone-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase transition-colors"
                 >
                    Fechar e Salvar
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

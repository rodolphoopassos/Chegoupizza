
import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Search, Plus, Save, Trash, 
  ChevronRight, AlertCircle, Calculator 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { calcularCustoTotal } from '../utils/helpers';

// Formatador de Dinheiro
const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para renderizar strings de forma segura e evitar [object Object]
const safeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (val instanceof Date) return val.toLocaleDateString();
  
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.length > 0 ? safeString(val[0]) : '';
    // Tenta encontrar propriedades comuns de texto
    const candidate = val.nome || val.name || val.description || val.label || val.title || val.message;
    if (candidate !== undefined && candidate !== null) {
        if (typeof candidate === 'object') return safeString(candidate);
        return String(candidate);
    }
    return ''; // Se for objeto sem propriedade de texto conhecida, retorna vazio para evitar [object Object]
  }
  
  return String(val);
};

interface RecipesViewProps {
  user: any;
}

export const RecipesView: React.FC<RecipesViewProps> = ({ user }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]); // Lista de Insumos (Estoque)
  const [recipes, setRecipes] = useState<any[]>([]); // Todos os itens para o grid principal
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados Específicos do Modal
  const [currentRecipeItems, setCurrentRecipeItems] = useState<any[]>([]);
  const [currentCost, setCurrentCost] = useState(0);

  // Estado do Modal de Edição
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para Adicionar Ingrediente
  const [selectedIngId, setSelectedIngId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Busca Produtos (Cardápio)
      const { data: prodData } = await supabase.from('cardapio').select('*').order('nome');
      
      // 2. Busca Insumos (Estoque)
      const { data: ingData } = await supabase
        .from('estoque')
        .select('*')
        .order('name', { ascending: true });

      // 3. Busca Fichas Técnicas (Geral para Grid)
      const { data: recData } = await supabase.from('receitas_ingredientes').select('*');

      if (prodData) setProducts(prodData);
      if (ingData) setIngredients(ingData);
      
      // Mapeamento
      if (recData && ingData) {
        const enrichedRecipes = recData.map((r: any) => {
            // Vincula pelo ID do estoque
            const insumo = ingData.find((i: any) => String(i.id) === String(r.stock_id));
            return {
                ...r,
                insumos: insumo || null
            };
        });
        setRecipes(enrichedRecipes);
      } else {
        setRecipes([]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao sincronizar engenharia de cardápio.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipeIngredients = async (recipeId: number) => {
    try {
      // 1. Busca os ingredientes da receita + dados do estoque
      const { data, error } = await supabase
        .from('receitas_ingredientes')
        .select(`
          id,
          quantity,
          stock_id,
          estoque (
            name,
            unit,
            cost_per_unit
          )
        `)
        .eq('recipe_id', recipeId);
  
      if (error) throw error;
  
      if (data) {
        // 2. Transforma os dados para o formato que a tela espera
        const formattedIngredients = data.map((item: any) => ({
          id: item.id,
          name: item.estoque?.name || 'Item Desconhecido',
          unit: item.estoque?.unit || 'un',
          quantity: item.quantity,
          unitCost: item.estoque?.cost_per_unit || 0,
          cost_per_unit: item.estoque?.cost_per_unit || 0, // Adicionado para compatibilidade com helper
          totalCost: (item.quantity * (item.estoque?.cost_per_unit || 0))
        }));
  
        setCurrentRecipeItems(formattedIngredients);
  
        // 3. Calcula o Custo Total da Receita usando o helper
        const total = calcularCustoTotal(formattedIngredients);
        setCurrentCost(total);
      }
    } catch (error) {
      console.error('Erro ao buscar ingredientes:', error);
    }
  };

  // Abre o modal para editar a pizza
  const handleOpenRecipe = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    setSelectedIngId('');
    setQuantity(0);
    fetchRecipeIngredients(product.id);
  };

  // Adiciona um ingrediente na pizza selecionada
  const handleAddIngredient = async () => {
    if (!selectedIngId || quantity <= 0) {
      toast.error("Selecione um item e uma quantidade válida.");
      return;
    }

    const stockItem = ingredients.find(i => String(i.id) === selectedIngId);
    if (!stockItem) return;

    // Verifica se o item tem custo cadastrado (Alerta de Gestão)
    const cost = stockItem.cost_per_unit || stockItem.custo_unitario || 0;
    if (cost === 0) {
      toast("⚠️ Este item está com Custo Zero no estoque! O custo da receita não vai aumentar.", {
        icon: '⚠️',
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
      });
    }

    try {
      const payload = {
        recipe_id: selectedProduct.id,
        stock_id: selectedIngId,
        quantity: Number(quantity)
      };

      const { error } = await supabase
        .from('receitas_ingredientes')
        .insert([payload]);

      if (error) throw error;

      toast.success(`${safeString(stockItem)} adicionado!`);
      
      // Atualiza o modal e o grid geral
      fetchRecipeIngredients(selectedProduct.id);
      fetchData(); 
      
      setQuantity(0);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao adicionar ingrediente.");
    }
  };

  const handleRemoveIngredient = async (id: number) => {
    const { error } = await supabase.from('receitas_ingredientes').delete().eq('id', id);
    if (!error) {
        fetchRecipeIngredients(selectedProduct.id);
        fetchData();
    }
  };

  // Filtro da lista principal
  const filteredProducts = products.filter(p => 
    safeString(p).toLowerCase().includes(searchTerm.toLowerCase())
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
            const prodRecipes = recipes.filter(r => r.recipe_id === product.id).map(r => ({
                quantity: Number(r.quantidade || r.quantity || 0),
                cost_per_unit: Number(r.insumos?.cost_per_unit || r.insumos?.custo_unitario || 0)
            }));
            const prodCost = calcularCustoTotal(prodRecipes);
            
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
                    <h3 className="font-black uppercase text-sm mb-1">{safeString(product)}</h3>
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
                    <h2 className="text-2xl font-black uppercase text-white mt-1">{safeString(selectedProduct)}</h2>
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
                    
                    {/* --- ÁREA DE ADIÇÃO DE INGREDIENTE --- */}
                    <div className="grid grid-cols-12 gap-4 items-end bg-[#161616] p-4 rounded-xl border border-stone-800">
                      
                      {/* 1. Seleção do Item */}
                      <div className="col-span-12 md:col-span-5 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-stone-500">Item do Estoque</label>
                        <select
                          value={selectedIngId}
                          onChange={(e) => {
                            setSelectedIngId(e.target.value);
                            setQuantity(0); // Resetar quantidade ao trocar item
                          }}
                          className="w-full p-3 rounded-lg bg-[#0a0a0a] border border-stone-700 text-xs font-bold text-white outline-none focus:border-orange-500 transition-colors appearance-none"
                        >
                          <option value="">Selecione um item...</option>
                          {ingredients.map((item) => (
                            <option key={item.id} value={item.id}>
                              {safeString(item)} ({safeString(item.unit || item.unidade)}) - {formatMoney(item.cost_per_unit || item.custo_unitario || 0)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Quantidade Usada */}
                      <div className="col-span-6 md:col-span-3 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-stone-500">Qtd. Usada</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          placeholder="0.000"
                          className="w-full p-3 rounded-lg bg-[#0a0a0a] border border-stone-700 text-xs font-bold text-white outline-none focus:border-orange-500 transition-colors"
                        />
                      </div>

                      {/* 3. Previsão de Custo (VISUAL NOVO) */}
                      <div className="col-span-6 md:col-span-2 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-stone-500">Custo</label>
                        <div className="p-3 bg-[#0a0a0a] border border-stone-800 rounded-lg text-xs font-black text-stone-300 text-right">
                          {(() => {
                            const item = ingredients.find(i => String(i.id) === selectedIngId);
                            const cost = item ? (Number(item.cost_per_unit || item.custo_unitario || 0)) * quantity : 0;
                            return formatMoney(cost);
                          })()}
                        </div>
                      </div>

                      {/* 4. Botão de Adicionar */}
                      <div className="col-span-12 md:col-span-2">
                        <button
                          onClick={handleAddIngredient}
                          disabled={!selectedIngId || quantity <= 0}
                          className="w-full p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 active:scale-95"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
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
                                <p className="text-xs font-black uppercase text-white">
                                  {safeString(item.name)}
                                </p>
                                <p className="text-[10px] text-stone-500">
                                   {item.quantity} {safeString(item.unit)} x {formatMoney(item.unitCost)}
                                </p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="font-mono font-bold text-white text-xs">
                                {formatMoney(item.totalCost)}
                             </div>
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

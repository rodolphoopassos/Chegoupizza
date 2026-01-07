import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ImageOff, LayoutGrid, Check, 
  UtensilsCrossed, Settings, ArrowUp, ArrowDown, X, Save, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ItemEditor } from '../components/ItemEditor';
import { toast, Toaster } from 'react-hot-toast';

// --- TIPOS ---
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
}

interface MenuEditorViewProps {
  user: any;
}

// --- MODAL DE GERENCIAR CATEGORIAS ---
const CategoryManagerModal = ({ 
  categories, 
  userId,
  onClose, 
  onUpdate 
}: { 
  categories: string[], 
  userId: string,
  onClose: () => void, 
  onUpdate: () => void 
}) => {
  const [localCats, setLocalCats] = useState<string[]>(categories);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCats = [...localCats];
    [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    setLocalCats(newCats);
  };

  const moveDown = (index: number) => {
    if (index === localCats.length - 1) return;
    const newCats = [...localCats];
    [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    setLocalCats(newCats);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(localCats[index]);
  };

  const saveRename = async (index: number) => {
    if (!editValue.trim() || editValue === localCats[index]) {
      setEditingIndex(null);
      return;
    }
    
    setLoading(true);
    const oldName = localCats[index];
    const newName = editValue.trim();

    try {
      // Atualiza todos os produtos com o nome antigo para o novo
      const { error } = await supabase
        .from('cardapio')
        .update({ categoria: newName })
        .eq('categoria', oldName);

      if (error) throw error;

      const newCats = [...localCats];
      newCats[index] = newName;
      setLocalCats(newCats);
      setEditingIndex(null);
      toast.success(`Categoria renomeada para "${newName}"`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao renomear categoria.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (catName: string) => {
    if (!window.confirm(`ATENÇÃO: Isso excluirá TODOS os produtos da categoria "${catName}". Continuar?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cardapio')
        .delete()
        .eq('categoria', catName);

      if (error) throw error;

      setLocalCats(localCats.filter(c => c !== catName));
      toast.success("Categoria e produtos excluídos.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('configuracoes_loja')
        .update({ ordem_categorias: localCats })
        .eq('id', userId);

      if (error) throw error;

      toast.success("Ordem salva com sucesso!");
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar ordem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#161616] w-full max-w-md rounded-3xl border border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-[#1a1a1a]">
          <h3 className="font-black text-white uppercase flex items-center gap-2">
            <Settings className="text-red-600" size={20} /> Gerenciar Categorias
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-white p-2 transition-colors"><X size={20}/></button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[60vh]">
           {localCats.length === 0 && <p className="text-center text-stone-500 text-xs py-10 font-bold uppercase tracking-widest opacity-50">Nenhuma categoria encontrada.</p>}
           
           {localCats.map((cat, idx) => (
             <div key={idx} className="flex items-center gap-2 bg-[#0f0f0f] p-3 rounded-xl border border-stone-800 group hover:border-stone-700 transition-colors">
                <div className="flex flex-col gap-1">
                   <button 
                     onClick={() => moveUp(idx)} 
                     disabled={idx === 0}
                     className="text-stone-600 hover:text-white disabled:opacity-20 transition-colors p-0.5"
                   ><ArrowUp size={14}/></button>
                   <button 
                     onClick={() => moveDown(idx)} 
                     disabled={idx === localCats.length - 1}
                     className="text-stone-600 hover:text-white disabled:opacity-20 transition-colors p-0.5"
                   ><ArrowDown size={14}/></button>
                </div>

                <div className="flex-1 px-2">
                   {editingIndex === idx ? (
                     <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-[#222] text-white text-xs font-bold p-2 rounded border border-red-600 outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(idx)}
                        />
                        <button onClick={() => saveRename(idx)} disabled={loading} className="bg-green-600 p-2 rounded text-white hover:bg-green-500 transition-colors"><Check size={14}/></button>
                     </div>
                   ) : (
                     <span className="text-sm font-black text-stone-300 uppercase tracking-tight">{cat}</span>
                   )}
                </div>

                {editingIndex !== idx && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => startEdit(idx)} className="p-2 text-stone-500 hover:text-blue-400 hover:bg-stone-800 rounded-lg transition-colors"><Edit2 size={14}/></button>
                     <button onClick={() => deleteCategory(cat)} className="p-2 text-stone-500 hover:text-red-500 hover:bg-stone-800 rounded-lg transition-colors"><Trash2 size={14}/></button>
                  </div>
                )}
             </div>
           ))}
        </div>

        <div className="p-4 border-t border-stone-800 bg-[#1a1a1a] flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-3 rounded-xl font-bold text-xs uppercase text-stone-500 hover:bg-stone-800 transition-colors">Cancelar</button>
           <button onClick={saveOrder} disabled={loading} className="px-6 py-3 rounded-xl font-bold text-xs uppercase bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg active:scale-95">
             {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
             Salvar Ordem
           </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const MenuEditorView = ({ user }: MenuEditorViewProps) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 1. Busca Itens
      const { data: itemsData, error: itemsError } = await supabase
        .from('cardapio')
        .select('*')
        .order('nome', { ascending: true });
      
      if (itemsError) throw itemsError;

      // 2. Busca Ordem Salva das Categorias
      let savedOrder: string[] = [];
      const { data: configData } = await supabase
        .from('configuracoes_loja')
        .select('ordem_categorias')
        .eq('id', user.id)
        .single();

      if (configData?.ordem_categorias) {
        savedOrder = configData.ordem_categorias;
      }

      if (itemsData) {
        const mappedItems = itemsData.map((item: any) => ({
          id: item.id,
          name: item.nome || 'Sem Nome',
          description: item.descricao || '',
          price: item.preco || 0,
          category: item.categoria || 'Outros',
          image_url: item.imagem_url || '',
          available: item.disponivel ?? true
        }));
        setItems(mappedItems);

        // 3. Extrai Categorias e Ordena
        const uniqueCats = Array.from(new Set(mappedItems.map((i: any) => i.category))) as string[];
        
        const sortedCats = uniqueCats.sort((a, b) => {
           const idxA = savedOrder.indexOf(a);
           const idxB = savedOrder.indexOf(b);
           if (idxA !== -1 && idxB !== -1) return idxA - idxB;
           if (idxA !== -1) return -1;
           if (idxB !== -1) return 1;
           return a.localeCompare(b);
        });

        setDynamicCategories(sortedCats);
      }
    } catch (err: any) {
      console.error("Erro fetchItems:", err);
      toast.error("Erro ao carregar cardápio.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    if (deleteConfirmId === id) {
      performDelete(id);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const performDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('cardapio').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
      toast.success('Item excluído!');
    } catch (err) {
      toast.error('Erro ao excluir.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#111111] -m-4 md:-m-12 text-white min-h-screen font-sans overflow-hidden">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-8 border-b border-stone-800 bg-[#111] shrink-0">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white mb-1">Editor de Cardápio</h1>
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Painel Administrativo de Produtos</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setIsEditorOpen(true); }}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR DINÂMICA */}
        <div className="w-64 bg-[#161616] border-r border-stone-800 p-6 flex flex-col gap-2 overflow-y-auto hidden md:flex shrink-0 custom-scrollbar">
           <div className="flex items-center justify-between mb-4 px-2">
              <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Filtrar Categoria</p>
              <button 
                onClick={() => setIsCatManagerOpen(true)}
                className="text-stone-600 hover:text-white transition-colors p-1"
                title="Gerenciar Categorias"
              >
                <Settings size={14} />
              </button>
           </div>
           
           <button
             onClick={() => setActiveCategory('Todas')}
             className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest text-left ${
               activeCategory === 'Todas' 
               ? 'bg-red-600 text-white shadow-lg border border-red-500' 
               : 'text-stone-500 hover:bg-stone-800 hover:text-white border border-transparent'
             }`}
           >
             <UtensilsCrossed size={16}/> Todas
           </button>

           {dynamicCategories.map(cat => (
             <button
               key={cat}
               onClick={() => setActiveCategory(cat)}
               className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest text-left truncate ${
                 activeCategory === cat 
                 ? 'bg-red-600 text-white shadow-lg border border-red-500' 
                 : 'text-stone-500 hover:bg-stone-800 hover:text-white border border-transparent'
               }`}
             >
               <div className="w-2 h-2 rounded-full bg-current shrink-0" />
               {cat}
             </button>
           ))}
        </div>

        {/* GRID */}
        <div className="flex-1 p-8 overflow-y-auto bg-[#0f0f0f] custom-scrollbar">
          <div className="mb-8 relative max-w-md">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600" size={18} />
             <input 
               type="text" 
               placeholder="Pesquisar no catálogo..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-[#161616] border border-stone-800 rounded-xl py-3.5 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-stone-600 transition-colors placeholder-stone-700"
             />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-stone-600" size={32} />
              <span className="text-stone-600 font-bold text-[10px] uppercase tracking-widest">Sincronizando Banco...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="group bg-[#161616] rounded-2xl border border-stone-800 overflow-hidden flex flex-col hover:border-stone-700 transition-all shadow-sm">
                  
                  <div className="relative h-48 bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-b border-stone-800">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-stone-700">
                        <ImageOff size={32} />
                        <span className="text-[10px] font-black uppercase">Sem Foto</span>
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${item.available ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                       {item.available ? 'Ativo' : 'Esgotado'}
                    </div>
                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[8px] font-black uppercase text-white border border-white/10">
                       {item.category}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-black text-sm uppercase text-white mb-1 truncate">{item.name}</h3>
                      <p className="text-[10px] text-stone-500 font-bold line-clamp-2 leading-relaxed mb-4 min-h-[2.5em]">
                        {item.description || "Sem descrição definida."}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between">
                       <span className="text-red-500 font-black text-lg">{formatMoney(item.price)}</span>
                    </div>
                  </div>

                  <div className="bg-[#111] p-2 flex gap-2 border-t border-stone-800">
                    <button 
                       onClick={() => { setEditingItem(item); setIsEditorOpen(true); }}
                       className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-stone-700"
                    >
                       <Edit2 size={12} /> Editar
                    </button>
                    
                    <button 
                       onClick={() => handleDeleteClick(item.id)}
                       className={`w-10 rounded-lg flex items-center justify-center transition-all duration-300 border ${
                         deleteConfirmId === item.id 
                         ? 'bg-red-600 text-white border-red-600 w-24' 
                         : 'bg-stone-900 text-stone-500 border-stone-800 hover:text-red-500 hover:border-red-900/50'
                       }`}
                    >
                       {deleteConfirmId === item.id ? (
                         <span className="text-[9px] font-black uppercase animate-in fade-in">Confirmar?</span>
                       ) : (
                         <Trash2 size={14} />
                       )}
                    </button>
                  </div>
                </div>
              ))}
              
              {!loading && filteredItems.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-stone-800 rounded-3xl">
                   <p className="text-stone-600 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhum item encontrado nesta categoria</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditorOpen && (
        <ItemEditor 
          item={editingItem} 
          existingCategories={dynamicCategories}
          onClose={() => setIsEditorOpen(false)} 
          onSave={fetchItems} 
        />
      )}

      {isCatManagerOpen && (
        <CategoryManagerModal
           categories={dynamicCategories}
           userId={user.id}
           onClose={() => setIsCatManagerOpen(false)}
           onUpdate={fetchItems}
        />
      )}
    </div>
  );
};
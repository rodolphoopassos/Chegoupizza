
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Save, Tag, DollarSign, Image as ImageIcon, LayoutGrid, 
  CheckCircle2, ChevronDown, Upload, Loader2, Trash2, 
  Scale, AlertTriangle, TrendingUp, Plus
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { calcularCustoTotal } from '../utils/helpers';

interface RecipeIngredient {
  stockId: string;
  quantity: number;
}

interface MenuItem {
  id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
  ingredientes?: RecipeIngredient[];
}

interface StockItem {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface ItemEditorProps {
  item?: MenuItem | null;
  existingCategories: string[];
  onClose: () => void;
  onSave: () => void;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({ item, existingCategories, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  const sectionGeral = useRef<HTMLDivElement>(null);
  const sectionPrecos = useRef<HTMLDivElement>(null);
  const sectionIngredientes = useRef<HTMLDivElement>(null);
  const sectionImagens = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<MenuItem>({
    name: '',
    description: '',
    price: 0,
    category: existingCategories[0] || 'Outros',
    image_url: '',
    available: true,
    ingredientes: []
  });

  useEffect(() => {
    fetchStock();
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price || 0,
        category: item.category || 'Outros',
        image_url: item.image_url || '',
        available: item.available ?? true,
        ingredientes: item.ingredientes || []
      });
    }
  }, [item]);

  const fetchStock = async () => {
    const { data } = await supabase.from('estoque').select('id, name, unit, cost_per_unit').order('name');
    if (data) setStockItems(data);
  };

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>, tabName: string) => {
    setActiveTab(tabName);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- CÁLCULOS DE CUSTO ---
  const cmvTotal = useMemo(() => {
    // Prepara os dados para o helper calcularCustoTotal
    const ingredientsWithCost = (formData.ingredientes || []).map(ing => {
       const stock = stockItems.find(s => s.id === ing.stockId);
       return {
         quantity: ing.quantity,
         cost_per_unit: stock?.cost_per_unit || 0
       };
    });
    return calcularCustoTotal(ingredientsWithCost);
  }, [formData.ingredientes, stockItems]);

  const profitMargin = useMemo(() => {
    if (formData.price <= 0) return 0;
    return ((formData.price - cmvTotal) / formData.price) * 100;
  }, [formData.price, cmvTotal]);

  // --- GESTÃO DE INGREDIENTES ---
  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredientes: [...(formData.ingredientes || []), { stockId: '', quantity: 0 }]
    });
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const newIngs = [...(formData.ingredientes || [])];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setFormData({ ...formData, ingredientes: newIngs });
  };

  const removeIngredient = (index: number) => {
    const newIngs = (formData.ingredientes || []).filter((_, i) => i !== index);
    setFormData({ ...formData, ingredientes: newIngs });
  };

  // --- UPLOAD DE IMAGEM ---
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('produtos').upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('produtos').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: data.publicUrl });
      toast.success('Imagem carregada!');
    } catch (error: any) {
      toast.error('Erro no upload. Verifique o bucket "produtos".');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || formData.price <= 0) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: formData.name,
        descricao: formData.description,
        preco: parseFloat(formData.price.toString()),
        categoria: formData.category,
        imagem_url: formData.image_url,
        disponivel: formData.available,
        ingredientes: formData.ingredientes // Salvando a ficha técnica como JSON
      };

      if (item?.id) {
        const { error } = await supabase.from('cardapio').update(payload).eq('id', item.id);
        if (error) throw error;
        toast.success('Item atualizado!');
      } else {
        const { error } = await supabase.from('cardapio').insert([payload]);
        if (error) throw error;
        toast.success('Item criado!');
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#111] w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl border border-stone-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 text-white font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-stone-800 bg-[#111] shrink-0">
          <div>
             <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <LayoutGrid className="text-red-600" size={24} />
                {item ? `Editando: ${item.name}` : 'Novo Produto'}
             </h2>
             <p className="text-[10px] text-stone-500 font-bold mt-1 uppercase tracking-[0.2em]">Configuração Técnica e Comercial</p>
          </div>
          <div className="flex gap-3">
             <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-stone-500 hover:bg-stone-800 transition-colors flex items-center gap-2"><X size={18} /> Cancelar</button>
             <button onClick={handleSave} disabled={loading} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"><Save size={18} /> {loading ? 'Gravando...' : 'Salvar Item'}</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
           
           {/* SIDEBAR */}
           <div className="w-72 bg-[#161616] border-r border-stone-800 p-6 flex flex-col gap-2 overflow-y-auto hidden md:flex shrink-0">
              <p className="text-[9px] font-black text-stone-600 uppercase tracking-widest mb-4">Navegação</p>
              <button onClick={() => scrollToSection(sectionGeral, 'geral')} className={`flex items-center justify-between p-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest ${activeTab === 'geral' ? 'bg-red-600 text-white' : 'text-stone-500 hover:bg-stone-800'}`}>
                <div className="flex items-center gap-3"><Tag size={16}/> Geral</div>
              </button>
              <button onClick={() => scrollToSection(sectionPrecos, 'precos')} className={`flex items-center justify-between p-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest ${activeTab === 'precos' ? 'bg-red-600 text-white' : 'text-stone-500 hover:bg-stone-800'}`}>
                <div className="flex items-center gap-3"><DollarSign size={16}/> Preços</div>
              </button>
              <button onClick={() => scrollToSection(sectionIngredientes, 'ingredientes')} className={`flex items-center justify-between p-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest ${activeTab === 'ingredientes' ? 'bg-red-600 text-white' : 'text-stone-500 hover:bg-stone-800'}`}>
                <div className="flex items-center gap-3"><Scale size={16}/> Ingredientes</div>
                {formData.ingredientes && formData.ingredientes.length > 0 && <span className="bg-white/20 px-1.5 rounded text-[8px]">{formData.ingredientes.length}</span>}
              </button>
              <button onClick={() => scrollToSection(sectionImagens, 'imagens')} className={`flex items-center justify-between p-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest ${activeTab === 'imagens' ? 'bg-red-600 text-white' : 'text-stone-500 hover:bg-stone-800'}`}>
                <div className="flex items-center gap-3"><ImageIcon size={16}/> Mídia</div>
              </button>

              <div className="mt-auto p-4 bg-stone-900/50 rounded-2xl border border-stone-800">
                 <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-2">Resumo Financeiro</p>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                       <span className="text-stone-600">Custo (CMV):</span>
                       <span className="text-stone-300">R$ {cmvTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                       <span className="text-stone-600">Margem:</span>
                       <span className={profitMargin > 60 ? 'text-green-500' : 'text-amber-500'}>{profitMargin.toFixed(1)}%</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* FORMULÁRIO */}
           <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
              <div className="max-w-4xl mx-auto space-y-12 pb-24">
                 
                 {/* GERAL */}
                 <div ref={sectionGeral} className="bg-[#161616] p-8 rounded-[2rem] border border-stone-800 space-y-6 scroll-mt-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3 border-b border-stone-800 pb-4 mb-6">
                       <Tag className="text-red-600" size={20} /> Informações Básicas
                    </h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Nome do Item no Cardápio</label>
                       <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Pizza Margherita" className="w-full bg-[#222] border border-stone-700 rounded-xl py-3 px-4 font-bold text-white outline-none focus:ring-1 focus:ring-red-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Descrição Comercial</label>
                       <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes que vendem..." rows={3} className="w-full bg-[#222] border border-stone-700 rounded-xl py-3 px-4 font-bold text-white outline-none focus:ring-1 focus:ring-red-600 transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Categoria</label>
                          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#222] border border-stone-700 rounded-xl py-3 px-4 font-bold text-white outline-none">
                             {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Disponibilidade</label>
                          <button onClick={() => setFormData({...formData, available: !formData.available})} className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.available ? 'bg-green-600/10 border-green-600 text-green-500' : 'bg-red-600/10 border-red-600 text-red-500'}`}>
                             {formData.available ? 'Ativo no Cardápio' : 'Indisponível'}
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* PREÇOS */}
                 <div ref={sectionPrecos} className="bg-[#161616] p-8 rounded-[2rem] border border-stone-800 space-y-6 scroll-mt-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3 border-b border-stone-800 pb-4 mb-6">
                       <DollarSign className="text-red-600" size={20} /> Estratégia de Preço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Preço de Venda (R$)</label>
                          <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold">R$</span>
                             <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full bg-[#222] border border-stone-700 rounded-xl py-4 pl-12 pr-4 font-black text-white text-2xl outline-none focus:ring-1 focus:ring-red-600" />
                          </div>
                       </div>
                       <div className="bg-stone-900/50 p-4 rounded-2xl border border-stone-800">
                          <div className="flex items-center gap-2 text-blue-500 mb-2">
                             <TrendingUp size={16}/>
                             <span className="text-[10px] font-black uppercase tracking-widest">Rentabilidade Prevista</span>
                          </div>
                          <p className={`text-xl font-black ${profitMargin > 65 ? 'text-green-500' : 'text-amber-500'}`}>{profitMargin.toFixed(1)}% de Margem</p>
                          <p className="text-[9px] text-stone-500 mt-1 uppercase font-bold">Lucro Bruto: R$ {(formData.price - cmvTotal).toFixed(2)}</p>
                       </div>
                    </div>
                 </div>

                 {/* INGREDIENTES */}
                 <div ref={sectionIngredientes} className="bg-[#161616] p-8 rounded-[2rem] border border-stone-800 space-y-6 scroll-mt-6">
                    <div className="flex justify-between items-center border-b border-stone-800 pb-4 mb-6">
                       <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                          <Scale className="text-red-600" size={20} /> Ficha Técnica
                       </h3>
                       <button type="button" onClick={addIngredient} className="text-blue-500 hover:text-blue-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <Plus size={14} /> Adicionar Insumo
                       </button>
                    </div>

                    <div className="space-y-3">
                       {formData.ingredientes?.map((ing, idx) => (
                          <div key={idx} className="flex gap-4 items-end bg-[#222] p-4 rounded-2xl border border-stone-700 animate-in slide-in-from-left duration-300">
                             <div className="flex-1 space-y-2">
                                <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1">Insumo do Estoque</label>
                                <select value={ing.stockId} onChange={(e) => updateIngredient(idx, 'stockId', e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none">
                                   <option value="">Selecione...</option>
                                   {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                                </select>
                             </div>
                             <div className="w-24 space-y-2 text-center">
                                <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Qtd</label>
                                <input type="number" step="0.001" value={ing.quantity} onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-stone-900 border border-stone-700 rounded-xl py-2 text-center text-xs font-black text-white outline-none" />
                             </div>
                             <button type="button" onClick={() => removeIngredient(idx)} className="p-2 text-stone-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                          </div>
                       ))}
                       {(!formData.ingredientes || formData.ingredientes.length === 0) && (
                          <div className="text-center py-10 border-2 border-dashed border-stone-800 rounded-[2rem]">
                             <AlertTriangle className="mx-auto text-stone-700 mb-2" size={24}/>
                             <p className="text-stone-600 font-bold uppercase text-[10px] tracking-widest">Nenhum ingrediente vinculado. CMV = R$ 0.00</p>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* MÍDIA */}
                 <div ref={sectionImagens} className="bg-[#161616] p-8 rounded-[2rem] border border-stone-800 space-y-6 scroll-mt-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3 border-b border-stone-800 pb-4 mb-6">
                       <ImageIcon className="text-red-600" size={20} /> Foto do Produto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="md:col-span-2 space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">URL da Imagem</label>
                             <input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." className="w-full bg-[#222] border border-stone-700 rounded-xl py-3 px-4 font-bold text-stone-400 text-xs truncate outline-none" />
                          </div>
                          <label className={`flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${uploading ? 'bg-stone-800 border-stone-700' : 'border-stone-700 hover:border-red-600 hover:bg-stone-800'}`}>
                             {uploading ? <Loader2 className="animate-spin text-red-600" /> : (
                                <>
                                   <Upload size={24} className="text-stone-500 mb-2" />
                                   <span className="text-[10px] font-black uppercase text-stone-500 tracking-widest">Upload para Servidor</span>
                                </>
                             )}
                             <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                       </div>
                       <div className="aspect-square bg-stone-900 rounded-[2.5rem] border border-stone-800 overflow-hidden flex items-center justify-center relative shadow-inner">
                          {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-stone-800" />}
                       </div>
                    </div>
                 </div>

              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

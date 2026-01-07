
import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  X, 
  Loader2, 
  Sparkles, 
  Database,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Camera
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { GoogleGenAI } from "@google/genai";

interface InventoryPageProps {
  user?: any;
}

// --- FUNÇÃO BLINDADA (SAFE STRING) ---
// Evita erros de renderização como [object Object]
const safeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  
  if (typeof val === 'object') {
    const candidate = val.name || val.nome || val.label || val.description || val.code || val.unit;
    if (candidate !== undefined && candidate !== null) {
        if (typeof candidate === 'object') return safeString(candidate); // Recursividade para objetos aninhados
        return String(candidate);
    }
    return '';
  }
  
  return String(val);
};

const ConfirmModal = ({ isOpen, onCancel, onConfirm, title, message, loading }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-800">
        <div className="p-8 text-center">
          <div className="mx-auto w-14 h-14 bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-sm text-stone-400 mb-8">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-stone-400 hover:bg-stone-800 transition-colors uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InventoryPage: React.FC<InventoryPageProps> = ({ user }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, isOpen: boolean }>({ id: '', isOpen: false });

  // Estado do formulário usando 'quantity' conforme estrutura do banco
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    code: '',
    unit: 'KG',
    min_stock: '10',
    quantity: '0', 
    cost_per_unit: '0',
    supplier: ''
  });

  const fetchInventory = async () => {
    if (!user) return;
    setLoading(true);

    if (user.id === 'demo-user') {
      if (items.length === 0) {
        setItems([
          { id: '1', code: '05601252231164', name: 'AZEITE OLIV GALLO EX VIR VD 500ML', category: 'Mercearia', quantity: 1.00, min_stock: 5.00, unit: 'UN', cost_per_unit: 33.69 },
          { id: '2', code: '07896272004203', name: 'AZEITONA VDE VALE FERTIL SCAR DP 12', category: 'Conservas', quantity: 3.00, min_stock: 10.00, unit: 'UN', cost_per_unit: 8.49 },
          { id: '3', code: '07893000444232', name: 'LING CALAB SADIA TRAD PCT 2,5KG', category: 'Frios', quantity: 1.00, min_stock: 5.00, unit: 'UN', cost_per_unit: 77.25 },
          { id: '4', code: '02900000123335', name: 'LOMBO DEFUMADO FRIMESA KG', category: 'Frios', quantity: 0.36, min_stock: 1.00, unit: 'KG', cost_per_unit: 66.35 },
          { id: '5', code: '02900002214307', name: 'QUEIJO MUSS ARGE LA PAULINA BARR KG', category: 'Laticínios', quantity: 3.55, min_stock: 10.00, unit: 'KG', cost_per_unit: 36.90 },
          { id: '6', code: '07894900027013', name: 'REFRIG COCA COLA ORIG PET 2L', category: 'Bebidas', quantity: 1.00, min_stock: 12.00, unit: 'UN', cost_per_unit: 10.99 },
        ]);
      }
      setLoading(false);
      return;
    }

    try {
      // Consulta à tabela 'estoque' trazendo todos os campos
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

      if (error) throw error;

      if (data) {
        // Mapeamento de segurança
        const safeData = data.map(item => ({
          ...item,
          // Mapeia tanto quantity quanto stock_quantity para garantir compatibilidade
          stock_quantity: Number(item.quantity ?? item.stock_quantity ?? 0),
          quantity: Number(item.quantity ?? item.stock_quantity ?? 0),
          
          // Garante números
          min_stock: Number(item.min_stock ?? item.min_quantity ?? 0),
          cost_per_unit: Number(item.cost_per_unit ?? 0),
          
          // Strings seguras
          name: safeString(item.name || 'Sem Nome'),
          category: safeString(item.category || ''),
          unit: safeString(item.unit || 'UN'),
          code: safeString(item.code),
          supplier: safeString(item.supplier)
        }));
        
        setItems(safeData);
      }
    } catch (e: any) {
      console.error('Erro ao buscar estoque:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, [user]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsScanning(true);
    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Analise este documento de compra (nota fiscal/romaneio).
      Extraia os itens de insumo. Retorne APENAS um array JSON:
      [{"name": "NOME DO ITEM", "code": "EAN OU CODIGO", "unit": "KG/UN/LT", "quantity": 0, "cost_per_unit": 0, "category": "Categoria Sugerida"}]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ text: prompt }, { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }]
      });

      const jsonMatch = response.text?.match(/\[.*\]/s);
      if (jsonMatch) {
        const detected = JSON.parse(jsonMatch[0]);
        for (const item of detected) {
          const payload = { 
            ...item, 
            name: safeString(item.name),
            category: safeString(item.category),
            quantity: Number(item.quantity || item.stock_quantity || 0),
            user_id: user.id, 
            min_stock: 10 
          };
          
          if (user.id === 'demo-user') {
            setItems(prev => [{ ...payload, id: Math.random().toString() }, ...prev]);
          } else {
            await supabase.from('estoque').insert(payload);
          }
        }
        alert(`${detected.length} itens identificados com sucesso!`);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar nota fiscal.");
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    
    // Carrega dados para edição, convertendo para string e protegendo contra null/undefined
    setFormData({
      name: safeString(item.name),
      category: safeString(item.category),
      code: safeString(item.code),
      unit: safeString(item.unit),
      min_stock: item.min_stock !== null ? String(item.min_stock) : '0',
      quantity: item.quantity !== null ? String(item.quantity) : (item.stock_quantity ? String(item.stock_quantity) : '0'),
      cost_per_unit: item.cost_per_unit !== null ? String(item.cost_per_unit) : '0',
      supplier: safeString(item.supplier)
    });
    
    setIsAddModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      name: safeString(formData.name).toUpperCase(),
      category: safeString(formData.category).toUpperCase(),
      code: safeString(formData.code) || `SCAN-${Math.floor(Math.random() * 10000)}`,
      unit: safeString(formData.unit),
      
      // O .replace(',', '.') troca a vírgula por ponto antes de converter
      min_stock: parseFloat(String(formData.min_stock).replace(',', '.')) || 0,
      quantity: parseFloat(String(formData.quantity).replace(',', '.')) || 0,
      cost_per_unit: parseFloat(String(formData.cost_per_unit).replace(',', '.')) || 0,
      
      supplier: safeString(formData.supplier).toUpperCase() || 'NÃO DEFINIDO',
      user_id: user.id
    };

    try {
      if (user.id === 'demo-user') {
        if (editingId) {
          setItems(prev => prev.map(i => i.id === editingId ? { ...payload, id: editingId } : i));
        } else {
          setItems(prev => [{ ...payload, id: Math.random().toString() }, ...prev]);
        }
      } else {
        if (editingId) {
          await supabase.from('estoque').update(payload).eq('id', editingId).eq('user_id', user.id);
        } else {
          await supabase.from('estoque').insert(payload);
        }
        fetchInventory();
      }
      setIsAddModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteStockItem = async () => {
    const { id } = confirmDelete;
    if (!id) return;
    setLoading(true);

    if (user.id === 'demo-user') {
      setItems(prev => prev.filter(item => String(item.id) !== String(id)));
    } else {
      await supabase.from('estoque').delete().eq('id', id).eq('user_id', user.id);
      fetchInventory();
    }
    setConfirmDelete({ id: '', isOpen: false });
    setLoading(false);
  };

  const filteredItems = items.filter(i => 
    safeString(i.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
    safeString(i.code).includes(searchTerm) ||
    safeString(i.category).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
        <Loader2 className="animate-spin text-blue-600" size={64}/>
        <p className="text-stone-500 font-black uppercase tracking-[0.3em] text-[10px]">Acessando Banco de Dados...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 max-w-[1400px] mx-auto pb-20 px-2 md:px-0">
      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onCancel={() => setConfirmDelete({ id: '', isOpen: false })}
        onConfirm={executeDeleteStockItem}
        title="Excluir do Inventário"
        message="Deseja realmente remover este insumo permanentemente?"
        loading={loading}
      />

      {/* --- HEADER --- */}
      <div className="bg-[#1c1917] border border-stone-800 p-8 rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-xl shadow-blue-900/30">
            <Package className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-white leading-none">Inventário de Insumos</h2>
            <div className="flex items-center gap-2 mt-2">
                <Database size={14} className="text-stone-500" />
                <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">Gestão de Estoque e Valorização</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={16}/>
                <input 
                    type="text" 
                    placeholder="Filtrar insumo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-stone-900/50 border border-stone-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => scanInputRef.current?.click()}
                  disabled={isScanning}
                  className="flex-1 sm:flex-none border border-stone-700 bg-stone-800/50 text-stone-300 hover:text-white hover:bg-stone-800 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isScanning ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Sparkles size={16} className="text-blue-500" />}
                  {isScanning ? 'Lendo...' : 'Scanner Nota Fiscal'}
                </button>
                <input type="file" ref={scanInputRef} className="hidden" capture="environment" accept="image/*" onChange={handleScanReceipt} />

                <button 
                    onClick={() => { setEditingId(null); setFormData({ name: '', category: '', code: '', unit: 'KG', min_stock: '10', quantity: '0', cost_per_unit: '0', supplier: '' }); setIsAddModalOpen(true); }}
                    className="flex-1 sm:flex-none bg-blue-600 text-white hover:bg-blue-700 font-black py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 text-[10px] uppercase tracking-widest active:scale-95"
                >
                    <Plus size={18} strokeWidth={3}/> Novo Item
                </button>
            </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-[#121212] rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-800">
         <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#2563eb] text-white">
                    <tr className="uppercase font-black text-[10px] tracking-widest">
                        <th className="py-6 px-8">Código</th>
                        <th className="py-6 px-4">Ingrediente</th>
                        <th className="py-6 px-4">Categoria</th>
                        <th className="py-6 px-4 text-center">Unidade</th>
                        <th className="py-6 px-4 text-center">Custo Unit.</th>
                        <th className="py-6 px-4 text-center">Estoque Atual</th>
                        <th className="py-6 px-4 text-center">Valor Total</th>
                        <th className="py-6 px-8 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                    {filteredItems.map((item) => {
                        const valorTotal = (Number(item.quantity) || 0) * (Number(item.cost_per_unit) || 0);
                        const isLow = (Number(item.quantity) || 0) <= (Number(item.min_stock) || 0);
                        
                        return (
                            <tr key={item.id} className="hover:bg-stone-800/20 transition-all group">
                                <td className="py-6 px-8 font-mono text-[11px] text-stone-500 tracking-tighter">
                                    {safeString(item.code) || '---'}
                                </td>
                                <td className="py-6 px-4 font-black text-xs text-white uppercase group-hover:text-blue-400 transition-colors">
                                    {safeString(item.name)}
                                </td>
                                <td className="py-6 px-4 text-[10px] font-bold text-stone-500 uppercase">
                                    {safeString(item.category)}
                                </td>
                                <td className="py-6 px-4 text-center">
                                    <span className="bg-stone-900 text-stone-400 px-3 py-1 rounded-lg text-[9px] font-black border border-stone-800">
                                        {safeString(item.unit)}
                                    </span>
                                </td>
                                <td className="py-6 px-4 text-center font-bold text-white text-sm">
                                    R$ {Number(item.cost_per_unit || 0).toFixed(2)}
                                </td>
                                <td className={`py-6 px-4 text-center font-black text-sm ${isLow ? 'text-red-500 animate-pulse' : 'text-stone-300'}`}>
                                    {Number(item.quantity || 0).toFixed(2)}
                                </td>
                                <td className="py-6 px-4 text-center font-black text-blue-500 text-sm">
                                    R$ {valorTotal.toFixed(2)}
                                </td>
                                <td className="py-6 px-8 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        <button 
                                          onClick={() => handleEditClick(item)}
                                          className="p-2.5 bg-stone-900 text-stone-500 hover:text-white hover:bg-blue-600 rounded-xl transition-all shadow-sm"
                                        >
                                            <Pencil size={14}/>
                                        </button>
                                        <button 
                                            onClick={() => setConfirmDelete({ id: item.id, isOpen: true })}
                                            className="p-2.5 bg-stone-900 text-stone-500 hover:text-white hover:bg-red-600 rounded-xl transition-all shadow-sm"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
         </div>
      </div>

      {/* --- MODAL --- */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-[#121212] w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-stone-800 animate-in zoom-in-95">
                  <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl">{editingId ? <Pencil size={24}/> : <Plus size={24} strokeWidth={3}/>}</div>
                        <h3 className="font-black text-xl uppercase tracking-tighter">{editingId ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"><X/></button>
                  </div>

                  <form onSubmit={handleSaveItem} className="p-10 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Nome do Ingrediente</label>
                              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="EX: MUSSARELA KG"/>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Categoria</label>
                              <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="Ex: Laticínios"/>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Código de Barras/EAN</label>
                              <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-white font-mono outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="0000000000000"/>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Fornecedor</label>
                              <input value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="Ex: Atacadão"/>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Unidade</label>
                              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-white font-black appearance-none outline-none">
                                  <option value="KG">KG</option>
                                  <option value="UN">UN</option>
                                  <option value="LT">LT</option>
                                  <option value="GR">GR</option>
                                  <option value="CX">CX</option>
                              </select>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Saldo Atual</label>
                              <input type="number" step="0.01" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-white font-black text-center outline-none"/>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest ml-1">Custo Unit.</label>
                              <input type="number" step="0.01" required value={formData.cost_per_unit} onChange={e => setFormData({...formData,cost_per_unit: e.target.value})} className="w-full bg-stone-900/50 border border-stone-800 p-4 rounded-2xl text-blue-400 font-black text-center outline-none"/>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-red-500 tracking-widest ml-1">Alerta Mín.</label>
                              <input type="number" step="0.01" required value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} className="w-full bg-red-950/10 border border-red-900/30 p-4 rounded-2xl text-red-500 font-black text-center outline-none"/>
                          </div>
                      </div>

                      <div className="flex justify-end gap-6 pt-10 border-t border-stone-800">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-8 py-4 rounded-2xl font-black text-stone-500 uppercase text-[10px] tracking-widest">Cancelar</button>
                          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white font-black py-4 px-16 rounded-2xl flex items-center gap-3 shadow-2xl shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50 uppercase text-[10px] tracking-widest">
                            {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
                            {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Clock, 
  MapPin, 
  Save, 
  Upload, 
  Plus, 
  Trash2, 
  Globe, 
  Settings, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  Home, 
  Navigation,
  DollarSign,
  Smartphone,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface OpeningHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  timeEstimate: string;
}

export const StoreSettingsView: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'Geral' | 'Horarios' | 'Entrega'>('Geral');
  const [deliverySubTab, setDeliverySubTab] = useState<'Taxas' | 'Endereco'>('Taxas');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // States - Geral
  const [storeName, setStoreName] = useState('Chegou Pizza');
  const [storeSlug, setStoreSlug] = useState('chegou-pizza-slz');
  const [minOrder, setMinOrder] = useState(15.00);
  const [acceptDelivery, setAcceptDelivery] = useState(true);
  const [acceptPickup, setAcceptPickup] = useState(true);

  // States - Endereço
  const [storeAddress, setStoreAddress] = useState({
    street: 'Rua Primeiro de Maio',
    number: '13',
    complement: 'Casa',
    reference: 'Próximo à Praça',
    neighborhood: 'São Bernardo',
    city: 'São Luís',
    state: 'MA',
    zip: '65056-305'
  });

  // States - Horários
  const [hours, setHours] = useState<OpeningHour[]>([
    { day: 'Segunda-feira', open: '18:00', close: '23:00', closed: false },
    { day: 'Terça-feira', open: '18:00', close: '23:00', closed: true },
    { day: 'Quarta-feira', open: '18:00', close: '23:00', closed: false },
    { day: 'Quinta-feira', open: '18:00', close: '23:00', closed: false },
    { day: 'Sexta-feira', open: '18:30', close: '00:00', closed: false },
    { day: 'Sábado', open: '18:30', close: '00:00', closed: false },
    { day: 'Domingo', open: '18:00', close: '23:30', closed: false },
  ]);

  // States - Entrega
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([
    { id: '1', name: 'Centro', price: 5.00, timeEstimate: '30-40 min' },
    { id: '2', name: 'Cohab', price: 8.00, timeEstimate: '40-50 min' },
    { id: '3', name: 'Renascença', price: 10.00, timeEstimate: '45-55 min' },
  ]);

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user || user.id === 'demo-user') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Corrected: using 'id' instead of 'user_id' for this table
      const { data, error } = await supabase
        .from('configuracoes_loja')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') throw error;
      }

      if (data) {
        setStoreName(data.nome_loja || '');
        setStoreSlug(data.slug_loja || '');
        setMinOrder(data.pedido_minimo || 0);
        setAcceptDelivery(data.aceita_delivery ?? true);
        setAcceptPickup(data.aceita_retirada ?? true);
        if (data.endereco) setStoreAddress(data.endereco);
        if (data.horarios) setHours(data.horarios);
        if (data.zonas_entrega) setDeliveryZones(data.zonas_entrega);
      }
    } catch (e: any) {
      console.error("Error fetching settings:", e.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    const payload: any = {
      nome_loja: storeName,
      slug_loja: storeSlug,
      pedido_minimo: minOrder,
      aceita_delivery: acceptDelivery,
      aceita_retirada: acceptPickup,
      endereco: storeAddress,
      horarios: hours,
      zonas_entrega: deliveryZones,
      updated_at: new Date()
    };

    if (user.id !== 'demo-user') {
      payload.id = user.id; // Map user ID to record ID
    } else {
      setTimeout(() => {
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 1000);
      return;
    }

    try {
      // Upsert by primary key 'id'
      const { error } = await supabase
        .from('configuracoes_loja')
        .upsert(payload);

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error("Error saving settings:", e.message || e);
      alert("Erro ao salvar as configurações: " + (e.message || "Tente novamente mais tarde."));
    } finally {
      setSaving(false);
    }
  };

  const handleHourChange = (index: number, field: keyof OpeningHour, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const addZone = () => {
    const name = prompt("Nome do Bairro:");
    if (name) {
      setDeliveryZones([...deliveryZones, { 
        id: Math.random().toString(), 
        name: name.toUpperCase(), 
        price: 0, 
        timeEstimate: '30-40 min' 
      }]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-40 gap-4">
        <Loader2 className="animate-spin text-red-600" size={48} />
        <p className="text-stone-500 font-black uppercase tracking-[0.3em] text-[10px]">Sincronizando Central de Configurações...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] shadow-xl border border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-900/20">
             <Settings size={28} />
           </div>
           <div>
              <h2 className="text-3xl font-black text-stone-800 dark:text-white uppercase tracking-tighter leading-none">Painel Administrativo</h2>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em] mt-2">Configuração Geral de Operação</p>
           </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest ${
            saveSuccess 
            ? 'bg-green-600 text-white shadow-green-900/20' 
            : 'bg-stone-900 dark:bg-red-600 text-white shadow-red-900/20'
          }`}
        >
           {saving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
           {saving ? 'Gravando...' : saveSuccess ? 'Alterações Aplicadas' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
        
        <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
           {[
             { id: 'Geral', icon: <Store size={18}/>, label: 'Dados do Negócio' },
             { id: 'Horarios', icon: <Clock size={18}/>, label: 'Horários de Pico' },
             { id: 'Entrega', icon: <MapPin size={18}/>, label: 'Logística de Entrega' },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center justify-between p-5 rounded-[1.5rem] font-black transition-all text-[11px] uppercase tracking-widest border ${
                 activeTab === tab.id 
                 ? 'bg-red-600 text-white shadow-xl shadow-red-900/30 border-red-600' 
                 : 'bg-white dark:bg-stone-900 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 border-stone-100 dark:border-stone-800 shadow-sm'
               }`}
             >
               <div className="flex items-center gap-4">
                  {tab.icon}
                  {tab.label}
               </div>
               <ChevronRight size={16} className={activeTab === tab.id ? 'opacity-100' : 'opacity-0'} />
             </button>
           ))}

           <div className="mt-auto p-8 bg-blue-600/5 dark:bg-blue-600/10 rounded-[2rem] border border-blue-600/10 hidden lg:block">
              <ShieldCheck className="text-blue-600 mb-4" size={24} />
              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-relaxed">
                Suas configurações estão seguras e são criptografadas antes do processamento.
              </p>
           </div>
        </div>

        <div className="flex-1 bg-white dark:bg-stone-900 rounded-[3rem] shadow-2xl border border-stone-100 dark:border-stone-800 flex flex-col overflow-hidden">
          
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-stone-50/30 dark:bg-stone-900/50">
            
            {activeTab === 'Geral' && (
              <div className="max-w-3xl space-y-10 animate-in slide-in-from-right duration-500">
                 
                 <div className="flex items-center gap-8 p-8 bg-white dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 shadow-sm">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-stone-100 dark:bg-stone-900 flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-red-500 transition-colors shadow-inner">
                       <Upload className="text-stone-400 group-hover:text-red-600 transition-colors mb-2" size={32} />
                       <span className="text-[8px] font-black uppercase text-stone-400 tracking-widest text-center px-4">Trocar Logo</span>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-stone-800 dark:text-white uppercase tracking-tight">Identidade Visual</h3>
                       <p className="text-xs text-stone-500 font-bold mt-2">Esta marca aparecerá no cardápio digital, app de pedidos e recibos de entrega.</p>
                       <div className="mt-4 flex gap-2">
                          <span className="bg-stone-100 dark:bg-stone-900 px-4 py-1.5 rounded-full text-[9px] font-black text-stone-400 uppercase tracking-widest">PNG 512px</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nome Fantasia</label>
                       <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                          <input 
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 pl-12 pr-4 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white uppercase text-sm"
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Slug da URL (Link)</label>
                       <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                          <input 
                            value={storeSlug}
                            onChange={(e) => setStoreSlug(e.target.value)}
                            className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 pl-12 pr-4 font-bold outline-none focus:ring-2 focus:ring-red-600 dark:text-white text-xs"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="p-10 bg-white dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 shadow-xl space-y-8">
                    <div className="flex items-center justify-between">
                       <div>
                          <h4 className="font-black text-stone-800 dark:text-white uppercase text-sm tracking-tight">Vendas para Delivery</h4>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Habilitar canal de entrega domiciliar</p>
                       </div>
                       <div 
                         onClick={() => setAcceptDelivery(!acceptDelivery)}
                         className={`w-14 h-8 rounded-full relative cursor-pointer transition-all ${acceptDelivery ? 'bg-green-500 shadow-lg shadow-green-900/20' : 'bg-stone-300 dark:bg-stone-700'}`}
                       >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${acceptDelivery ? 'right-1' : 'left-1'}`}></div>
                       </div>
                    </div>

                    <div className="h-px bg-stone-100 dark:bg-stone-900"></div>

                    <div className="flex items-center justify-between">
                       <div>
                          <h4 className="font-black text-stone-800 dark:text-white uppercase text-sm tracking-tight">Retirada no Balcão</h4>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Habilitar "Take-away" para clientes</p>
                       </div>
                       <div 
                         onClick={() => setAcceptPickup(!acceptPickup)}
                         className={`w-14 h-8 rounded-full relative cursor-pointer transition-all ${acceptPickup ? 'bg-green-500 shadow-lg shadow-green-900/20' : 'bg-stone-300 dark:bg-stone-700'}`}
                       >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${acceptPickup ? 'right-1' : 'left-1'}`}></div>
                       </div>
                    </div>

                    <div className="h-px bg-stone-100 dark:bg-stone-900"></div>

                    <div className="flex items-center justify-between">
                       <div>
                          <h4 className="font-black text-stone-800 dark:text-white uppercase text-sm tracking-tight">Valor de Pedido Mínimo</h4>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Impedir vendas abaixo deste valor</p>
                       </div>
                       <div className="relative w-44">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-black text-xs">R$</span>
                          <input 
                            type="number"
                            value={minOrder}
                            onChange={(e) => setMinOrder(Number(e.target.value))}
                            className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 pl-10 pr-4 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white text-right text-lg"
                          />
                       </div>
                    </div>
                 </div>

              </div>
            )}

            {activeTab === 'Horarios' && (
              <div className="max-w-4xl space-y-4 animate-in slide-in-from-right duration-500">
                 <div className="flex items-center gap-6 mb-10 p-8 bg-blue-600 text-white rounded-[2.5rem] shadow-xl shadow-blue-900/20">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Clock size={32}/>
                    </div>
                    <div>
                        <h4 className="font-black uppercase text-lg tracking-tight leading-none">Horários de Operação</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-2">Sincronizado automaticamente com o cardápio digital.</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    {hours.map((hour, index) => (
                    <div key={index} className={`flex items-center gap-6 p-6 rounded-[2rem] border transition-all ${hour.closed ? 'bg-stone-100 dark:bg-stone-950 border-stone-200 dark:border-stone-800 opacity-60' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 shadow-sm'}`}>
                        <div className="w-40 font-black uppercase text-xs tracking-widest text-stone-800 dark:text-stone-300">{hour.day}</div>
                        
                        {hour.closed ? (
                            <div className="flex-1 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] italic">Loja Fechada</div>
                        ) : (
                            <div className="flex-1 flex items-center gap-4">
                            <input 
                                type="time" 
                                value={hour.open}
                                onChange={(e) => handleHourChange(index, 'open', e.target.value)}
                                className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white"
                            />
                            <span className="text-stone-400 font-black text-[10px] uppercase tracking-widest">ATÉ</span>
                            <input 
                                type="time" 
                                value={hour.close}
                                onChange={(e) => handleHourChange(index, 'close', e.target.value)}
                                className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white"
                            />
                            </div>
                        )}

                        <button 
                            onClick={() => handleHourChange(index, 'closed', !hour.closed)}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                            hour.closed 
                            ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-900/20' 
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white'
                            }`}
                        >
                            {hour.closed ? 'Abrir Dia' : 'Fechar Dia'}
                        </button>
                    </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'Entrega' && (
              <div className="max-w-full animate-in slide-in-from-right duration-500 h-full flex flex-col">
                 
                 <div className="flex gap-10 border-b border-stone-100 dark:border-stone-800 mb-8 pb-1">
                    <button 
                      onClick={() => setDeliverySubTab('Taxas')}
                      className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${deliverySubTab === 'Taxas' ? 'text-red-600' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      Taxas de Entrega
                      {deliverySubTab === 'Taxas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-full"></div>}
                    </button>
                    <button 
                      onClick={() => setDeliverySubTab('Endereco')}
                      className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${deliverySubTab === 'Endereco' ? 'text-red-600' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      Endereço da Sede
                      {deliverySubTab === 'Endereco' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-full"></div>}
                    </button>
                 </div>

                 {deliverySubTab === 'Taxas' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-10">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-stone-900 p-8 rounded-[2rem] border border-stone-800 shadow-xl">
                                <div>
                                    <h3 className="font-black text-white uppercase text-xs tracking-widest">Zonas Atendidas</h3>
                                    <p className="text-[9px] text-stone-500 font-bold uppercase mt-1">Configuração de frete por bairro</p>
                                </div>
                                <button onClick={addZone} className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl transition-all shadow-lg shadow-red-900/20 active:scale-95">
                                    <Plus size={20} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                {deliveryZones.map(zone => (
                                    <div key={zone.id} className="p-8 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-[2.5rem] flex flex-col gap-6 shadow-lg hover:border-red-500/50 transition-all group relative overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                                <h4 className="font-black text-xs uppercase text-stone-800 dark:text-stone-200 tracking-tight">{zone.name}</h4>
                                            </div>
                                            <button 
                                                onClick={() => setDeliveryZones(deliveryZones.filter(z => z.id !== zone.id))}
                                                className="p-3 text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Taxa (R$)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">R$</span>
                                                    <input 
                                                        type="number" 
                                                        value={zone.price} 
                                                        onChange={(e) => {
                                                            const newZones = deliveryZones.map(z => z.id === zone.id ? { ...z, price: Number(e.target.value) } : z);
                                                            setDeliveryZones(newZones);
                                                        }}
                                                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl py-3 pl-10 pr-4 text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Tempo Est.</label>
                                                <input 
                                                    type="text" 
                                                    value={zone.timeEstimate}
                                                    onChange={(e) => {
                                                        const newZones = deliveryZones.map(z => z.id === zone.id ? { ...z, timeEstimate: e.target.value } : z);
                                                        setDeliveryZones(newZones);
                                                    }}
                                                    className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl py-3 px-4 text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-[650px] bg-stone-100 dark:bg-stone-800 rounded-[3rem] overflow-hidden relative border border-stone-200 dark:border-stone-700 shadow-inner group">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-30 grayscale group-hover:grayscale-0 transition-all duration-1000"></div>
                            <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
                                <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl p-10 rounded-[2.5rem] text-center border border-white/20 dark:border-stone-800 shadow-2xl max-w-sm animate-in zoom-in-95">
                                    <MapPin size={48} className="text-red-600 mx-auto mb-6" />
                                    <h3 className="font-black uppercase text-xl text-stone-900 dark:text-white tracking-tighter leading-none">Área de Cobertura</h3>
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-relaxed mt-4">
                                        As coordenadas geográficas serão utilizadas para sugerir taxas automaticamente conforme a distância da sede.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                 ) : (
                    <div className="max-w-3xl animate-in slide-in-from-right duration-500 space-y-10 pb-10">
                        <div className="flex items-center gap-6 p-8 bg-white dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 shadow-sm">
                            <div className="p-4 bg-red-600 rounded-2xl text-white">
                                <Home size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-stone-800 dark:text-white uppercase tracking-tight">Localização da Pizzaria</h3>
                                <p className="text-xs text-stone-500 font-bold mt-1">Este é o ponto zero para o cálculo de rotas dos motoboys.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="md:col-span-3 space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Rua / Avenida</label>
                                <input 
                                    value={storeAddress.street}
                                    onChange={(e) => setStoreAddress({...storeAddress, street: e.target.value})}
                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white uppercase text-sm shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nº</label>
                                <input 
                                    value={storeAddress.number}
                                    onChange={(e) => setStoreAddress({...storeAddress, number: e.target.value})}
                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white text-center text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Complemento</label>
                                <input 
                                    value={storeAddress.complement}
                                    onChange={(e) => setStoreAddress({...storeAddress, complement: e.target.value})}
                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white uppercase text-sm shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Ponto de Referência</label>
                                <input 
                                    value={storeAddress.reference}
                                    onChange={(e) => setStoreAddress({...storeAddress, reference: e.target.value})}
                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white uppercase text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Bairro</label>
                                <input 
                                    value={storeAddress.neighborhood}
                                    onChange={(e) => setStoreAddress({...storeAddress, neighborhood: e.target.value})}
                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white uppercase text-sm shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Cidade</label>
                                <input 
                                    value={storeAddress.city}
                                    readOnly
                                    className="w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl py-4 px-6 font-black text-stone-500 outline-none uppercase text-sm"
                                />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">CEP</label>
                                <input 
                                    value={storeAddress.zip}
                                    onChange={(e) => setStoreAddress({...storeAddress, zip: e.target.value})}
                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-red-600 dark:text-white text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-blue-600/5 dark:bg-blue-600/10 rounded-[2.5rem] border border-blue-600/20 flex flex-col md:flex-row items-center gap-6">
                            <Navigation size={24} className="text-blue-600" />
                            <p className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest leading-relaxed">
                                Endereços precisos geram rotas de entrega mais rápidas e custos de frete realistas via Google Maps API.
                            </p>
                            <button className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-blue-900/20 active:scale-95 ml-auto">
                                Confirmar Coordenadas
                            </button>
                        </div>
                    </div>
                 )}

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

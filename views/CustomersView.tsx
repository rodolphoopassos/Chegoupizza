
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageCircle, 
  History, 
  Sparkles, 
  Loader2, 
  Brain,
  X,
  Star,
  Zap,
  Ticket
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Customer {
  id: string;
  name: string;
  phone: string;
  lastOrderDate: string;
  totalOrders: number;
  totalSpent: number;
  tags: string[];
}

export const CustomersView = ({ user }: { user: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [campaign, setCampaign] = useState<string | null>(null);

  const customers: Customer[] = [
    { id: '1', name: 'RODRIGO MARTINS', phone: '11988887777', lastOrderDate: '2024-05-20', totalOrders: 15, totalSpent: 1250.50, tags: ['Fiel', 'Borda Recheada'] },
    { id: '2', name: 'ANA SOUZA', phone: '11977776666', lastOrderDate: '2024-05-18', totalOrders: 2, totalSpent: 180.00, tags: ['Novo'] },
    { id: '3', name: 'CARLOS PENA', phone: '11966665555', lastOrderDate: '2024-04-10', totalOrders: 8, totalSpent: 640.00, tags: ['Inativo', 'Vegano'] },
    { id: '4', name: 'BEATRIZ LIMA', phone: '11955554444', lastOrderDate: '2024-05-22', totalOrders: 22, totalSpent: 2100.00, tags: ['VIP'] },
  ];

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [searchTerm]);

  const generateCampaign = async () => {
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise estes dados de clientes de uma pizzaria e gere uma campanha de marketing curta para atrair os "Inativos" e recompensar os "VIPs". Retorne 2 frases impactantes com cupons simulados. Responda de forma estratégica.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setCampaign(response.text);
    } catch (e) {
      setCampaign("Erro ao gerar campanha. Tente novamente.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-stone-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <Users className="text-red-600" size={32} /> Gestão de Clientes (CRM)
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Sua base de dados é seu maior ativo comercial</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={generateCampaign}
            disabled={loadingAi}
            className="bg-stone-900 dark:bg-red-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loadingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            IA: Gerar Campanha
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white p-3.5 rounded-2xl shadow-xl active:scale-95 transition-all">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {campaign && (
        <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-blue-400">
           <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
              <Ticket size={120} />
           </div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Brain size={20} />
                 </div>
                 <h3 className="font-black text-xs uppercase tracking-[0.2em]">Sugestão do Estrategista AI</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed max-w-2xl">{campaign}</p>
              <button onClick={() => setCampaign(null)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all">
                <X size={20}/>
              </button>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-xl border border-stone-100 dark:border-stone-800 overflow-hidden">
        <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/20 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18}/>
              <input 
                placeholder="Pesquisar por nome ou celular..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 shadow-inner dark:text-white"
              />
           </div>
           <div className="flex gap-4">
              <div className="text-center">
                 <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ativos</p>
                 <p className="text-lg font-black text-stone-800 dark:text-white">128</p>
              </div>
              <div className="w-px h-8 bg-stone-200 dark:bg-stone-800 my-auto"></div>
              <div className="text-center">
                 <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Novos (Mês)</p>
                 <p className="text-lg font-black text-green-500">+12</p>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-stone-800/50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100 dark:border-stone-800">
              <tr>
                <th className="p-6">Nome do Cliente</th>
                <th className="p-6">Status/Tags</th>
                <th className="p-6 text-center">Último Pedido</th>
                <th className="p-6 text-center">Frequência</th>
                <th className="p-6 text-right">Total Investido</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors group">
                  <td className="p-6">
                     <div className="flex flex-col">
                        <span className="font-black text-stone-800 dark:text-stone-200 uppercase text-xs tracking-tight group-hover:text-red-600 transition-colors">{customer.name}</span>
                        <span className="text-[10px] text-stone-400 font-mono mt-1 flex items-center gap-1"><Phone size={10}/> {customer.phone}</span>
                     </div>
                  </td>
                  <td className="p-6">
                     <div className="flex flex-wrap gap-2">
                        {customer.tags.map(tag => (
                          <span key={tag} className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${tag === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-200' : tag === 'Inativo' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                            {tag}
                          </span>
                        ))}
                     </div>
                  </td>
                  <td className="p-6 text-center font-mono text-xs text-stone-500">
                    {new Date(customer.lastOrderDate + 'T12:00:00').toLocaleDateString()}
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                       <span className="font-black text-stone-800 dark:text-stone-300 text-xs">{customer.totalOrders} Pedidos</span>
                       <div className="w-12 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-600" 
                            style={{ width: `${Math.min(100, (customer.totalOrders / 20) * 100)}%` }}
                          />
                       </div>
                    </div>
                  </td>
                  <td className="p-6 text-right font-black text-stone-800 dark:text-white">R$ {customer.totalSpent.toFixed(2)}</td>
                  <td className="p-6">
                     <div className="flex items-center justify-center gap-2">
                        <button className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl hover:bg-green-200 transition-all"><MessageCircle size={14}/></button>
                        <button className="p-2.5 bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-800 rounded-xl transition-all"><History size={14}/></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

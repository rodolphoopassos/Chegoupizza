
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Sparkles, 
  ArrowUpRight, 
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Scale,
  Brain,
  Info,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

interface ProductAnalysis {
  id: number;
  name: string;
  category: string;
  sale_price: number;
  cmv: number;
  profit: number;
  margin: number;
  markup: number;
}

interface AnalysisViewProps {
  user: any;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ user }) => {
  const [analysisData, setAnalysisData] = useState<ProductAnalysis[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    if (!user) return;

    try {
        // --- MODO DEMO ---
        if (user.id === 'demo-user') {
            setAnalysisData([
                { id: 1, name: 'PIZZA CALABRESA', category: 'Pizzas', sale_price: 45.00, cmv: 12.50, profit: 32.50, margin: 72.2, markup: 3.6 },
                { id: 2, name: 'PIZZA PORTUGUESA', category: 'Pizzas', sale_price: 52.00, cmv: 18.00, profit: 34.00, margin: 65.4, markup: 2.8 },
                { id: 3, name: 'REFRIGERANTE 2L', category: 'Bebidas', sale_price: 14.00, cmv: 7.50, profit: 6.50, margin: 46.4, markup: 1.8 }
            ]);
            setTransactions([
                { id: 't1', description: 'Aluguel', amount: 3500, type: 'expense', category: 'Fixo', date: new Date() },
                { id: 't2', description: 'Energia', amount: 850, type: 'expense', category: 'Variável', date: new Date() }
            ]);
            setLoading(false);
            return;
        }

        // --- MODO REAL (Sincronizado com Engenharia de Cardápio) ---
        
        // 1. Busca Produtos (Cardápio) para pegar o preço de venda atualizado
        const { data: products } = await supabase
            .from('cardapio')
            .select('id, nome, preco, categoria')
            .order('nome');
        
        // 2. Busca Receitas (Composição dos produtos)
        const { data: recipes } = await supabase
            .from('receitas_ingredientes')
            .select('*');
        
        // 3. Busca Estoque (Custos atualizados dos insumos)
        const { data: stock } = await supabase
            .from('estoque')
            .select('id, cost_per_unit');
        
        // 4. Busca Transações (Para cálculo de Break-Even / Custos Fixos)
        const { data: trans } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id);

        if (products && recipes && stock) {
            const computedStats = products.map((prod: any) => {
                // Filtra os ingredientes vinculados a este produto (via recipe_id)
                const prodIngredients = recipes.filter((r: any) => r.recipe_id === prod.id);
                
                // Calcula CMV somando (quantidade * custo_unitario_do_estoque)
                const cmv = prodIngredients.reduce((total: number, item: any) => {
                    const stockItem = stock.find((s: any) => s.id === item.stock_id);
                    const cost = Number(stockItem?.cost_per_unit || 0);
                    const qty = Number(item.quantity || 0);
                    return total + (cost * qty);
                }, 0);

                const price = Number(prod.preco || 0);
                const profit = price - cmv;
                const margin = price > 0 ? (profit / price) * 100 : 0;
                const markup = cmv > 0 ? (price / cmv) : 0;

                return {
                    id: prod.id,
                    name: prod.nome,
                    category: prod.categoria,
                    sale_price: price,
                    cmv,
                    profit,
                    margin,
                    markup
                };
            });

            // Ordena do mais rentável para o menos rentável
            setAnalysisData(computedStats.sort((a, b) => b.margin - a.margin));
        }

        if (trans) {
            setTransactions(trans.map((t:any) => ({...t, date: new Date(t.date)})));
        }

    } catch (e) {
        console.error("Erro ao sincronizar dados de engenharia:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const financialSummary = useMemo(() => {
    const fixedExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const avgMargin = analysisData.length > 0 ? analysisData.reduce((acc, r) => acc + r.margin, 0) / analysisData.length : 0;
    const breakEven = avgMargin > 0 ? (fixedExpenses / (avgMargin / 100)) : 0;

    return { fixedExpenses, avgMargin, breakEven };
  }, [transactions, analysisData]);

  const getProfitConsultancy = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataStr = analysisData.slice(0, 8).map(r => `${r.name}: Preço R$${r.sale_price}, Margem ${r.margin.toFixed(1)}%, CMV R$${r.cmv.toFixed(2)}`).join(' | ');
      
      const prompt = `Como um consultor financeiro de alto nível para pizzarias, analise os seguintes pratos e margens (Top 8): ${dataStr}. 
      Identifique os 2 maiores problemas de lucro e sugira ações práticas (ex: aumentar preço, trocar ingrediente, promoção combo). 
      Seja direto, profissional e use um tom focado em resultado comercial. Responda em Português (máx 500 caracteres).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || "Sem resposta da IA.");
    } catch (e) {
      setAiAnalysis("Falha ao conectar com o estrategista de IA. Verifique sua chave API.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40}/>
      <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Sincronizando com Engenharia de Cardápio...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-stone-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={32} /> Margens & Lucro
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Dados sincronizados com Fichas Técnicas</p>
        </div>
        
        <button 
          onClick={getProfitConsultancy}
          disabled={isAiLoading || analysisData.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          CONSULTORIA DE LUCRO IA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-xl">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl"><TrendingUp size={24}/></div>
             <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Saúde Geral</span>
          </div>
          <p className="text-[10px] font-bold text-stone-500 uppercase mb-1">Margem Média do Cardápio</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-4xl font-black text-stone-800 dark:text-white tracking-tighter">{financialSummary.avgMargin.toFixed(1)}%</h4>
            <span className="text-green-500 font-bold text-xs flex items-center"><ArrowUpRight size={14}/> Ótimo</span>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-xl">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl"><Zap size={24}/></div>
             <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Riscos</span>
          </div>
          <p className="text-[10px] font-bold text-stone-500 uppercase mb-1">Custo Operacional Fixo</p>
          <h4 className="text-4xl font-black text-stone-800 dark:text-white tracking-tighter">R$ {financialSummary.fixedExpenses.toFixed(2)}</h4>
        </div>

        <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-xl">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl"><Target size={24}/></div>
             <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Meta Bruta</span>
          </div>
          <p className="text-[10px] font-bold text-stone-500 uppercase mb-1">Ponto de Equilíbrio (Venda Min.)</p>
          <h4 className="text-4xl font-black text-blue-600 tracking-tighter">R$ {financialSummary.breakEven.toFixed(2)}</h4>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
             <Brain size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
             <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                <Sparkles size={32} />
             </div>
             <div>
                <h3 className="font-black text-lg uppercase tracking-widest mb-2 flex items-center gap-2">
                   Estratégia de Otimização IA
                </h3>
                <p className="text-blue-50 font-medium leading-relaxed max-w-3xl">
                  {aiAnalysis}
                </p>
                <div className="mt-4 flex gap-4">
                   <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Análise de CMV Realizada</span>
                   <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Markup Validado</span>
                </div>
             </div>
             <button onClick={() => setAiAnalysis(null)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all">
                <X size={20}/>
             </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <h3 className="text-xl font-black text-stone-800 dark:text-white uppercase tracking-tight">Ranking de Rentabilidade</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Pratos classificados por margem de contribuição (Dados em tempo real)</p>
           </div>
           <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">Ouro (&gt;70%)</span>
              <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 uppercase bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">Prata (60-70%)</span>
              <span className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">Alerta (&lt;60%)</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-stone-800/50 text-stone-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-6">Nome do Prato</th>
                <th className="p-6 text-center">CMV (R$)</th>
                <th className="p-6 text-center">Venda (R$)</th>
                <th className="p-6 text-center">Markup</th>
                <th className="p-6 text-center">Margem (%)</th>
                <th className="p-6 text-center">Lucro Bruto (R$)</th>
                <th className="p-6 text-right pr-12">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {analysisData.map(r => (
                <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors group">
                  <td className="p-6 font-black text-stone-800 dark:text-stone-200 group-hover:text-blue-600 transition-colors uppercase">{r.name}</td>
                  <td className="p-6 text-center font-mono text-stone-500">R$ {r.cmv.toFixed(2)}</td>
                  <td className="p-6 text-center font-black text-stone-800 dark:text-white">R$ {r.sale_price.toFixed(2)}</td>
                  <td className="p-6 text-center text-stone-400 font-bold">{r.markup.toFixed(2)}x</td>
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                       <span className={`font-black ${r.margin > 70 ? 'text-green-500' : r.margin > 60 ? 'text-orange-500' : 'text-red-500'}`}>
                         {r.margin.toFixed(1)}%
                       </span>
                       <div className="w-16 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${r.margin > 70 ? 'bg-green-500' : r.margin > 60 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, r.margin))}%` }}
                          />
                       </div>
                    </div>
                  </td>
                  <td className="p-6 text-center font-black text-green-600">R$ {r.profit.toFixed(2)}</td>
                  <td className="p-6 text-right pr-12">
                     {r.margin > 70 ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-green-600 uppercase border border-green-200 bg-green-50 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 size={12}/> Estrela
                        </span>
                     ) : r.margin > 60 ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-orange-600 uppercase border border-orange-200 bg-orange-50 px-2.5 py-1 rounded-lg">
                          <Info size={12}/> Cavalo de Carga
                        </span>
                     ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-red-600 uppercase border border-red-200 bg-red-50 px-2.5 py-1 rounded-lg animate-pulse">
                          <AlertTriangle size={12}/> Ajustar Preço
                        </span>
                     )}
                  </td>
                </tr>
              ))}
              {analysisData.length === 0 && (
                <tr>
                   <td colSpan={7} className="p-20 text-center">
                      <div className="bg-stone-100 dark:bg-stone-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Scale size={32} className="text-stone-300"/>
                      </div>
                      <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Cadastre Fichas Técnicas na aba "Fichas Técnicas" para ver a análise</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-stone-50 dark:bg-stone-900/50 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-center gap-4">
        <div className="p-3 bg-white dark:bg-stone-800 rounded-2xl shadow-sm text-blue-600"><Info size={24}/></div>
        <div>
           <p className="text-sm font-medium text-stone-600 dark:text-stone-300 leading-relaxed">
             <strong>Dica do Especialista:</strong> Mantenha seu CMV entre 25% e 35% para garantir a saúde do negócio. Pratos com margem abaixo de 60% devem ser acompanhados de itens de alta margem (bebidas, entradas) para equilibrar o ticket médio.
           </p>
        </div>
      </div>
    </div>
  );
};

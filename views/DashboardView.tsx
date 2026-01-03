
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PieChart, 
  Wallet, 
  TrendingUp, 
  PlusCircle,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Pizza,
  Loader2,
  Brain,
  Sparkles,
  BarChart3,
  Zap,
  CheckCircle,
  TrendingDown,
  CalendarRange,
  Mic, 
  MicOff,
  X,
  Volume2,
  ChevronRight,
  DollarSign,
  Users
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Transaction } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { toast } from 'react-hot-toast';

interface DashboardViewProps {
  transactions: Transaction[];
}

interface DashboardStats {
  periodSales: number;
  periodOrders: number;
  averageTicket: number;
  bestDay: { date: string; total: number };
}

interface SalesData {
  date: string;
  dayName: string;
  total: number;
}

interface TopItem {
  name: string;
  count: number;
}

// --- AUDIO UTILS PARA GEMINI LIVE ---
function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createAudioBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const DashboardView = ({ transactions }: DashboardViewProps) => {
  const [loading, setLoading] = useState(true);
  
  // Seleção de Período
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [stats, setStats] = useState<DashboardStats>({
    periodSales: 0,
    periodOrders: 0,
    averageTicket: 0,
    bestDay: { date: '', total: 0 }
  });
  
  const [chartData, setChartData] = useState<SalesData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  // --- ESTADOS GEMINI LIVE ---
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext; sources: Set<AudioBufferSourceNode> } | null>(null);
  const nextStartTimeRef = useRef(0);

  const formatMoney = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const expenseStats = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const periodTransactions = transactions.filter(t => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      return d >= start && d <= end;
    });
    const income = periodTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expense = periodTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return { income, expense, balance: (stats.periodSales + income) - expense };
  }, [transactions, stats.periodSales, startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase
      .channel('dashboard-realtime-period')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
         fetchDashboardData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const startIso = `${startDate}T00:00:00`;
      const endIso = `${endDate}T23:59:59`;
      
      const { data: periodOrders, error } = await supabase
        .from('pedidos')
        .select('*')
        .gte('data_pedido', startIso)
        .lte('data_pedido', endIso)
        .neq('status', 'Cancelado')
        .neq('status', 'Recusado');

      if (error) throw error;

      if (periodOrders) {
         const totalSales = periodOrders.reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);
         const totalOrders = periodOrders.length;
         const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

         const daysInRange: SalesData[] = [];
         let currentDate = new Date(startDate + 'T00:00:00');
         const stopDate = new Date(endDate + 'T23:59:59');

         let bestDayVal = 0;
         let bestDayStr = '';

         while (currentDate <= stopDate) {
            const dStr = currentDate.toISOString().split('T')[0];
            const dayOrders = periodOrders.filter(o => o.data_pedido.startsWith(dStr));
            const dayTotal = dayOrders.reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);
            if (dayTotal > bestDayVal) { bestDayVal = dayTotal; bestDayStr = dStr; }
            daysInRange.push({
                date: dStr,
                dayName: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                total: dayTotal
            });
            currentDate.setDate(currentDate.getDate() + 1);
         }
         setStats({ periodSales: totalSales, periodOrders: totalOrders, averageTicket: avgTicket, bestDay: { date: bestDayStr, total: bestDayVal } });
         setChartData(daysInRange);

         const flavorCounts: Record<string, number> = {};
         periodOrders.forEach(order => {
            if (order.itens_pedido && Array.isArray(order.itens_pedido)) {
              order.itens_pedido.forEach((item: any) => {
                const name = String(item.produto || 'Item');
                flavorCounts[name] = (flavorCounts[name] || 0) + (Number(item.qtd) || 1);
              });
            }
         });
         const sortedItems = Object.entries(flavorCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
         setTopItems(sortedItems);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- LÓGICA GEMINI LIVE ---
  const startVoiceConsultancy = async () => {
    if (isLiveActive) return;
    setIsLiveConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const sources = new Set<AudioBufferSourceNode>();
      audioContextsRef.current = { input: inputCtx, output: outputCtx, sources };

      const systemPrompt = `Você é um Consultor Estratégico de Pizzarias especialista na rede ChegouPizza. 
      Seu objetivo é ajudar o dono da pizzaria a analisar os dados do dashboard em tempo real via voz.
      DADOS ATUAIS DO DASHBOARD:
      - Vendas no Período: ${formatMoney(stats.periodSales)}
      - Pedidos: ${stats.periodOrders}
      - Ticket Médio: ${formatMoney(stats.averageTicket)}
      - Saldo Operacional: ${formatMoney(expenseStats.balance)}
      - Mais Vendido: ${topItems[0]?.name || 'N/A'}
      - Total Despesas: ${formatMoney(expenseStats.expense)}

      Instruções de Voz:
      1. Seja direto, amigável e use tom executivo.
      2. Fale em Português do Brasil.
      3. Se o saldo estiver negativo, sugira cortes em suprimentos ou promoções de itens de alta margem.
      4. Se estiver positivo, sugira expansão de marketing.
      Comece se apresentando brevemente e comentando o faturamento do período.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: systemPrompt,
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsLiveActive(true);
            setIsLiveConnecting(false);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), outputCtx, 24000, 1);
              const node = outputCtx.createBufferSource();
              node.buffer = buffer;
              node.connect(outputCtx.destination);
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sources.add(node);
              node.onended = () => sources.delete(node);
            }
            if (msg.serverContent?.interrupted) {
              sources.forEach(s => { try { s.stop(); } catch(e){} });
              sources.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error("Live Error", e); stopVoiceConsultancy(); },
          onclose: () => { stopVoiceConsultancy(); }
        }
      });
      liveSessionRef.current = await sessionPromise;

    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar consultoria de voz.");
      setIsLiveConnecting(false);
    }
  };

  const stopVoiceConsultancy = () => {
    setIsLiveActive(false);
    setIsLiveConnecting(false);
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch(e){}
      liveSessionRef.current = null;
    }
    if (audioContextsRef.current) {
      try { audioContextsRef.current.input.close(); } catch(e){}
      try { audioContextsRef.current.output.close(); } catch(e){}
      audioContextsRef.current = null;
    }
    nextStartTimeRef.current = 0;
  };

  // --- COMPONENTE GRÁFICO PIE CUSTOMIZADO ---
  const SimplePieChart = () => {
    const total = stats.periodSales + expenseStats.expense;
    if (total === 0) return <div className="h-40 w-40 rounded-full border-4 border-stone-800 flex items-center justify-center text-[10px] text-stone-600 uppercase font-black">Sem Dados</div>;
    
    const salesPerc = (stats.periodSales / total) * 100;
    
    return (
      <div className="relative h-48 w-48 group">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle 
            cx="18" cy="18" r="15.915" 
            fill="transparent" 
            stroke="#ef4444" 
            strokeWidth="4" 
            strokeDasharray={`${100} ${0}`} 
            className="transition-all duration-1000"
          />
          <circle 
            cx="18" cy="18" r="15.915" 
            fill="transparent" 
            stroke="#22c55e" 
            strokeWidth="4" 
            strokeDasharray={`${salesPerc} ${100 - salesPerc}`} 
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <PieChart className="text-stone-700 mb-1" size={20} />
          <span className="text-xl font-black text-white">{Math.round(salesPerc)}%</span>
          <span className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Lucratividade</span>
        </div>
      </div>
    );
  };

  if (loading && stats.periodSales === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 py-40">
        <Loader2 className="animate-spin text-red-600" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Sincronizando GiroZ Period Intel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER E FILTRO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter text-stone-800 dark:text-white leading-none">Dashboard Estratégico</h1>
           <p className="text-[10px] text-stone-500 font-bold mt-2 uppercase tracking-[0.2em]">Visão de Performance & Saúde Financeira</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={isLiveActive ? stopVoiceConsultancy : startVoiceConsultancy}
             disabled={isLiveConnecting}
             className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 border ${
               isLiveActive 
               ? 'bg-red-600 text-white border-red-500 animate-pulse' 
               : 'bg-stone-900 text-blue-400 border-stone-800 hover:bg-stone-800'
             }`}
           >
              {isLiveConnecting ? <Loader2 size={18} className="animate-spin" /> : isLiveActive ? <MicOff size={18}/> : <Mic size={18} />}
              {isLiveConnecting ? 'Conectando...' : isLiveActive ? 'Sair do Chat de Voz' : 'Consultoria de Voz IA'}
           </button>

           <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm h-[60px]">
              <div className="flex items-center gap-2">
                <CalendarRange size={18} className="text-red-600 ml-1" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-stone-400 tracking-widest leading-none mb-0.5">Início</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-black text-stone-800 dark:text-white outline-none uppercase cursor-pointer"
                  />
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-stone-200 dark:bg-stone-800"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-stone-400 tracking-widest leading-none mb-0.5">Fim</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-stone-800 dark:text-white outline-none uppercase cursor-pointer"
                />
              </div>
           </div>
        </div>
      </div>

      {/* OVERLAY DE VOZ ATIVO */}
      {isLiveActive && (
        <div className="fixed inset-x-0 bottom-10 z-[100] flex justify-center px-4 animate-in slide-in-from-bottom-10">
           <div className="bg-stone-900/95 backdrop-blur-2xl border border-blue-500/30 p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6 max-w-lg w-full">
              <div className="relative">
                 <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                 <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white relative shadow-lg">
                    <Volume2 size={24} className="animate-bounce" />
                 </div>
              </div>
              <div className="flex-1">
                 <h4 className="text-white font-black uppercase text-xs tracking-widest">Consultor Estratégico AI</h4>
                 <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Analisando seu faturamento em tempo real...</p>
              </div>
              <button 
                onClick={stopVoiceConsultancy}
                className="p-4 bg-stone-800 hover:bg-red-600 text-stone-400 hover:text-white rounded-2xl transition-all"
              >
                 <X size={20}/>
              </button>
           </div>
        </div>
      )}

      {/* CARDS DE OPERAÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl relative overflow-hidden group hover:border-green-500/50 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
               <DollarSign size={80} className="text-green-500" />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Faturamento Período</span>
               <span className="text-3xl font-black text-stone-800 dark:text-white tracking-tighter">{formatMoney(stats.periodSales)}</span>
               <div className="flex items-center gap-1 text-green-500 text-[10px] font-black uppercase mt-4">
                  <TrendingUp size={14} /> <span>Receita de Pedidos</span>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
               <ShoppingBag size={80} className="text-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Total de Pedidos</span>
               <span className="text-3xl font-black text-stone-800 dark:text-white tracking-tighter">{stats.periodOrders}</span>
               <div className="flex items-center gap-1 text-stone-400 text-[10px] font-black uppercase mt-4">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> <span>Volume Operacional</span>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
               <Users size={80} className="text-purple-500" />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ticket Médio</span>
               <span className="text-3xl font-black text-stone-800 dark:text-white tracking-tighter">{formatMoney(stats.averageTicket)}</span>
               <div className="flex items-center gap-1 text-purple-500 text-[10px] font-black uppercase mt-4">
                  <ArrowUpRight size={14} /> <span>Por Atendimento</span>
               </div>
            </div>
         </div>

         <div className="bg-[#121212] p-6 rounded-[2.5rem] border border-stone-800 shadow-2xl relative overflow-hidden group hover:border-orange-500/50 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
               <Wallet size={80} className="text-orange-500" />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Saldo Operacional</span>
               <span className={`text-3xl font-black tracking-tighter ${expenseStats.balance >= 0 ? 'text-white' : 'text-red-500'}`}>
                 {formatMoney(expenseStats.balance)}
               </span>
               <div className="flex items-center gap-1 text-orange-500 text-[10px] font-black uppercase mt-4">
                  <Zap size={14}/> <span>Líquido do Período</span>
               </div>
            </div>
         </div>
      </div>

      {/* ANALÍTICO E GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* EVOLUÇÃO DE VENDAS */}
         <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-8 rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="mb-10 flex justify-between items-end">
               <div>
                  <h3 className="text-2xl font-black text-stone-800 dark:text-white uppercase tracking-tighter">Evolução de Vendas</h3>
                  <p className="text-[10px] text-stone-400 font-bold mt-1 uppercase tracking-widest">Fluxo diário no intervalo selecionado</p>
               </div>
               <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800 px-4 py-1.5 rounded-full">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                  <span className="text-[9px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-widest">Tempo Real</span>
               </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar-h pb-4">
              <div className="flex items-end gap-4 h-72 px-2 min-w-full" style={{ width: chartData.length > 10 ? `${chartData.length * 60}px` : '100%' }}>
                {chartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 font-black text-xs uppercase tracking-widest opacity-20">Sem histórico neste período</div>
                ) : (
                  chartData.map((data, index) => {
                    const maxVal = Math.max(...chartData.map(d => Number(d.total) || 0));
                    const currentVal = Number(data.total) || 0;
                    const heightPerc = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center gap-4 flex-1 group cursor-pointer h-full justify-end min-w-[40px]">
                          <div className="w-full bg-stone-100 dark:bg-stone-800/50 rounded-2xl relative flex items-end overflow-hidden h-[90%] group-hover:bg-stone-200 dark:group-hover:bg-stone-800 transition-colors">
                            <div 
                                className="w-full bg-stone-400 dark:bg-stone-700 group-hover:bg-red-600 rounded-t-xl transition-all duration-700 ease-out relative shadow-lg"
                                style={{ height: `${heightPerc}%` }}
                            >
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] font-black py-2 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 whitespace-nowrap z-10 pointer-events-none shadow-2xl border border-white/10">
                                  {formatMoney(currentVal)}
                                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45"></div>
                                </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 whitespace-nowrap">
                            {String(data.dayName)}
                          </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
         </div>

         {/* MIX DE VENDAS E AÇÕES RÁPIDAS */}
         <div className="flex flex-col gap-6">
            <div className="bg-stone-950 p-8 rounded-[3rem] shadow-2xl text-white flex flex-col items-center relative overflow-hidden border border-stone-800">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-600 rounded-full blur-[80px] opacity-10"></div>
                
                <h3 className="text-xl font-black uppercase tracking-tighter self-start mb-8 flex items-center gap-3">
                   <PieChart className="text-red-500" size={24} />
                   Mix de Receita
                </h3>

                <SimplePieChart />
                
                <div className="mt-8 w-full space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Vendas</span>
                      <span className="text-stone-400">{formatMoney(stats.periodSales)}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Despesas</span>
                      <span className="text-stone-400">{formatMoney(expenseStats.expense)}</span>
                   </div>
                </div>
            </div>

            <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl shadow-blue-900/40 text-white flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                   <Brain size={100} />
                </div>
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                         <Sparkles size={20} />
                      </div>
                      <h4 className="font-black text-xs uppercase tracking-[0.2em]">Consultor AI</h4>
                   </div>
                   <p className="text-sm font-bold leading-relaxed mb-6">
                      {expenseStats.balance > 0 ? 
                        `Seu saldo operacional está positivo em ${formatMoney(expenseStats.balance)}. Ótimo momento para intensificar promoções do item "${topItems[0]?.name || 'mais vendido'}".` :
                        "Atenção: Suas despesas excederam as vendas de pedidos neste período. Recomendo analisar compras de insumos."
                      }
                   </p>
                   <button 
                     onClick={startVoiceConsultancy}
                     className="w-full bg-white text-blue-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                      <PlusCircle size={16} /> ANALISAR VIA VOZ
                   </button>
                </div>
            </div>
         </div>
      </div>

      {/* INDICADORES DE FUNDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl">
             <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl"><TrendingDown size={24}/></div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Saídas do Período</span>
             </div>
             <p className="text-[10px] font-bold text-stone-500 uppercase mb-1 tracking-widest">Custo Operacional Lançado</p>
             <h4 className="text-4xl font-black text-stone-800 dark:text-white tracking-tighter">{formatMoney(expenseStats.expense)}</h4>
             <p className="text-[9px] text-stone-400 font-bold uppercase mt-4 italic">* Considera insumos, RH e custos fixos</p>
          </div>

          <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl">
             <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl"><BarChart3 size={24}/></div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Top Sabor</span>
             </div>
             <p className="text-[10px] font-bold text-stone-500 uppercase mb-1 tracking-widest">O Favorito da Galera</p>
             <h4 className="text-3xl font-black text-stone-800 dark:text-white tracking-tighter truncate uppercase">{topItems[0]?.name || '---'}</h4>
             <div className="flex items-center gap-2 mt-4">
                <div className="bg-orange-500/20 px-2 py-0.5 rounded text-[9px] font-black text-orange-600 uppercase">{topItems[0]?.count || 0} VENDIDOS</div>
             </div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl flex flex-col justify-center">
             <div className="flex items-center gap-4 mb-6">
                <div className="bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl"><CheckCircle className="text-stone-500" size={24}/></div>
                <div>
                   <h4 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight">Status de Giro</h4>
                   <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Eficiência Comercial</p>
                </div>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Conversão Meta</span>
                   <span className="text-sm font-black text-stone-800 dark:text-white">82.4%</span>
                </div>
                <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-blue-600 rounded-full w-[82.4%] transition-all duration-1000"></div>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

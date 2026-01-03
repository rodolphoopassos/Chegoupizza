
import React, { useState, useRef } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Paperclip, 
  X,
  Wallet,
  Sparkles,
  Camera,
  Loader2,
  CheckCircle2,
  Calendar as CalendarIcon,
  Store,
  Receipt,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  CreditCard,
  Eye,
  FileText
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabaseClient';

const safeString = (val: any) => {
  if (typeof val === 'object' && val !== null) {
    return val.description || val.nome || val.name || JSON.stringify(val);
  }
  return String(val || '');
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-stone-200 dark:bg-stone-700 rounded ${className}`}></div>
);

const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
  <tr className="border-b border-stone-100 dark:border-stone-800 last:border-0">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

interface ScannedItem {
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  isStockMaterial: boolean;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
}

interface ScannedInvoice {
  establishmentName: string;
  totalAmount: number;
  date: string;
  items: ScannedItem[];
}

interface EntriesViewProps {
  onAdd: (description: string, amount: number, type: TransactionType, category: string, dateStr?: string, recipeId?: string, attachment?: File | null) => Promise<void>;
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  user: any;
  isLoading: boolean;
}

export const EntriesView: React.FC<EntriesViewProps> = ({ onAdd, transactions, onDelete, user, isLoading }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedInvoice, setScannedInvoice] = useState<ScannedInvoice | null>(null);
  const [showItems, setShowItems] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [viewingDetail, setViewingDetail] = useState<ScannedInvoice | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    onAdd(desc, parseFloat(amount), type, category || 'Geral', date, undefined, attachment);
    setDesc('');
    setAmount('');
    setCategory('');
    setAttachment(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setAttachment(e.target.files[0]);
    }
  };

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
    if (!file) return;

    setIsScanning(true);
    setAttachment(file);

    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Analise esta nota fiscal ou cupom fiscal de compras de uma pizzaria.
      Extraia estabelecimento, valor total, data e itens.
      Retorne APENAS um objeto JSON puro:
      {
        "establishmentName": "string",
        "totalAmount": 0.00,
        "date": "YYYY-MM-DD",
        "items": [ { "description": "...", "amount": 0, "category": "...", "type": "expense", "isStockMaterial": true/false, "unit": "...", "quantity": 0, "unitPrice": 0 } ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }
        ]
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{.*\}/s);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as ScannedInvoice;
        setScannedInvoice(result);
        setShowItems(true);
      }
    } catch (error) {
      console.error("AI Scan Error:", error);
      alert("Não foi possível processar o recibo automaticamente.");
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const processScannedInvoice = async () => {
    if (!scannedInvoice || !user) return;
    setIsProcessing(true);

    try {
      await onAdd(
        `COMPRA: ${safeString(scannedInvoice.establishmentName)}`,
        scannedInvoice.totalAmount,
        'expense',
        'Suprimentos',
        scannedInvoice.date,
        undefined,
        attachment
      );

      for (const item of scannedInvoice.items) {
        if (item.isStockMaterial && user.id !== 'demo-user') {
          const { data: existingStock } = await supabase
            .from('stock')
            .select('*')
            .eq('user_id', user.id)
            .ilike('name', `%${safeString(item.description).split(' ')[0]}%`)
            .limit(1);

          if (existingStock && existingStock.length > 0) {
            const stockId = existingStock[0].id;
            const newQty = (existingStock[0].stock_quantity || 0) + (item.quantity || 0);
            await supabase.from('stock').update({
              stock_quantity: newQty,
              cost_per_unit: item.unitPrice || existingStock[0].cost_per_unit,
              supplier: safeString(scannedInvoice.establishmentName)
            }).eq('id', stockId);
          } else {
            await supabase.from('stock').insert({
              name: safeString(item.description).toUpperCase(),
              code: `SCAN-${Math.floor(Math.random() * 10000)}`,
              unit: item.unit || 'UN',
              cost_per_unit: item.unitPrice || 0,
              stock_quantity: item.quantity || 0,
              min_stock: 10,
              supplier: safeString(scannedInvoice.establishmentName),
              user_id: user.id
            });
          }
        }
      }

      alert(`Nota fiscal processada! Lançamento consolidado realizado.`);
      setScannedInvoice(null);
      setAttachment(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar integração.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewTransaction = (t: Transaction) => {
    const descStr = safeString(t.description);
    if (descStr.startsWith('COMPRA:')) {
      setViewingDetail({
        establishmentName: descStr.replace('COMPRA: ', ''),
        totalAmount: t.amount,
        date: new Date(t.date).toISOString().split('T')[0],
        items: [
          { description: "ITEM SIMULADO 1", amount: t.amount * 0.6, category: "Insumos", type: "expense", isStockMaterial: true, unit: "KG", quantity: 2, unitPrice: (t.amount * 0.6) / 2 },
          { description: "ITEM SIMULADO 2", amount: t.amount * 0.4, category: "Diversos", type: "expense", isStockMaterial: false, unit: "UN", quantity: 1, unitPrice: t.amount * 0.4 }
        ]
      });
    } else {
      if (t.attachmentUrl) setPreviewImage(t.attachmentUrl);
    }
  };

  return (
    <div className="space-y-6 relative">
       {viewingDetail && (
         <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
            <div className="bg-[#121212] w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-800">
               <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Receipt size={24} />
                    <h3 className="font-black text-lg uppercase tracking-tight">Informações da NF-e</h3>
                  </div>
                  <button onClick={() => setViewingDetail(null)} className="hover:bg-white/20 p-2 rounded-full"><X/></button>
               </div>
               <div className="p-8 space-y-6">
                  <div className="flex items-start gap-4 p-6 bg-stone-900 border border-stone-800 rounded-[2rem]">
                     <div className="p-4 bg-blue-900/30 text-blue-500 rounded-2xl"><Store size={28} /></div>
                     <div className="flex-1">
                        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Estabelecimento</p>
                        <h4 className="text-xl font-black text-white uppercase truncate">{safeString(viewingDetail.establishmentName)}</h4>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Total Nota</p>
                        <p className="text-2xl font-black text-green-500">R$ {viewingDetail.totalAmount.toFixed(2)}</p>
                     </div>
                  </div>
                  <button onClick={() => setViewingDetail(null)} className="w-full bg-stone-800 hover:bg-stone-700 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest transition-all">Fechar Detalhes</button>
               </div>
            </div>
         </div>
       )}

       {scannedInvoice && (
         <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
            <div className="bg-[#121212] w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-800">
               <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3"><Receipt size={24} /><h3 className="font-black text-lg uppercase tracking-tight">Revisão de Nota Fiscal</h3></div>
                  <button onClick={() => setScannedInvoice(null)} className="hover:bg-white/20 p-2 rounded-full"><X/></button>
               </div>
               <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                  <div className="flex items-start gap-4 p-6 bg-stone-900 border border-stone-800 rounded-[2rem]">
                     <div className="flex-1">
                        <h4 className="text-xl font-black text-white uppercase truncate">{safeString(scannedInvoice.establishmentName)}</h4>
                     </div>
                     <p className="text-2xl font-black text-green-500">R$ {scannedInvoice.totalAmount.toFixed(2)}</p>
                  </div>
                  <button onClick={processScannedInvoice} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest">{isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} CONFIRMAR E LANÇAR</button>
               </div>
            </div>
         </div>
       )}

       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h2 className="text-2xl font-black text-stone-800 dark:text-white uppercase tracking-tight">Lançamentos Financeiros</h2>
         <div className="flex gap-2">
            <input type="file" ref={scanInputRef} className="hidden" capture="environment" accept="image/*,application/pdf" onChange={handleScanReceipt} />
            <button onClick={() => scanInputRef.current?.click()} disabled={isScanning} className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50">{isScanning ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <Sparkles size={18} className="text-blue-400" />}{isScanning ? 'Analisando Nota...' : 'Scanner AI Multi-Itens'}</button>
         </div>
       </div>

       <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-xl border border-stone-100 dark:border-stone-800 transition-all">
         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
           <div className="md:col-span-1">
             <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Descrição</label>
             <input value={desc} onChange={e => setDesc(e.target.value)} required className="w-full p-3.5 border-none bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Ex: Venda Pizza" />
           </div>
           <div>
             <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Valor (R$)</label>
             <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3.5 border-none bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-sm" placeholder="0.00" />
           </div>
           <button type="submit" disabled={isLoading || isScanning} className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg py-4">ADICIONAR</button>
         </form>
       </div>

       <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-xl border border-stone-100 dark:border-stone-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 text-stone-400 font-black uppercase text-[10px] tracking-widest">
                <tr><th className="px-8 py-5">Data</th><th className="px-8 py-5">Descrição</th><th className="px-8 py-5 text-right">Valor Total</th><th className="px-8 py-5"></th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {isLoading ? <TableRowSkeleton cols={4} /> : transactions.map((t: any) => (
                    <tr key={t.id} onClick={() => handleViewTransaction(t)} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group">
                      <td className="px-8 py-6 text-stone-500 dark:text-stone-400 font-mono text-xs">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-8 py-6"><span className="font-black text-stone-800 dark:text-stone-200 uppercase text-xs tracking-tight">{safeString(t.description)}</span></td>
                      <td className={`px-8 py-6 text-right font-black text-base ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} R$ {Number(t.amount || 0).toFixed(2)}</td>
                      <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => onDelete(t.id)} className="p-2 text-stone-300 hover:text-red-600 transition-all"><Trash2 size={18} /></button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};

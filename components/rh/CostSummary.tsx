
import React from 'react';
import { Totals } from '../../types';

interface CostSummaryProps {
  totals: Totals;
}

export const CostSummary: React.FC<CostSummaryProps> = ({ totals }) => {
  const estimatedCharges = totals.taxableGross * 0.4;
  const grandTotal = totals.gross + estimatedCharges;

  return (
    <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-xl border border-orange-200 dark:border-orange-900/30 max-w-md">
       <h4 className="font-bold text-orange-800 dark:text-orange-200 mb-3 border-b border-orange-200 pb-2">Custos da Empresa (Estimado)</h4>
       
       <div className="flex justify-between text-sm mb-2">
          <span className="text-stone-600 dark:text-stone-400">Total Folha Bruta:</span>
          <span className="font-bold">R$ {totals.gross.toFixed(2)}</span>
       </div>

       {totals.nonTaxableGross > 0 && (
         <div className="flex justify-between text-[10px] mb-2 opacity-70 italic text-stone-500">
            <span>Parcela Isenta (Diaristas):</span>
            <span>- R$ {totals.nonTaxableGross.toFixed(2)}</span>
         </div>
       )}

       <div className="flex justify-between text-sm mb-2">
          <span className="text-stone-600 dark:text-stone-400">Encargos sobre Base CLT (~40%):</span>
          <span className="font-bold text-red-600">R$ {estimatedCharges.toFixed(2)}</span>
       </div>

       <div className="flex justify-between text-lg font-bold border-t border-orange-200 pt-2 mt-2">
          <span className="text-orange-900 dark:text-orange-100">CUSTO TOTAL:</span>
          <span className="text-orange-900 dark:text-orange-100">R$ {grandTotal.toFixed(2)}</span>
       </div>
       
       <p className="text-[9px] text-stone-400 mt-3 uppercase tracking-wider font-bold">
          * Diaristas não geram encargos automáticos nesta projeção.
       </p>
    </div>
  );
};

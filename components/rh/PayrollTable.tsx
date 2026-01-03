import React from 'react';
import { Employee, PayrollRecord, Totals } from '../../types';
import { getEmpData, calculatePayroll } from '../../utils/payroll';

interface PayrollTableProps {
  employees: Employee[];
  monthlyData: PayrollRecord[];
  updatePayrollRecord: (empId: string, field: keyof PayrollRecord, value: number) => void;
  totals: Totals;
  currentMonth: string;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({ 
  employees, 
  monthlyData, 
  updatePayrollRecord, 
  totals,
  currentMonth 
}) => {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
       <div className="p-4 bg-green-700 text-white font-bold flex justify-between items-center">
          <span>Folha de Pagamento Mensal</span>
          <span className="text-sm bg-white/20 px-2 py-1 rounded">{new Date(currentMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
       </div>
       <div className="overflow-x-auto">
       <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
             <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Proventos Base</th>
                <th className="p-3 text-right">Extras</th>
                <th className="p-3 text-right">Comissões</th>
                <th className="p-3 text-right">Bônus</th>
                <th className="p-3 text-right bg-stone-200 dark:bg-stone-700">Total Bruto</th>
                <th className="p-3 text-right text-red-500">Descontos</th>
                <th className="p-3 text-right font-bold">Líquido</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
             {employees.map(emp => {
                const data = getEmpData(monthlyData, emp.id);
                const calcs = calculatePayroll(emp, monthlyData);
                return (
                   <tr key={emp.id} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                      <td className="p-3 font-medium">{emp.name}</td>
                      <td className="p-3 text-xs text-stone-500">{emp.contractType || 'Mensalista'}</td>
                      <td className="p-3 text-right">R$ {calcs.basePay.toFixed(2)}</td>
                      <td className="p-3 text-right text-stone-500">R$ {calcs.overtimeValue.toFixed(2)}</td>
                      <td className="p-3 text-right text-stone-500">R$ {calcs.commissionValue.toFixed(2)}</td>
                      <td className="p-3 text-right text-stone-500">R$ {Number(data.targetBonus).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold bg-stone-50 dark:bg-stone-800/50">R$ {calcs.grossTotal.toFixed(2)}</td>
                      <td className="p-3 text-right">
                         <input 
                            type="number" 
                            value={data.discounts} 
                            onChange={e => updatePayrollRecord(emp.id, 'discounts', Number(e.target.value))}
                            className="w-20 p-1 text-right text-red-600 border rounded dark:bg-stone-700 dark:border-stone-600"
                         />
                      </td>
                      <td className="p-3 text-right font-bold text-green-700 dark:text-green-400">R$ {calcs.netTotal.toFixed(2)}</td>
                   </tr>
                );
             })}
          </tbody>
          <tfoot className="bg-stone-200 dark:bg-stone-700 font-bold border-t-2 border-stone-300 dark:border-stone-600">
             <tr>
                <td className="p-3" colSpan={2}>TOTAIS FOLHA</td>
                <td className="p-3 text-right">R$ {totals.base.toFixed(2)}</td>
                <td className="p-3 text-right">R$ {totals.overtime.toFixed(2)}</td>
                <td className="p-3 text-right">R$ {totals.commissions.toFixed(2)}</td>
                <td className="p-3 text-right">R$ {totals.bonus.toFixed(2)}</td>
                <td className="p-3 text-right">R$ {totals.gross.toFixed(2)}</td>
                <td className="p-3 text-right"></td>
                <td className="p-3 text-right">R$ {totals.net.toFixed(2)}</td>
             </tr>
          </tfoot>
       </table>
       </div>
    </div>
  );
};


import { Employee, PayrollRecord } from '../types';

export const getEmpData = (monthlyData: PayrollRecord[], id: string): PayrollRecord => {
    return monthlyData.find(d => d.employeeId === id) || { 
        employeeId: id, month: '',
        workedDays: 30, workedHours: 220, extraHours: 0, salesAmount: 0, targetBonus: 0, discounts: 0 
    };
};

export const calculatePayroll = (emp: Employee, monthlyData: PayrollRecord[]) => {
    const data = getEmpData(monthlyData, emp.id);
    
    let basePay = 0;
    let hourlyRate = 0;
    let baseRateUsed = 0;

    // Determina a taxa base (Diária ou Horária) baseada no campo customizado ou no cadastro
    const customRate = data.customHourlyRate && data.customHourlyRate > 0 ? data.customHourlyRate : 0;

    if (emp.contractType === 'Mensalista') {
        // Mensalista usa o salário fixo do cadastro
        baseRateUsed = emp.baseSalary;
        hourlyRate = customRate > 0 ? customRate : emp.baseSalary / 220;
        
        const days = data.workedDays !== undefined ? data.workedDays : 30;
        basePay = (emp.baseSalary / 30) * days;

    } else if (emp.contractType === 'Diarista') {
        // Para Diarista, o valor base é a Diária
        baseRateUsed = customRate > 0 ? customRate : emp.baseSalary;
        hourlyRate = baseRateUsed / 8; // Estimativa de 8h por diária para cálculo de extras
        basePay = baseRateUsed * (data.workedDays || 0);

    } else if (emp.contractType === 'Horista') {
        // Para Horista, o valor base é o valor da Hora
        baseRateUsed = customRate > 0 ? customRate : emp.baseSalary;
        hourlyRate = baseRateUsed;
        basePay = baseRateUsed * (data.workedHours || 0);
    }
    
    const overtimeValue = data.extraHours * hourlyRate * 1.5;
    const commissionValue = data.salesAmount * (emp.commissionRate / 100);
    const grossTotal = basePay + overtimeValue + commissionValue + Number(data.targetBonus);
    const netTotal = grossTotal - Number(data.discounts);
    
    return { hourlyRate, overtimeValue, commissionValue, grossTotal, netTotal, basePay, baseRateUsed };
 };

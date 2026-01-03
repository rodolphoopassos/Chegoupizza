
export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: any; // Can be string (ISO) or Date object
  recipeId?: string;
  user_id?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  cost_per_unit: number; 
  stock_quantity: number;
  min_stock: number;
  supplier: string;
  last_buy?: string;
  user_id?: string;
}

export interface RecipeIngredient {
  stockId: string; // mapped from stock_id
  quantity: number;
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  sale_price: number;
  ingredients: RecipeIngredient[];
  user_id?: string;
}

export type ContractType = 'Mensalista' | 'Diarista' | 'Horista';

export interface Employee {
  id: string;
  code: string;
  name: string;
  position: string;
  contractType: ContractType; // mapped from contract_type
  baseSalary: number; // mapped from base_salary
  commissionRate: number; // mapped from commission_rate
  admissionDate: string; // mapped from admission_date
  phone: string;
  status: 'Ativo' | 'Inativo';
  user_id?: string;
}

export interface PayrollRecord {
  id?: string;
  employeeId: string; // mapped from employee_id
  month: string; // YYYY-MM
  workedDays: number; // mapped from worked_days
  workedHours: number; // mapped from worked_hours
  customHourlyRate?: number; // mapped from custom_hourly_rate
  extraHours: number; // mapped from extra_hours
  salesAmount: number; // mapped from sales_amount
  targetBonus: number; // mapped from target_bonus
  discounts: number;
  user_id?: string;
}

export interface Totals {
    base: number;
    overtime: number;
    commissions: number;
    bonus: number;
    gross: number;
    net: number;
    taxableGross: number; // Parcela que gera encargos (Mensalista/Horista)
    nonTaxableGross: number; // Parcela isenta (Diarista)
}

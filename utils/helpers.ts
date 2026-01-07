
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const calcularCustoTotal = (ingredientes: any[]) => {
  return ingredientes.reduce((total, item) => {
    // Converte texto pra número e troca vírgula por ponto
    const quantidade = Number(String(item.quantity).replace(',', '.')) || 0;
    const custoUnitario = Number(String(item.cost_per_unit).replace(',', '.')) || 0;
    
    return total + (quantidade * custoUnitario);
  }, 0);
};

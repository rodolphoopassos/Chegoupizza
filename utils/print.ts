
import { formatCurrency } from './helpers';

export const printOrder = (order: any) => {
  const styles = `
    <style>
      @page { size: auto; margin: 0mm; }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        margin: 0; 
        padding: 10px; 
        width: 280px; 
        font-size: 12px; 
        color: black; 
        line-height: 1.2;
      }
      .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
      .title { font-size: 16px; font-weight: bold; margin: 0; }
      .subtitle { font-size: 10px; margin: 2px 0; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      .item { margin-bottom: 6px; }
      .item-header { display: flex; justify-content: space-between; font-weight: bold; }
      .item-details { padding-left: 8px; font-size: 10px; font-style: italic; color: #333; }
      .total-section { text-align: right; font-size: 14px; font-weight: bold; margin-top: 8px; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .address-box { border: 1px solid #000; padding: 6px; margin-top: 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
      .footer { text-align: center; margin-top: 15px; font-size: 9px; opacity: 0.7; }
      .badge { font-weight: bold; border: 1px solid #000; padding: 1px 3px; font-size: 10px; }
    </style>
  `;

  const content = `
    <html>
      <head>
        <title>Imprimir Pedido #${order.id}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <p class="title">CHEGOU PIZZA</p>
          <p class="subtitle">PEDIDO <b>#${order.id}</b></p>
          <p class="subtitle">${new Date(order.data_pedido).toLocaleString('pt-BR')}</p>
        </div>

        <div style="margin-bottom: 8px;">
          <div class="info-row"><span>CLIENTE:</span> <b>${order.cliente_nome.toUpperCase()}</b></div>
          ${order.cliente_telefone ? `<div class="info-row"><span>TEL:</span> ${order.cliente_telefone}</div>` : ''}
        </div>

        <div class="divider"></div>

        ${order.itens_pedido.map((item: any) => `
          <div class="item">
            <div class="item-header">
              <span>${item.qtd}x ${item.produto.toUpperCase()}</span>
              <span>${formatCurrency(item.amount || item.preco_unitario * item.qtd || 0)}</span>
            </div>
            ${item.sabores ? `<div class="item-details">Sabs: ${Array.isArray(item.sabores) ? item.sabores.join('/') : item.sabores}</div>` : ''}
            ${item.borda ? `<div class="item-details">Borda: ${item.borda}</div>` : ''}
            ${item.detalhes ? `<div class="item-details">Obs: ${item.detalhes}</div>` : ''}
          </div>
        `).join('')}

        <div class="divider"></div>

        <div class="info-row">
          <span>SUBTOTAL:</span>
          <span>${formatCurrency(order.valor_total - (order.taxa_entrega || 0))}</span>
        </div>
        <div class="info-row">
          <span>TAXA ENTREGA:</span>
          <span>${formatCurrency(order.taxa_entrega || 0)}</span>
        </div>
        <div class="total-section">
          TOTAL: ${formatCurrency(order.valor_total)}
        </div>

        <div class="divider"></div>

        <div style="margin-top: 8px;">
          PAGAMENTO: <b>${(order.forma_pagamento || 'NÃO INFORMADO').toUpperCase()}</b>
          ${order.troco && order.troco > 0 ? `
            <div style="margin-top: 4px; background: #eee; padding: 4px;">
              LEVAR TROCO DE: <b>${formatCurrency(order.troco)}</b>
            </div>
          ` : ''}
        </div>

        <div class="address-box">
          ENDEREÇO DE ENTREGA:<br/>
          ${order.cliente_endereco || 'RETIRADA NO BALCÃO'}
        </div>

        <div class="footer">
          CHEGOU PIZZA - GESTÃO INTELIGENTE<br/>
          www.chegoupizza.com.br
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=350,height=600');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } else {
    alert('Ops! Bloqueador de pop-ups ativo. Permita pop-ups para imprimir os pedidos.');
  }
};

import jsPDF from "jspdf";
import { formatCurrency } from "@/lib/constants";

export const downloadTransactionPDF = (customer, transaction) => {
  const doc = new jsPDF();
  const tipo = transaction.type === "compra" ? "Compra" : "Pagamento";

  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text(`Recibo de ${tipo}`, 20, 22);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 28, 190, 28);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const rows = [
    ["Cliente", customer.name || ""],
    ["CPF", customer.cpf || ""],
    ["Telefone", customer.phone || ""],
    ["Data", transaction.date || ""],
    ["Hora", transaction.time || ""],
    ["Descrição", transaction.description || ""],
    ["Valor", formatCurrency(transaction.amount)],
    ["Saldo Devedor", formatCurrency(customer.balance || 0)],
  ];

  let y = 40;
  rows.forEach(([label, val]) => {
    if (!val) return;
    doc.setFont(undefined, "bold");
    doc.text(`${label}:`, 20, y);
    doc.setFont(undefined, "normal");
    doc.text(val, 70, y);
    y += 10;
  });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Documento gerado em ${new Date().toLocaleString("pt-BR")}`, 20, 280);

  doc.save(`recibo_${tipo.toLowerCase()}_${transaction.date?.replace(/\//g, "-") || "sem-data"}.pdf`);
};

export const downloadStatementPDF = (customer, transactions) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text("Extrato do Cliente", 20, 22);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 28, 190, 28);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, "bold");
  doc.text("Nome:", 20, 38);
  doc.setFont(undefined, "normal");
  doc.text(customer.name || "", 70, 38);

  doc.setFont(undefined, "bold");
  doc.text("CPF:", 20, 48);
  doc.setFont(undefined, "normal");
  doc.text(customer.cpf || "", 70, 48);

  doc.setFont(undefined, "bold");
  doc.text("Saldo Devedor:", 20, 58);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(formatCurrency(customer.balance || 0), 70, 58);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  let y = 72;
  doc.setFont(undefined, "bold");
  doc.text("Data", 20, y);
  doc.text("Tipo", 65, y);
  doc.text("Descrição", 105, y);
  doc.text("Valor", 165, y);
  doc.line(20, y + 3, 190, y + 3);
  y += 10;
  doc.setFont(undefined, "normal");

  transactions.forEach((t) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(t.date || "", 20, y);
    doc.text(t.type === "compra" ? "Compra" : "Pagamento", 65, y);
    const desc = (t.description || "").substring(0, 30);
    doc.text(desc, 105, y);
    doc.setTextColor(t.type === "compra" ? 220 : 22, t.type === "compra" ? 38 : 163, t.type === "compra" ? 38 : 74);
    doc.text(`${t.type === "compra" ? "-" : "+"} ${formatCurrency(t.amount)}`, 165, y);
    doc.setTextColor(60, 60, 60);
    y += 8;
  });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 20, 288);

  doc.save(`extrato_${(customer.name || "cliente").replace(/\s+/g, "_")}.pdf`);
};

export const downloadReportPDF = (debtors, totalDebt) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text("Relatório de Devedores", 20, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 30);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 34, 190, 34);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, "bold");
  doc.text(`Total em aberto: ${formatCurrency(totalDebt)}`, 20, 44);
  doc.text(`Clientes devendo: ${debtors.length}`, 20, 52);
  doc.setFont(undefined, "normal");

  let y = 65;
  doc.setFontSize(10);

  debtors.forEach((c, i) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont(undefined, "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`${i + 1}. ${c.name}`, 20, y);
    doc.setFont(undefined, "normal");
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrency(c.balance || 0), 165, y);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`CPF: ${c.cpf || "-"}  |  Tel: ${c.phone || "-"}`, 25, y + 7);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    y += 18;
  });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Fiado App - Sistema de Gestão de Crédito`, 20, 288);

  doc.save(`relatorio_devedores_${new Date().toISOString().split("T")[0]}.pdf`);
};

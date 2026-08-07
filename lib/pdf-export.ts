'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFColumn {
  header: string;
  key: string;
}

export function exportToPDF(
  title: string,
  columns: PDFColumn[],
  data: Record<string, unknown>[],
  filename?: string
) {
  const doc = new jsPDF({ orientation: data.length > 8 ? 'landscape' : 'portrait' });
  
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
  doc.text('CFS 2026 — Sistema de Controle de Notas', 14, 34);

  autoTable(doc, {
    startY: 40,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => String(row[c.key] ?? '—'))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportTableToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename?: string
) {
  const doc = new jsPDF({ orientation: rows.length > 8 ? 'landscape' : 'portrait' });
  
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

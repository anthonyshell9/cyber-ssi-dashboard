import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './ExportButton.css';

const ExportButton = ({ data, columns, filename = 'export', title = 'Rapport' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('CYBER-SSI', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(title, 14, 25);
    doc.text(now, 196, 16, { align: 'right' });

    // Table
    autoTable(doc, {
      startY: 42,
      head: [columns.map(c => c.label)],
      body: data.map(row => columns.map(c => {
        const val = row[c.key];
        return val !== undefined && val !== null ? String(val) : '';
      })),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [6, 182, 212], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 8 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i}/${pageCount}`, 105, 290, { align: 'center' });
      doc.text('CYBER-SSI - Confidentiel', 14, 290);
    }

    doc.save(`${filename}_${now.replace(/\//g, '-')}.pdf`);
    setOpen(false);
  };

  const exportCSV = () => {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row =>
      columns.map(c => {
        const val = row[c.key];
        const str = val !== undefined && val !== null ? String(val) : '';
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    a.download = `${filename}_${now.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="export-container" ref={ref}>
      <button className="export-trigger" onClick={() => setOpen(!open)}>
        <span>Exporter</span>
        <span className={`arrow ${open ? 'open' : ''}`}>&#9660;</span>
      </button>
      {open && (
        <div className="export-dropdown">
          <button className="export-option" onClick={exportPDF}>
            <span className="opt-icon">&#128196;</span> Export PDF
          </button>
          <button className="export-option" onClick={exportCSV}>
            <span className="opt-icon">&#128202;</span> Export CSV
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

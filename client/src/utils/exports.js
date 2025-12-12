import jsPDF from 'jspdf';

export const downloadCsv = (rows, headers, filename) => {
    const cols = Object.keys(headers);
    const head = cols.map(k => headers[k]).join(',');
    const body = rows.map(r => cols.map(k => {
        const v = r[k];
        if (v == null) return '';
        const s = String(v);
        const needsQuote = s.includes(',') || s.includes('\n') || s.includes('"');
        const t = s.replace(/"/g, '""');
        return needsQuote ? `"${t}"` : t;
    }).join(',')).join('\n');
    const csv = head + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const exportToExcelHTML = (filename, html) => {
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Simplified Ticket to PDF reusing logic if needed, but Sales/index.jsx handles print now.
// We can keep a robust reporter here later.

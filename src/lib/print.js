// src/lib/print.js
// Every "Export PDF" button in the app calls this. It opens a clean,
// letterhead-style print window and triggers the browser's print dialog —
// the user picks "Save as PDF" as the destination. Works on desktop
// Chrome/Edge and on Android/iOS Chrome & Safari without any extra library.

export function printReport(title, bodyHtml, subtitle) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow pop-ups for this site to export PDF.");
    return;
  }

  const generatedOn = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, 'Segoe UI', Arial, Helvetica, sans-serif;
            padding: 32px 36px;
            color: #1F2937;
            font-size: 13px;
            line-height: 1.5;
          }

          .letterhead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1E3A8A;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .letterhead .brand {
            font-size: 18px;
            font-weight: 800;
            color: #1E3A8A;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .letterhead .meta {
            text-align: right;
            font-size: 11px;
            color: #6B7280;
          }

          h2 { margin: 0 0 4px 0; font-size: 17px; font-weight: 700; color: #1F2937; }
          h3 { font-size: 14px; font-weight: 700; color: #1E3A8A; margin: 20px 0 8px 0; }
          p.subtitle { color: #6B7280; margin: 0 0 14px 0; font-size: 12px; }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #E5E7EB; padding: 7px 9px; text-align: left; }
          th { background: #1E3A8A; color: #fff; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
          tr:nth-child(even) td { background: #F9FAFB; }
          tr { page-break-inside: avoid; }

          .report-footer {
            margin-top: 28px;
            padding-top: 10px;
            border-top: 1px solid #E5E7EB;
            font-size: 10px;
            color: #9CA3AF;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body { padding: 14px 18px; }
            .letterhead { margin-bottom: 12px; }
            @page { margin: 14mm 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <div class="brand">📦 Indenting Agency Manager</div>
          <div class="meta">
            Generated: ${generatedOn}
          </div>
        </div>
        <h2>${title}</h2>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
        ${bodyHtml}
        <div class="report-footer">
          <span>Indenting Agency Manager</span>
          <span>${generatedOn}</span>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400); // small delay lets the content + web font render before the print dialog opens
}

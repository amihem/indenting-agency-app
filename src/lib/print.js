// src/lib/print.js
// Every "Export PDF" button in the app calls this. It opens a clean,
// print-formatted window and triggers the browser's print dialog —
// the user picks "Save as PDF" as the destination. Works on desktop
// Chrome/Edge and on Android/iOS Chrome & Safari without any extra library.

export function printReport(title, bodyHtml) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow pop-ups for this site to export PDF.");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #26282B; }
          h2 { margin-bottom: 4px; }
          p { color: #555; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #22385C; color: #fff; }
          tr:nth-child(even) { background: #f5f5f2; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300); // small delay lets the content render before the print dialog opens
}

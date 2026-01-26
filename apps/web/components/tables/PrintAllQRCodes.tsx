"use client";

import { useState } from "react";
import { Button } from "@qr-dine/ui";
import { Printer, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { renderToString } from "react-dom/server";

interface Table {
  id: string;
  tableNumber: string;
  name: string | null;
}

interface PrintAllQRCodesProps {
  tables: Table[];
  restaurantSlug: string;
  restaurantName?: string;
}

export function PrintAllQRCodes({
  tables,
  restaurantSlug,
  restaurantName = "Restaurant"
}: PrintAllQRCodesProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrintAll = () => {
    setPrinting(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setPrinting(false);
      return;
    }

    // Generate QR codes for all tables
    const qrCodes = tables.map((table) => {
      const url = `${window.location.origin}/m/${restaurantSlug}/${table.id}`;
      const qrSvg = renderToString(
        <QRCode value={url} size={200} level="H" />
      );
      return {
        table,
        url,
        qrSvg,
      };
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Table QR Codes - ${restaurantName}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              page-break-after: avoid;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0 0;
              color: #666;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .qr-card {
              border: 2px solid #000;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-card svg {
              max-width: 100%;
              height: auto;
            }
            .qr-card h2 {
              margin: 15px 0 5px;
              font-size: 20px;
            }
            .qr-card .name {
              color: #666;
              font-size: 14px;
              margin: 0 0 5px;
            }
            .qr-card .scan-text {
              color: #666;
              font-size: 12px;
              margin: 10px 0 0;
            }
            @media print {
              body {
                padding: 0;
              }
              .grid {
                grid-template-columns: repeat(3, 1fr);
              }
              .qr-card {
                border-width: 1px;
              }
              @page {
                margin: 0.5in;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurantName}</h1>
            <p>${tables.length} Table QR Codes</p>
          </div>
          <div class="grid">
            ${qrCodes
              .map(
                ({ table, qrSvg }) => `
              <div class="qr-card">
                ${qrSvg}
                <h2>Table ${table.tableNumber}</h2>
                ${table.name ? `<p class="name">${table.name}</p>` : ""}
                <p class="scan-text">Scan to order</p>
              </div>
            `
              )
              .join("")}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => setPrinting(false), 1000);
  };

  if (tables.length === 0) {
    return null;
  }

  return (
    <Button variant="outline" onClick={handlePrintAll} disabled={printing}>
      {printing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Printer className="mr-2 h-4 w-4" />
      )}
      Print All QR Codes
    </Button>
  );
}

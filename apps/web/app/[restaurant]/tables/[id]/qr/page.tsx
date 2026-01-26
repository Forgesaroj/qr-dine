"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@qr-dine/ui";
import { ArrowLeft, Download, Printer, ExternalLink, Copy, Check, X, Smartphone } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";

interface TableData {
  id: string;
  tableNumber: string;
  name: string | null;
  qrCode: string | null;
}

export default function TableQRPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const tableId = params.id as string;
  const qrRef = useRef<HTMLDivElement>(null);

  const [table, setTable] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTable();
  }, [tableId]);

  const fetchTable = async () => {
    try {
      const response = await fetch(`/api/tables/${tableId}`);
      const data = await response.json();
      if (response.ok) {
        setTable(data.table);
      }
    } catch (err) {
      console.error("Failed to fetch table:", err);
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = table?.qrCode || `${window.location.origin}/m/${restaurant}/${table?.id}`;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;

      if (ctx) {
        // White background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(img, 50, 50, 300, 300);

        // Add table info
        ctx.fillStyle = "black";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Table ${table?.tableNumber}`, canvas.width / 2, 400);

        ctx.font = "16px Arial";
        ctx.fillText("Scan to order", canvas.width / 2, 430);
        ctx.fillText(restaurant, canvas.width / 2, 460);
      }

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `table-${table?.tableNumber}-qr.png`;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${table?.tableNumber} QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #000;
              border-radius: 12px;
            }
            h1 {
              margin: 20px 0 10px;
              font-size: 32px;
            }
            p {
              margin: 5px 0;
              color: #666;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${svgData}
            <h1>Table ${table?.tableNumber}</h1>
            <p>Scan to order</p>
            <p style="font-size: 12px; margin-top: 15px;">${restaurant}</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading...</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg">Table not found</p>
        <Link href={`/${restaurant}/tables`}>
          <Button variant="link">Back to tables</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/tables`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Table {table.tableNumber} QR Code</h1>
          <p className="text-muted-foreground">
            {table.name || "Scan this code to place orders"}
          </p>
        </div>
      </div>

      {/* QR Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <div
            ref={qrRef}
            className="bg-white p-6 rounded-lg border"
          >
            <QRCode value={qrUrl} size={256} level="H" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">Table {table.tableNumber}</p>
            <p className="text-sm text-muted-foreground">
              Customers can scan this QR code to view the menu and place orders
            </p>
          </div>

          <div className="flex gap-3 w-full max-w-sm">
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>

          <div className="pt-4 border-t w-full space-y-4">
            <p className="text-xs text-muted-foreground text-center">QR Code URL:</p>
            <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
              <code className="text-xs flex-1 break-all">
                {qrUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(true)}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Tab
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">Mobile Preview</h3>
                <p className="text-xs text-muted-foreground">Table {table.tableNumber}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Phone Frame */}
            <div className="p-4 bg-muted">
              <div className="mx-auto w-[320px] h-[568px] bg-black rounded-[40px] p-3 shadow-xl">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative">
                  {/* Phone Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />

                  {/* iframe Content */}
                  <iframe
                    src={qrUrl}
                    className="w-full h-full border-0"
                    title="Order Page Preview"
                  />
                </div>
              </div>
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(false)}
              >
                Close
              </Button>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Page
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

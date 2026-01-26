"use client";

import { useState } from "react";
import { Button } from "@qr-dine/ui";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

interface ExportButtonProps {
  data: Record<string, unknown> | object;
  filename: string;
  title?: string;
}

export function ExportButton({ data, filename, title = "Report" }: ExportButtonProps) {
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const dataRecord = data as Record<string, unknown>;

  const exportToExcel = async () => {
    setExporting("excel");
    try {
      // Convert data to CSV format
      const csvContent = convertToCSV(dataRecord);

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${formatDate(new Date())}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(null);
      setShowMenu(false);
    }
  };

  const exportToPDF = async () => {
    setExporting("pdf");
    try {
      // Create printable HTML content
      const printContent = generatePrintHTML(dataRecord, title);

      // Open print dialog
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(null);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting !== null}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export
      </Button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border shadow-lg z-50">
            <button
              onClick={exportToExcel}
              disabled={exporting !== null}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Export to Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting !== null}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
            >
              <FileText className="h-4 w-4 text-red-600" />
              Export to PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function convertToCSV(data: Record<string, unknown>): string {
  const lines: string[] = [];

  // Handle summary section
  if (data.summary && typeof data.summary === "object") {
    lines.push("Summary");
    const summary = data.summary as Record<string, unknown>;
    Object.entries(summary).forEach(([key, value]) => {
      lines.push(`${formatHeader(key)},${value}`);
    });
    lines.push("");
  }

  // Handle top items
  if (data.topItems && Array.isArray(data.topItems)) {
    lines.push("Top Selling Items");
    lines.push("Name,Category,Quantity,Revenue");
    (data.topItems as Array<{ name: string; category: string; quantity: number; revenue: number }>)
      .forEach((item) => {
        lines.push(`"${item.name}","${item.category}",${item.quantity},${item.revenue}`);
      });
    lines.push("");
  }

  // Handle category breakdown
  if (data.categoryBreakdown && Array.isArray(data.categoryBreakdown)) {
    lines.push("Category Breakdown");
    lines.push("Category,Revenue,Orders");
    (data.categoryBreakdown as Array<{ name: string; revenue: number; orders: number }>)
      .forEach((cat) => {
        lines.push(`"${cat.name}",${cat.revenue},${cat.orders}`);
      });
    lines.push("");
  }

  // Handle hourly data
  if (data.hourlyData && Array.isArray(data.hourlyData) && data.hourlyData.length > 0) {
    lines.push("Hourly Breakdown");
    lines.push("Hour,Orders,Revenue");
    (data.hourlyData as Array<{ hour: number; orders: number; revenue: number }>)
      .forEach((h) => {
        lines.push(`${h.hour}:00,${h.orders},${h.revenue}`);
      });
    lines.push("");
  }

  // Handle status breakdown
  if (data.statusBreakdown && typeof data.statusBreakdown === "object") {
    lines.push("Order Status Breakdown");
    const status = data.statusBreakdown as Record<string, number>;
    Object.entries(status).forEach(([key, value]) => {
      lines.push(`${formatHeader(key)},${value}`);
    });
  }

  return lines.join("\n");
}

function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function generatePrintHTML(data: Record<string, unknown>, title: string): string {
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .summary-item { background: #f9f9f9; padding: 15px; border-radius: 8px; }
        .summary-item h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
        .summary-item p { margin: 0; font-size: 24px; font-weight: bold; }
        .print-date { color: #999; font-size: 12px; margin-bottom: 20px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="print-date">Generated on ${new Date().toLocaleString()}</p>
  `;

  // Summary section
  if (data.summary && typeof data.summary === "object") {
    const summary = data.summary as Record<string, unknown>;
    html += `
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <h3>Total Orders</h3>
          <p>${summary.totalOrders}</p>
        </div>
        <div class="summary-item">
          <h3>Completed Orders</h3>
          <p>${summary.completedOrders}</p>
        </div>
        <div class="summary-item">
          <h3>Total Revenue</h3>
          <p>${formatCurrency(summary.totalRevenue as number)}</p>
        </div>
        <div class="summary-item">
          <h3>Average Order Value</h3>
          <p>${formatCurrency(summary.averageOrderValue as number)}</p>
        </div>
      </div>
    `;
  }

  // Top items table
  if (data.topItems && Array.isArray(data.topItems) && data.topItems.length > 0) {
    html += `
      <h2>Top Selling Items</h2>
      <table>
        <thead>
          <tr><th>Item</th><th>Category</th><th>Quantity</th><th>Revenue</th></tr>
        </thead>
        <tbody>
    `;
    (data.topItems as Array<{ name: string; category: string; quantity: number; revenue: number }>)
      .forEach((item) => {
        html += `<tr><td>${item.name}</td><td>${item.category}</td><td>${item.quantity}</td><td>${formatCurrency(item.revenue)}</td></tr>`;
      });
    html += `</tbody></table>`;
  }

  // Category breakdown
  if (data.categoryBreakdown && Array.isArray(data.categoryBreakdown) && data.categoryBreakdown.length > 0) {
    html += `
      <h2>Sales by Category</h2>
      <table>
        <thead>
          <tr><th>Category</th><th>Revenue</th><th>Items Sold</th></tr>
        </thead>
        <tbody>
    `;
    (data.categoryBreakdown as Array<{ name: string; revenue: number; orders: number }>)
      .forEach((cat) => {
        html += `<tr><td>${cat.name}</td><td>${formatCurrency(cat.revenue)}</td><td>${cat.orders}</td></tr>`;
      });
    html += `</tbody></table>`;
  }

  html += `</body></html>`;
  return html;
}

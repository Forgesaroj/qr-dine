"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Printer,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface LedgerEntry {
  id: string;
  account: {
    accountCode: string;
    accountName: string;
  };
  debitAmount: number;
  creditAmount: number;
  narration: string | null;
}

interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  status: string;
  totalAmount: number;
  narration: string | null;
  partyName: string | null;
  createdByName: string;
  ledgerEntries: LedgerEntry[];
}

interface DayBookData {
  vouchers: Voucher[];
  grouped: Record<string, Voucher[]>;
  totals: {
    totalVouchers: number;
    totalAmount: number;
    byType: Array<{
      type: string;
      count: number;
      amount: number;
    }>;
  };
  date: string;
}

const getVoucherTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    PAYMENT: "Payment Vouchers",
    RECEIPT: "Receipt Vouchers",
    CONTRA: "Contra Vouchers",
    JOURNAL: "Journal Vouchers",
    SALES: "Sales Vouchers",
    PURCHASE: "Purchase Vouchers",
    CREDIT_NOTE: "Credit Notes",
    DEBIT_NOTE: "Debit Notes",
  };
  return labels[type] || type;
};

const getVoucherTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    PAYMENT: "bg-red-100 text-red-700 border-red-200",
    RECEIPT: "bg-green-100 text-green-700 border-green-200",
    CONTRA: "bg-blue-100 text-blue-700 border-blue-200",
    JOURNAL: "bg-purple-100 text-purple-700 border-purple-200",
    SALES: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PURCHASE: "bg-orange-100 text-orange-700 border-orange-200",
    CREDIT_NOTE: "bg-pink-100 text-pink-700 border-pink-200",
    DEBIT_NOTE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
};

export default function DayBookPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dayBook, setDayBook] = useState<DayBookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDayBook();
  }, [selectedDate]);

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/day-book?date=${selectedDate}`);
      const data = await response.json();
      setDayBook(data);
    } catch (error) {
      console.error("Error fetching day book:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isToday =
    selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Day Book</h1>
          <p className="text-gray-500">
            Daily transaction register
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/accounting`}>
            <Button variant="outline">Back to Accounting</Button>
          </Link>
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousDay}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Day
            </Button>

            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
              {!isToday && (
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Today
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={goToNextDay} disabled={isToday}>
              Next Day
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{formatDate(selectedDate)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {dayBook?.totals.totalVouchers || 0}
                  </p>
                  <p className="text-sm text-gray-500">Total Vouchers</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">
                    Rs. {Number(dayBook?.totals.totalAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                </div>
                {dayBook?.totals.byType.slice(0, 2).map((type) => (
                  <div key={type.type} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold">{type.count}</p>
                    <p className="text-sm text-gray-500">
                      {getVoucherTypeLabel(type.type).replace(" Vouchers", "")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vouchers by Type */}
          {dayBook?.vouchers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transactions on this day</p>
                <Link href={`/${restaurant}/accounting/vouchers/new`}>
                  <Button variant="outline" className="mt-4">
                    Create Voucher
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            Object.entries(dayBook?.grouped || {}).map(([type, vouchers]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${
                      getVoucherTypeColor(type).split(" ")[1]
                    }`}
                  >
                    <Receipt className="w-5 h-5" />
                    {getVoucherTypeLabel(type)}
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""} •
                      Rs.{" "}
                      {vouchers
                        .reduce((sum, v) => sum + Number(v.totalAmount), 0)
                        .toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {vouchers.map((voucher, index) => (
                    <div
                      key={voucher.id}
                      className={`p-4 ${
                        index !== vouchers.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Link
                            href={`/${restaurant}/accounting/vouchers/${voucher.id}`}
                            className="font-mono font-medium hover:text-blue-600"
                          >
                            {voucher.voucherNumber}
                          </Link>
                          {voucher.partyName && (
                            <span className="ml-3 text-gray-600">
                              {voucher.partyName}
                            </span>
                          )}
                          <span
                            className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              voucher.status === "POSTED"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {voucher.status}
                          </span>
                        </div>
                        <span className="font-mono font-medium">
                          Rs. {Number(voucher.totalAmount).toLocaleString()}
                        </span>
                      </div>

                      {/* Ledger Entries */}
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="p-2">Account</th>
                              <th className="p-2 text-right w-32">Debit</th>
                              <th className="p-2 text-right w-32">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {voucher.ledgerEntries.map((entry) => (
                              <tr key={entry.id} className="border-b last:border-0">
                                <td className="p-2">
                                  <span className="font-mono text-gray-500 mr-2">
                                    {entry.account.accountCode}
                                  </span>
                                  {entry.account.accountName}
                                </td>
                                <td className="p-2 text-right font-mono">
                                  {Number(entry.debitAmount) > 0
                                    ? Number(entry.debitAmount).toLocaleString()
                                    : "-"}
                                </td>
                                <td className="p-2 text-right font-mono">
                                  {Number(entry.creditAmount) > 0
                                    ? Number(entry.creditAmount).toLocaleString()
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {voucher.narration && (
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Narration:</span>{" "}
                          {voucher.narration}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

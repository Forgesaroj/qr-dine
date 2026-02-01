"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Receipt,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  Building2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountGroup: string;
  accountType: string;
  currentBalance: number;
  allowPosting: boolean;
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
}

interface LedgerEntry {
  accountId: string;
  account?: Account;
  costCenterId?: string;
  costCenter?: CostCenter;
  debitAmount: number;
  creditAmount: number;
  narration: string;
}

const VOUCHER_TYPES = [
  { value: "PAYMENT", label: "Payment Voucher", description: "Cash/Bank payments to vendors" },
  { value: "RECEIPT", label: "Receipt Voucher", description: "Cash/Bank receipts from customers" },
  { value: "CONTRA", label: "Contra Voucher", description: "Cash to Bank, Bank to Cash" },
  { value: "JOURNAL", label: "Journal Voucher", description: "Manual adjustments" },
  { value: "SALES", label: "Sales Voucher", description: "Sales transactions" },
  { value: "PURCHASE", label: "Purchase Voucher", description: "Purchase transactions" },
  { value: "CREDIT_NOTE", label: "Credit Note", description: "Sales returns" },
  { value: "DEBIT_NOTE", label: "Debit Note", description: "Purchase returns" },
];

export default function NewVoucherPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurant = params.restaurant as string;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [voucherType, setVoucherType] = useState(
    searchParams.get("type") || "PAYMENT"
  );
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [narration, setNarration] = useState("");
  const [partyName, setPartyName] = useState("");
  const [entries, setEntries] = useState<LedgerEntry[]>([
    { accountId: "", costCenterId: "", debitAmount: 0, creditAmount: 0, narration: "" },
    { accountId: "", costCenterId: "", debitAmount: 0, creditAmount: 0, narration: "" },
  ]);
  const [autoPost, setAutoPost] = useState(false);

  // Account search
  const [searchTerm, setSearchTerm] = useState("");
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, costCentersRes] = await Promise.all([
        fetch("/api/accounting/accounts?isActive=true"),
        fetch("/api/accounting/cost-centers?isActive=true"),
      ]);

      const [accountsData, costCentersData] = await Promise.all([
        accountsRes.json(),
        costCentersRes.json(),
      ]);

      setAccounts(
        (accountsData.accounts || []).filter((a: Account) => a.allowPosting)
      );
      setCostCenters(costCentersData.costCenters || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    setEntries([
      ...entries,
      { accountId: "", costCenterId: "", debitAmount: 0, creditAmount: 0, narration: "" },
    ]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 2) return; // Minimum 2 entries
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof LedgerEntry,
    value: string | number | Account | CostCenter
  ) => {
    const newEntries = [...entries];
    if (field === "account") {
      newEntries[index] = {
        ...newEntries[index],
        account: value as Account,
        accountId: (value as Account).id,
      };
    } else if (field === "costCenter") {
      newEntries[index] = {
        ...newEntries[index],
        costCenter: value as CostCenter,
        costCenterId: (value as CostCenter).id,
      };
    } else {
      newEntries[index] = { ...newEntries[index], [field]: value };
    }
    setEntries(newEntries);
  };

  const selectAccount = (index: number, account: Account) => {
    updateEntry(index, "account", account);
    setActiveEntryIndex(null);
    setSearchTerm("");
  };

  // Calculate totals
  const totalDebit = entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate party name
    if (!partyName.trim()) {
      setError("Party name is required");
      return;
    }

    // Validate entries
    const validEntries = entries.filter((e) => e.accountId && (e.debitAmount || e.creditAmount));

    if (validEntries.length < 2) {
      setError("At least 2 valid entries are required");
      return;
    }

    if (!isBalanced) {
      setError(`Total Debits (Rs. ${totalDebit}) must equal Total Credits (Rs. ${totalCredit})`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        voucherType,
        voucherDate,
        narration: narration.trim() || undefined,
        partyName: partyName.trim(),
        autoPost,
        entries: validEntries.map((e) => ({
          accountId: e.accountId,
          costCenterId: e.costCenterId || undefined,
          debitAmount: e.debitAmount || undefined,
          creditAmount: e.creditAmount || undefined,
          narration: e.narration || undefined,
        })),
      };

      const response = await fetch("/api/accounting/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${restaurant}/accounting/vouchers`);
        }, 2000);
      } else {
        setError(data.error || "Failed to create voucher");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (account) =>
      account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Voucher Created!</h2>
            <p className="text-gray-500 mb-4">
              {autoPost
                ? "The voucher has been created and posted."
                : "The voucher has been saved as draft."}
            </p>
            <p className="text-sm text-gray-400">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/accounting/vouchers`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Voucher Entry</h1>
          <p className="text-gray-500">Create a new accounting voucher</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Voucher Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Voucher Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Voucher Type
                </label>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  {VOUCHER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {VOUCHER_TYPES.find((t) => t.value === voucherType)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Voucher Date
                </label>
                <Input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Party Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Vendor/Customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Narration
                </label>
                <textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Description of the transaction..."
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPost}
                    onChange={(e) => setAutoPost(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Post voucher immediately</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {autoPost
                    ? "Voucher will be posted and account balances updated"
                    : "Save as draft for review before posting"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Entries */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ledger Entries</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchData}
                    title="Refresh accounts and cost centers"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Entry
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entry Headers */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-500">
                <div className="col-span-4 flex items-center gap-1">
                  Account
                  <a
                    href={`/${restaurant}/accounting/accounts`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                    title="Add new account (opens in new tab)"
                  >
                    <Plus className="w-3 h-3" />
                  </a>
                </div>
                <div className="col-span-3 flex items-center gap-1">
                  Cost Center
                </div>
                <div className="col-span-2 text-right">Debit (Rs.)</div>
                <div className="col-span-2 text-right">Credit (Rs.)</div>
                <div className="col-span-1"></div>
              </div>

              {/* Entries */}
              {entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 relative flex gap-1">
                    <Input
                      placeholder="Search account..."
                      value={
                        entry.account
                          ? `${entry.account.accountCode} - ${entry.account.accountName}`
                          : ""
                      }
                      onClick={() => setActiveEntryIndex(index)}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setActiveEntryIndex(index);
                      }}
                      className="cursor-pointer"
                    />
                    {activeEntryIndex === index && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-8 pr-2 py-1 text-sm border rounded"
                              autoFocus
                            />
                          </div>
                        </div>
                        {filteredAccounts.slice(0, 10).map((account) => (
                          <div
                            key={account.id}
                            onClick={() => selectAccount(index, account)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0"
                          >
                            <div className="flex justify-between">
                              <span className="font-medium text-sm">
                                {account.accountCode}
                              </span>
                              <span
                                className={`text-xs px-1 rounded ${
                                  account.accountGroup === "ASSETS" ||
                                  account.accountGroup === "EXPENSES"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {account.accountGroup}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {account.accountName}
                            </p>
                          </div>
                        ))}
                        {filteredAccounts.length === 0 && (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No accounts found
                          </div>
                        )}
                        {/* Add new account link */}
                        <a
                          href={`/${restaurant}/accounting/accounts`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border-t hover:bg-blue-50 text-blue-600 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add New Account
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <div className="flex gap-1">
                      <select
                        value={entry.costCenterId || ""}
                        onChange={(e) => {
                          const cc = costCenters.find(c => c.id === e.target.value);
                          if (cc) {
                            updateEntry(index, "costCenter", cc);
                          } else {
                            const newEntries = [...entries];
                            newEntries[index] = {
                              ...newEntries[index],
                              costCenterId: "",
                              costCenter: undefined,
                            };
                            setEntries(newEntries);
                          }
                        }}
                        className="flex-1 h-10 px-2 border rounded-md text-sm"
                      >
                        <option value="">No Cost Center</option>
                        {costCenters.map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.code} - {cc.name}
                          </option>
                        ))}
                      </select>
                      <a
                        href={`/${restaurant}/accounting/cost-centers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-10 border rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                        title="Add new cost center"
                      >
                        <Plus className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={entry.debitAmount || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateEntry(index, "debitAmount", value);
                        if (value > 0) updateEntry(index, "creditAmount", 0);
                      }}
                      className="text-right"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={entry.creditAmount || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateEntry(index, "creditAmount", value);
                        if (value > 0) updateEntry(index, "debitAmount", 0);
                      }}
                      className="text-right"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                      disabled={entries.length <= 2}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="grid grid-cols-12 gap-2 pt-4 border-t font-medium">
                <div className="col-span-4 text-right">Total:</div>
                <div className="col-span-3"></div>
                <div className="col-span-2 text-right font-mono">
                  Rs. {totalDebit.toFixed(2)}
                </div>
                <div className="col-span-2 text-right font-mono">
                  Rs. {totalCredit.toFixed(2)}
                </div>
                <div className="col-span-1"></div>
              </div>

              {/* Balance Status */}
              <div
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  isBalanced
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {isBalanced ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Debits and Credits are balanced</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      Difference: Rs. {Math.abs(totalDebit - totalCredit).toFixed(2)}
                    </span>
                  </>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link href={`/${restaurant}/accounting/vouchers`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting || !isBalanced}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : autoPost ? (
                    "Create & Post"
                  ) : (
                    "Save as Draft"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Click outside to close dropdown */}
      {activeEntryIndex !== null && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setActiveEntryIndex(null);
            setSearchTerm("");
          }}
        />
      )}
    </div>
  );
}

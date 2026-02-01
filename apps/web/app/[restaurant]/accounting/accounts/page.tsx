"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  BookOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit2,
  Eye,
  X,
  Loader2,
  Building,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountNameLocal: string | null;
  accountGroup: string;
  accountType: string;
  level: number;
  parentId: string | null;
  isBankAccount: boolean;
  isCashAccount: boolean;
  isActive: boolean;
  allowPosting: boolean;
  openingBalance: number;
  currentBalance: number;
  children?: Account[];
  transactionCount: number;
}

interface AccountStats {
  totalAccounts: number;
  groupCounts: {
    ASSETS: number;
    LIABILITIES: number;
    INCOME: number;
    EXPENSES: number;
    EQUITY: number;
  };
}

const ACCOUNT_GROUPS = [
  { value: "ASSETS", label: "Assets", icon: Building, color: "text-blue-600 bg-blue-100" },
  { value: "LIABILITIES", label: "Liabilities", icon: CreditCard, color: "text-red-600 bg-red-100" },
  { value: "INCOME", label: "Income", icon: TrendingUp, color: "text-green-600 bg-green-100" },
  { value: "EXPENSES", label: "Expenses", icon: TrendingDown, color: "text-orange-600 bg-orange-100" },
  { value: "EQUITY", label: "Equity", icon: DollarSign, color: "text-purple-600 bg-purple-100" },
];

const ACCOUNT_TYPES = [
  "FIXED_ASSETS",
  "CURRENT_ASSETS",
  "CASH_BANK",
  "RECEIVABLES",
  "INVENTORY",
  "CURRENT_LIABILITIES",
  "PAYABLES",
  "LONG_TERM_LIABILITIES",
  "SALES_REVENUE",
  "OTHER_INCOME",
  "COGS",
  "OPERATING_EXPENSES",
  "ADMIN_EXPENSES",
  "CAPITAL",
  "RETAINED_EARNINGS",
];

export default function ChartOfAccountsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["ASSETS", "LIABILITIES", "INCOME", "EXPENSES"])
  );
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountNameLocal: "",
    accountGroup: "ASSETS",
    accountType: "CURRENT_ASSETS",
    parentId: "",
    isBankAccount: false,
    isCashAccount: false,
    allowPosting: true,
    openingBalance: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounting/accounts?hierarchical=true");
      const data = await response.json();
      setAccounts(data.accounts || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.accountCode || !formData.accountName || !formData.accountGroup) {
      setError("Account code, name, and group are required");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          openingBalance: formData.openingBalance
            ? parseFloat(formData.openingBalance)
            : 0,
          parentId: formData.parentId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowForm(false);
        setFormData({
          accountCode: "",
          accountName: "",
          accountNameLocal: "",
          accountGroup: "ASSETS",
          accountType: "CURRENT_ASSETS",
          parentId: "",
          isBankAccount: false,
          isCashAccount: false,
          allowPosting: true,
          openingBalance: "",
        });
        fetchAccounts();
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Group accounts by accountGroup
  const groupedAccounts = ACCOUNT_GROUPS.map((group) => ({
    ...group,
    accounts: accounts.filter((a) => a.accountGroup === group.value),
  }));

  // Flatten accounts for parent selection
  const flattenAccounts = (
    accs: Account[],
    level = 0
  ): Array<{ id: string; name: string; level: number; group: string }> => {
    const result: Array<{ id: string; name: string; level: number; group: string }> = [];
    for (const acc of accs) {
      result.push({
        id: acc.id,
        name: `${acc.accountCode} - ${acc.accountName}`,
        level,
        group: acc.accountGroup,
      });
      if (acc.children && acc.children.length > 0) {
        result.push(...flattenAccounts(acc.children, level + 1));
      }
    }
    return result;
  };

  const flatAccounts = flattenAccounts(accounts);

  const renderAccount = (account: Account, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);

    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 border-b ${
            level > 0 ? "bg-gray-50/50" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleAccount(account.id)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-5"></span>
          )}

          <span className="font-mono text-sm text-gray-600 w-20">
            {account.accountCode}
          </span>

          <span className="flex-1 text-sm">{account.accountName}</span>

          <span
            className={`text-xs px-2 py-0.5 rounded ${
              account.allowPosting
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {account.allowPosting ? "Posting" : "Group"}
          </span>

          {account.isBankAccount && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              Bank
            </span>
          )}

          {account.isCashAccount && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
              Cash
            </span>
          )}

          <span className="text-sm font-mono w-32 text-right">
            Rs. {Number(account.currentBalance).toLocaleString()}
          </span>

          <Link href={`/${restaurant}/accounting/accounts/${account.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {hasChildren &&
          isExpanded &&
          account.children!.map((child) => renderAccount(child, level + 1))}
      </div>
    );
  };

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-gray-500">
            Manage your accounting structure
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/accounting`}>
            <Button variant="outline">Back to Accounting</Button>
          </Link>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {ACCOUNT_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <Card
                key={group.value}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => toggleGroup(group.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${group.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {stats.groupCounts[group.value as keyof typeof stats.groupCounts] || 0}
                      </p>
                      <p className="text-xs text-gray-500">{group.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Tree */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Account Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {groupedAccounts.map((group) => {
              const Icon = group.icon;
              const isExpanded = expandedGroups.has(group.value);

              return (
                <div key={group.value} className="border-b last:border-0">
                  <div
                    onClick={() => toggleGroup(group.value)}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 ${group.color}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{group.label}</span>
                    <span className="ml-auto text-sm">
                      {group.accounts.length} accounts
                    </span>
                  </div>

                  {isExpanded && group.accounts.length > 0 && (
                    <div className="bg-white">
                      {group.accounts.map((account) => renderAccount(account))}
                    </div>
                  )}

                  {isExpanded && group.accounts.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No accounts in this group
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Add Account Form */}
        <Card className={showForm ? "" : "opacity-60"}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Add Account</span>
              {showForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">Click to add a new account</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Account Code <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.accountCode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          accountCode: e.target.value,
                        }))
                      }
                      placeholder="e.g., 1001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Account Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.accountGroup}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          accountGroup: e.target.value,
                        }))
                      }
                      className="w-full h-10 px-3 border rounded-md"
                    >
                      {ACCOUNT_GROUPS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.accountName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        accountName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Cash in Hand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Account Type
                  </label>
                  <select
                    value={formData.accountType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        accountType: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Parent Account
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        parentId: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="">No Parent (Root Account)</option>
                    {flatAccounts
                      .filter((a) => a.group === formData.accountGroup)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {"—".repeat(acc.level)} {acc.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Opening Balance
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        openingBalance: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowPosting}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          allowPosting: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Allow posting to this account</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCashAccount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isCashAccount: e.target.checked,
                          isBankAccount: e.target.checked
                            ? false
                            : prev.isBankAccount,
                        }))
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Cash Account</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBankAccount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isBankAccount: e.target.checked,
                          isCashAccount: e.target.checked
                            ? false
                            : prev.isCashAccount,
                        }))
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Bank Account</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

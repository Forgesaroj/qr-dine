"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, Button, Badge } from "@qr-dine/ui";
import {
  Loader2,
  ArrowLeft,
  Star,
  Gift,
  Cake,
  Trophy,
  Clock,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Award,
  Sparkles,
  Calendar,
  Coins,
  History,
  Target,
} from "lucide-react";
import { useGuest } from "../GuestContext";

interface Transaction {
  id: string;
  type: "EARN" | "REDEEM" | "BONUS" | "EXPIRE" | "ADJUST";
  points: number;
  balanceAfter: number;
  description: string;
  bonusType: string | null;
  date: string;
  expiresAt: string | null;
  orderNumber: string | null;
  orderAmount: number | null;
}

interface Milestone {
  visitNumber: number;
  bonusPoints: number;
  achieved: boolean;
  current: boolean;
}

interface MilestoneData {
  currentVisits: number;
  nextMilestone: {
    visitNumber: number;
    bonusPoints: number;
    visitsRemaining: number;
  } | null;
  milestones: Milestone[];
}

const TIER_CONFIG = {
  BRONZE: {
    color: "bg-amber-600",
    textColor: "text-amber-600",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Award,
    nextTier: "SILVER",
    threshold: 0,
    nextThreshold: 500,
  },
  SILVER: {
    color: "bg-gray-400",
    textColor: "text-gray-500",
    bgLight: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Award,
    nextTier: "GOLD",
    threshold: 500,
    nextThreshold: 2000,
  },
  GOLD: {
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgLight: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: Trophy,
    nextTier: "PLATINUM",
    threshold: 2000,
    nextThreshold: 5000,
  },
  PLATINUM: {
    color: "bg-purple-600",
    textColor: "text-purple-600",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Sparkles,
    nextTier: null,
    threshold: 5000,
    nextThreshold: null,
  },
};

export default function GuestLoyaltyPage() {
  const params = useParams();
  const router = useRouter();
  const { session, loyalty, claimBirthdayBonus, refreshLoyalty } = useGuest();

  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [milestoneData, setMilestoneData] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingBirthday, setClaimingBirthday] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState<string | null>(null);

  // Fetch loyalty data
  useEffect(() => {
    const fetchData = async () => {
      if (!loyalty.token || !loyalty.customer) {
        setLoading(false);
        return;
      }

      try {
        // Fetch transaction history and milestones in parallel
        const [historyRes, milestonesRes] = await Promise.all([
          fetch(
            `/api/guest/loyalty/history?token=${loyalty.token}&restaurant=${restaurantSlug}&limit=10`
          ),
          fetch(
            `/api/guest/loyalty/milestones?token=${loyalty.token}&restaurant=${restaurantSlug}`
          ),
        ]);

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setTransactions(historyData.transactions || []);
        }

        if (milestonesRes.ok) {
          const milestonesData = await milestonesRes.json();
          setMilestoneData(milestonesData);
        }
      } catch (error) {
        console.error("Error fetching loyalty data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loyalty.token, loyalty.customer, restaurantSlug]);

  const handleClaimBirthday = async () => {
    setClaimingBirthday(true);
    setBirthdayMessage(null);

    const result = await claimBirthdayBonus();

    if (result.success) {
      setBirthdayMessage(`Claimed ${result.pointsAwarded} birthday points!`);
      await refreshLoyalty();
      // Refresh transaction history
      const historyRes = await fetch(
        `/api/guest/loyalty/history?token=${loyalty.token}&restaurant=${restaurantSlug}&limit=10`
      );
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setTransactions(historyData.transactions || []);
      }
    } else {
      setBirthdayMessage(result.error || "Failed to claim birthday bonus");
    }

    setClaimingBirthday(false);
  };

  // Not a loyalty member
  if (!loyalty.customer || !loyalty.token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">Loyalty Program</h1>
          </div>
        </header>

        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Not a Member Yet
            </h2>
            <p className="text-gray-500 mb-6">
              Join our loyalty program to earn points and unlock rewards!
            </p>
            <Link href={`/m/${restaurantSlug}/${tableId}`}>
              <Button className="bg-green-600 hover:bg-green-700">
                <Star className="w-4 h-4 mr-2" />
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const customer = loyalty.customer;
  const tier = customer.tier as keyof typeof TIER_CONFIG;
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  const TierIcon = tierConfig.icon;

  // Calculate progress to next tier
  const currentPoints = customer.pointsBalance;
  const tierProgress = tierConfig.nextThreshold
    ? Math.min(
        100,
        ((currentPoints - tierConfig.threshold) /
          (tierConfig.nextThreshold - tierConfig.threshold)) *
          100
      )
    : 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold text-lg">My Rewards</h1>
        </div>
      </header>

      {/* Points Balance Hero */}
      <div className={`${tierConfig.bgLight} px-4 py-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">Welcome back,</p>
            <h2 className="text-xl font-bold text-gray-800">{customer.name}</h2>
          </div>
          <div
            className={`${tierConfig.color} text-white px-3 py-1.5 rounded-full flex items-center gap-1.5`}
          >
            <TierIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{tier}</span>
          </div>
        </div>

        <Card className={`border-2 ${tierConfig.borderColor}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Available Points</p>
                <div className="flex items-center gap-2">
                  <Star className={`w-6 h-6 ${tierConfig.textColor}`} />
                  <span className="text-3xl font-bold text-gray-800">
                    {currentPoints.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Points Value</p>
                <p className={`text-lg font-semibold ${tierConfig.textColor}`}>
                  ₹{currentPoints}
                </p>
              </div>
            </div>

            {/* Tier Progress */}
            {tierConfig.nextTier && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{tier}</span>
                  <span>{tierConfig.nextTier}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tierConfig.color} transition-all duration-500`}
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {tierConfig.nextThreshold! - currentPoints} points to{" "}
                  {tierConfig.nextTier}
                </p>
              </div>
            )}

            {!tierConfig.nextTier && (
              <div className="mt-4 text-center">
                <p className="text-sm text-purple-600 font-medium">
                  You&apos;ve reached the highest tier!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Points Warning */}
      {loyalty.expiringPoints?.hasExpiringPoints && (
        <div className="mx-4 mt-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  {loyalty.expiringPoints.expiringPoints} points expiring soon
                </p>
                <p className="text-xs text-orange-600">
                  {loyalty.expiringPoints.message}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Birthday Bonus */}
      {loyalty.birthdayBonus?.isBirthday && (
        <div className="mx-4 mt-4">
          <Card
            className={`border-2 ${
              loyalty.birthdayBonus.canClaim
                ? "border-pink-300 bg-gradient-to-r from-pink-50 to-purple-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    loyalty.birthdayBonus.canClaim
                      ? "bg-pink-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Cake
                    className={`w-6 h-6 ${
                      loyalty.birthdayBonus.canClaim
                        ? "text-pink-500"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    Happy Birthday!
                  </h3>
                  {loyalty.birthdayBonus.canClaim ? (
                    <p className="text-sm text-gray-600">
                      Claim your {loyalty.birthdayBonus.bonusAmount} bonus
                      points!
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      You&apos;ve already claimed your birthday bonus this year
                    </p>
                  )}
                </div>
                {loyalty.birthdayBonus.canClaim && (
                  <Button
                    onClick={handleClaimBirthday}
                    disabled={claimingBirthday}
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    {claimingBirthday ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Claim"
                    )}
                  </Button>
                )}
              </div>
              {birthdayMessage && (
                <p
                  className={`mt-2 text-sm ${
                    birthdayMessage.includes("Claimed")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {birthdayMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visit Milestones */}
      {milestoneData && milestoneData.nextMilestone && (
        <div className="mx-4 mt-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">Next Milestone</h3>
                  <p className="text-sm text-gray-600">
                    {milestoneData.nextMilestone.visitsRemaining} more visit
                    {milestoneData.nextMilestone.visitsRemaining !== 1
                      ? "s"
                      : ""}{" "}
                    to earn{" "}
                    <span className="font-semibold text-blue-600">
                      {milestoneData.nextMilestone.bonusPoints} bonus points
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {milestoneData.currentVisits}
                  </p>
                  <p className="text-xs text-gray-500">visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          How to Earn More
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Coins className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Order & Earn</p>
              <p className="text-xs text-gray-500">1 point per ₹100</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Level Up</p>
              <p className="text-xs text-gray-500">Earn up to 2x points</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Recent Activity
          </h3>
          <History className="w-4 h-4 text-gray-400" />
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">
                Start earning points with your first order!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === "EARN" || tx.type === "BONUS"
                          ? "bg-green-100"
                          : tx.type === "REDEEM"
                          ? "bg-blue-100"
                          : "bg-red-100"
                      }`}
                    >
                      {tx.type === "EARN" && (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      )}
                      {tx.type === "BONUS" && (
                        <Gift className="w-5 h-5 text-green-600" />
                      )}
                      {tx.type === "REDEEM" && (
                        <Star className="w-5 h-5 text-blue-600" />
                      )}
                      {tx.type === "EXPIRE" && (
                        <Clock className="w-5 h-5 text-red-600" />
                      )}
                      {tx.type === "ADJUST" && (
                        <Coins className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {tx.orderNumber && ` · Order #${tx.orderNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.points > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </p>
                      <p className="text-xs text-gray-400">
                        Bal: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tier Benefits */}
      <div className="px-4 mt-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Your {tier} Benefits
        </h3>
        <Card className={`${tierConfig.bgLight} ${tierConfig.borderColor} border`}>
          <CardContent className="p-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Star className={`w-4 h-4 ${tierConfig.textColor}`} />
                <span>
                  {tier === "BRONZE" && "1x points on all orders"}
                  {tier === "SILVER" && "1.25x points on all orders"}
                  {tier === "GOLD" && "1.5x points on all orders"}
                  {tier === "PLATINUM" && "2x points on all orders"}
                </span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Cake className={`w-4 h-4 ${tierConfig.textColor}`} />
                <span>Birthday bonus points</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Trophy className={`w-4 h-4 ${tierConfig.textColor}`} />
                <span>Visit milestone rewards</span>
              </li>
              {(tier === "GOLD" || tier === "PLATINUM") && (
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Sparkles className={`w-4 h-4 ${tierConfig.textColor}`} />
                  <span>Priority service</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

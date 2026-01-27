"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface TableStatusChangerProps {
  tableId: string;
  currentStatus: string;
  compact?: boolean;
}

const statusOptions = [
  { value: "AVAILABLE", label: "Available", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { value: "OCCUPIED", label: "Occupied", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { value: "RESERVED", label: "Reserved", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { value: "CLEANING", label: "Cleaning", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  { value: "BLOCKED", label: "Blocked", color: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
];

export function TableStatusChanger({
  tableId,
  currentStatus,
}: TableStatusChangerProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentOption = statusOptions.find((s) => s.value === currentStatus) || statusOptions[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(false);
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${currentOption?.color} border-0`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {currentOption?.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border rounded-md shadow-lg min-w-[120px]">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                option.value === currentStatus ? "font-bold bg-gray-50" : ""
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${option.color.split(" ")[0]}`} />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { PaperPortfolio } from "@/lib/alert-types";
import { formatCurrency } from "@/lib/utils";

interface TransactionHistoryProps {
  portfolio: PaperPortfolio;
  onRemoveTransaction: (
    positionSymbol: string,
    transactionId: string
  ) => void;
}

export function TransactionHistory({
  portfolio,
  onRemoveTransaction,
}: TransactionHistoryProps) {
  const [filterSymbol, setFilterSymbol] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const allTransactions = useMemo(() => {
    const txs = portfolio.positions.flatMap((p) =>
      p.transactions.map((t) => ({ ...t, positionSymbol: p.symbol }))
    );
    return txs.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [portfolio.positions]);

  const symbols = useMemo(() => {
    return Array.from(
      new Set(allTransactions.map((t) => t.symbol))
    ).sort();
  }, [allTransactions]);

  const filtered = filterSymbol
    ? allTransactions.filter((t) => t.symbol === filterSymbol)
    : allTransactions;

  const handleDelete = (positionSymbol: string, transactionId: string) => {
    if (confirmDelete === transactionId) {
      onRemoveTransaction(positionSymbol, transactionId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(transactionId);
    }
  };

  if (allTransactions.length === 0) {
    return (
      <div className="bg-surface-1 border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">
            Transaction History
          </h3>
        </div>
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">
          No transactions recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">
          Transaction History
        </h3>
        {symbols.length > 1 && (
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent transition-colors"
            aria-label="Filter by symbol"
          >
            <option value="">All symbols</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 font-medium text-text-muted text-left">
                Date
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-left">
                Type
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-left">
                Symbol
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">
                Shares
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">
                Price
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">
                Total
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-left">
                Note
              </th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">
                {/* Actions */}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors"
              >
                <td className="px-3 py-2.5 text-text-secondary">
                  {new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      tx.type === "BUY"
                        ? "bg-gain-bg text-gain"
                        : "bg-loss-bg text-loss"
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium text-text-primary">
                  {tx.symbol}
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary">
                  {tx.shares.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary">
                  {formatCurrency(tx.price)}
                </td>
                <td className="px-3 py-2.5 text-right text-text-primary font-medium">
                  {formatCurrency(tx.shares * tx.price)}
                </td>
                <td className="px-3 py-2.5 text-text-muted max-w-[120px] truncate">
                  {tx.note || "-"}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() =>
                      handleDelete(tx.positionSymbol, tx.id)
                    }
                    className={`text-[10px] font-medium transition-colors px-1.5 py-0.5 rounded ${
                      confirmDelete === tx.id
                        ? "bg-loss-bg text-loss"
                        : "text-text-muted hover:text-loss"
                    }`}
                    aria-label={
                      confirmDelete === tx.id
                        ? "Confirm delete"
                        : "Delete transaction"
                    }
                  >
                    {confirmDelete === tx.id ? "Confirm?" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

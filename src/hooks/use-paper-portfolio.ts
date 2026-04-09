"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  PaperPortfolio,
  PaperPosition,
  PaperTransaction,
} from "@/lib/alert-types";

const STORAGE_KEY = "market-dashboard-portfolios-v1";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadPortfolios(): PaperPortfolio[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return [];
}

function savePortfolios(portfolios: PaperPortfolio[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
  } catch {
    // ignore quota errors
  }
}

function recalcAvgCostBasis(transactions: PaperTransaction[]): number {
  let totalShares = 0;
  let totalCost = 0;

  for (const tx of transactions) {
    if (tx.type === "BUY") {
      totalCost += tx.shares * tx.price;
      totalShares += tx.shares;
    } else {
      // SELL: reduce shares but keep avg cost basis the same
      totalShares -= tx.shares;
      if (totalShares > 0) {
        totalCost = (totalCost / (totalShares + tx.shares)) * totalShares;
      } else {
        totalCost = 0;
      }
    }
  }

  return totalShares > 0 ? totalCost / totalShares : 0;
}

function computePositionShares(transactions: PaperTransaction[]): number {
  return transactions.reduce(
    (acc, tx) => acc + (tx.type === "BUY" ? tx.shares : -tx.shares),
    0
  );
}

export function usePaperPortfolio() {
  const [portfolios, setPortfolios] = useState<PaperPortfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(
    null
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadPortfolios();
    setPortfolios(loaded);
    if (loaded.length > 0) {
      setActivePortfolioId(loaded[0].id);
    }
    setLoaded(true);
  }, []);

  const activePortfolio =
    portfolios.find((p) => p.id === activePortfolioId) ?? null;

  const createPortfolio = useCallback(
    (name: string, benchmark: string) => {
      const portfolio: PaperPortfolio = {
        id: generateId(),
        name,
        createdAt: new Date().toISOString(),
        benchmark,
        positions: [],
      };
      setPortfolios((prev) => {
        const next = [...prev, portfolio];
        savePortfolios(next);
        return next;
      });
      setActivePortfolioId(portfolio.id);
      return portfolio;
    },
    []
  );

  const deletePortfolio = useCallback(
    (portfolioId: string) => {
      setPortfolios((prev) => {
        const next = prev.filter((p) => p.id !== portfolioId);
        savePortfolios(next);
        return next;
      });
      setActivePortfolioId((prev) => {
        if (prev === portfolioId) {
          const remaining = portfolios.filter((p) => p.id !== portfolioId);
          return remaining.length > 0 ? remaining[0].id : null;
        }
        return prev;
      });
    },
    [portfolios]
  );

  const setActivePortfolio = useCallback((portfolioId: string) => {
    setActivePortfolioId(portfolioId);
  }, []);

  const addTransaction = useCallback(
    (
      portfolioId: string,
      transaction: Omit<PaperTransaction, "id">
    ): { success: boolean; error?: string } => {
      let result = { success: true, error: undefined as string | undefined };

      setPortfolios((prev) => {
        const portfolioIndex = prev.findIndex((p) => p.id === portfolioId);
        if (portfolioIndex === -1) {
          result = { success: false, error: "Portfolio not found" };
          return prev;
        }

        const portfolio = prev[portfolioIndex];
        const existingPosition = portfolio.positions.find(
          (p) => p.symbol === transaction.symbol
        );

        // Validate sell
        if (transaction.type === "SELL") {
          const currentShares = existingPosition
            ? computePositionShares(existingPosition.transactions)
            : 0;
          if (transaction.shares > currentShares) {
            result = {
              success: false,
              error: `Cannot sell ${transaction.shares} shares. Only ${currentShares} held.`,
            };
            return prev;
          }
        }

        const newTx: PaperTransaction = {
          ...transaction,
          id: generateId(),
        };

        const next = [...prev];
        const updatedPortfolio = { ...portfolio };

        if (existingPosition) {
          const updatedTransactions = [
            ...existingPosition.transactions,
            newTx,
          ];
          const newShares = computePositionShares(updatedTransactions);

          if (newShares <= 0) {
            // Position fully closed - remove it
            updatedPortfolio.positions = portfolio.positions.filter(
              (p) => p.symbol !== transaction.symbol
            );
          } else {
            updatedPortfolio.positions = portfolio.positions.map((p) =>
              p.symbol === transaction.symbol
                ? {
                    ...p,
                    shares: newShares,
                    avgCostBasis: recalcAvgCostBasis(updatedTransactions),
                    transactions: updatedTransactions,
                  }
                : p
            );
          }
        } else {
          if (transaction.type === "SELL") {
            result = {
              success: false,
              error: "Cannot sell a position you do not hold.",
            };
            return prev;
          }

          const newPosition: PaperPosition = {
            id: generateId(),
            symbol: transaction.symbol,
            shares: transaction.shares,
            avgCostBasis: transaction.price,
            transactions: [newTx],
          };
          updatedPortfolio.positions = [
            ...portfolio.positions,
            newPosition,
          ];
        }

        next[portfolioIndex] = updatedPortfolio;
        savePortfolios(next);
        return next;
      });

      return result;
    },
    []
  );

  const removeTransaction = useCallback(
    (portfolioId: string, positionSymbol: string, transactionId: string) => {
      setPortfolios((prev) => {
        const portfolioIndex = prev.findIndex((p) => p.id === portfolioId);
        if (portfolioIndex === -1) return prev;

        const portfolio = prev[portfolioIndex];
        const next = [...prev];

        const updatedPortfolio = { ...portfolio };
        const position = portfolio.positions.find(
          (p) => p.symbol === positionSymbol
        );

        if (!position) return prev;

        const updatedTransactions = position.transactions.filter(
          (t) => t.id !== transactionId
        );

        if (updatedTransactions.length === 0) {
          updatedPortfolio.positions = portfolio.positions.filter(
            (p) => p.symbol !== positionSymbol
          );
        } else {
          const newShares = computePositionShares(updatedTransactions);
          updatedPortfolio.positions = portfolio.positions.map((p) =>
            p.symbol === positionSymbol
              ? {
                  ...p,
                  shares: newShares,
                  avgCostBasis: recalcAvgCostBasis(updatedTransactions),
                  transactions: updatedTransactions,
                }
              : p
          );
        }

        next[portfolioIndex] = updatedPortfolio;
        savePortfolios(next);
        return next;
      });
    },
    []
  );

  return {
    portfolios,
    activePortfolio,
    createPortfolio,
    deletePortfolio,
    setActivePortfolio,
    addTransaction,
    removeTransaction,
    loaded,
  };
}

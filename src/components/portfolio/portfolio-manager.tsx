"use client";

import { useState } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { usePaperPortfolio } from "@/hooks/use-paper-portfolio";
import { usePortfolioPerformance } from "@/hooks/use-portfolio-performance";
import { usePortfolioHistory } from "@/hooks/use-portfolio-history";
import { PortfolioSummary } from "./portfolio-summary";
import { PortfolioChart } from "./portfolio-chart";
import { PositionsTable } from "./positions-table";
import { TransactionHistory } from "./transaction-history";
import { TransactionModal } from "./transaction-modal";
import { CreatePortfolioModal } from "./create-portfolio-modal";

const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "Nasdaq",
  "^AXJO": "ASX 200",
  "^DJI": "Dow Jones",
};

interface PortfolioManagerProps {
  onSelectInstrument: (instrument: Instrument) => void;
}

export function PortfolioManager({
  onSelectInstrument,
}: PortfolioManagerProps) {
  const {
    portfolios,
    activePortfolio,
    createPortfolio,
    deletePortfolio,
    setActivePortfolio,
    addTransaction,
    removeTransaction,
    loaded,
  } = usePaperPortfolio();

  const { performance, isLoading: perfLoading } =
    usePortfolioPerformance(activePortfolio);
  const { timeSeries, isLoading: historyLoading } =
    usePortfolioHistory(activePortfolio);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const benchmarkLabel = activePortfolio
    ? BENCHMARK_LABELS[activePortfolio.benchmark] ??
      activePortfolio.benchmark
    : "";

  if (!loaded) {
    return (
      <section className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-surface-3 rounded mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-surface-1 border border-border rounded-lg p-4"
              >
                <div className="h-3 w-20 bg-surface-3 rounded mb-2" />
                <div className="h-6 w-28 bg-surface-3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (portfolios.length === 0) {
    return (
      <section className="p-4">
        <div className="bg-surface-1 border border-border rounded-lg flex flex-col items-center justify-center py-16 px-4">
          <div className="text-text-muted text-sm mb-1">
            No portfolios yet
          </div>
          <div className="text-text-muted text-xs mb-4">
            Create a paper portfolio to track simulated investments and
            compare against a benchmark.
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs text-surface-0 bg-accent hover:bg-accent-hover font-medium transition-colors px-4 py-2 rounded"
          >
            Create Portfolio
          </button>
        </div>

        {showCreateModal && (
          <CreatePortfolioModal
            onClose={() => setShowCreateModal(false)}
            onCreate={createPortfolio}
          />
        )}
      </section>
    );
  }

  return (
    <section className="p-4">
      {/* Header with portfolio selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {portfolios.length > 1 ? (
            <select
              value={activePortfolio?.id ?? ""}
              onChange={(e) => setActivePortfolio(e.target.value)}
              className="bg-surface-2 border border-border rounded px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-accent transition-colors"
              aria-label="Select portfolio"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="text-sm font-medium text-text-primary">
              {activePortfolio?.name}
            </h2>
          )}
          {activePortfolio && (
            <span className="text-[10px] text-text-muted bg-surface-2 px-2 py-0.5 rounded">
              Benchmark: {benchmarkLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs text-accent hover:text-accent-hover font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3"
          >
            + New Portfolio
          </button>
          {activePortfolio && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted">Delete?</span>
                  <button
                    onClick={() => {
                      deletePortfolio(activePortfolio.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="text-xs text-loss hover:text-loss font-medium transition-colors px-2 py-1 rounded hover:bg-loss-bg"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs text-text-secondary hover:text-text-primary font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-text-muted hover:text-loss font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {activePortfolio && (
        <>
          <PortfolioSummary
            performance={performance}
            historyData={timeSeries}
            benchmarkLabel={benchmarkLabel}
            isLoading={perfLoading && activePortfolio.positions.length > 0}
          />

          <PortfolioChart
            data={timeSeries}
            benchmarkLabel={benchmarkLabel}
            isLoading={historyLoading && activePortfolio.positions.length > 0}
          />

          <PositionsTable
            positions={performance?.positions ?? []}
            isLoading={perfLoading && activePortfolio.positions.length > 0}
            onSelectInstrument={onSelectInstrument}
            onAddTransaction={() => setShowTransactionModal(true)}
          />

          <TransactionHistory
            portfolio={activePortfolio}
            onRemoveTransaction={(positionSymbol, transactionId) =>
              removeTransaction(
                activePortfolio.id,
                positionSymbol,
                transactionId
              )
            }
          />
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createPortfolio}
        />
      )}

      {showTransactionModal && activePortfolio && (
        <TransactionModal
          portfolio={activePortfolio}
          onClose={() => setShowTransactionModal(false)}
          onSubmit={(tx) => addTransaction(activePortfolio.id, tx)}
        />
      )}
    </section>
  );
}

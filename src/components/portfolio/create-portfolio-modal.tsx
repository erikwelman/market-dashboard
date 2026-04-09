"use client";

import { useState } from "react";

const BENCHMARK_OPTIONS = [
  { label: "S&P 500", value: "^GSPC" },
  { label: "Nasdaq Composite", value: "^IXIC" },
  { label: "ASX 200", value: "^AXJO" },
  { label: "Dow Jones", value: "^DJI" },
];

interface CreatePortfolioModalProps {
  onClose: () => void;
  onCreate: (name: string, benchmark: string) => void;
}

export function CreatePortfolioModal({
  onClose,
  onCreate,
}: CreatePortfolioModalProps) {
  const [name, setName] = useState("");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [customBenchmark, setCustomBenchmark] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const selectedBenchmark = useCustom
      ? customBenchmark.trim().toUpperCase()
      : benchmark;
    if (!selectedBenchmark) return;
    onCreate(trimmedName, selectedBenchmark);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        <div className="bg-surface-1 border border-border rounded-lg w-full max-w-md shadow-2xl">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-medium text-text-primary">
              Create New Portfolio
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label
                htmlFor="portfolio-name"
                className="block text-xs text-text-secondary mb-1"
              >
                Portfolio Name
              </label>
              <input
                id="portfolio-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Portfolio"
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Benchmark
              </label>
              {!useCustom ? (
                <select
                  value={benchmark}
                  onChange={(e) => setBenchmark(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                  aria-label="Select benchmark"
                >
                  {BENCHMARK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customBenchmark}
                  onChange={(e) => setCustomBenchmark(e.target.value)}
                  placeholder="e.g. ^FTSE"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
              )}
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-xs text-accent hover:text-accent-hover mt-1 transition-colors"
              >
                {useCustom
                  ? "Use preset benchmark"
                  : "Use custom symbol"}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-text-secondary hover:text-text-primary font-medium transition-colors px-3 py-2 rounded hover:bg-surface-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="text-xs text-surface-0 bg-accent hover:bg-accent-hover font-medium transition-colors px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Portfolio
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

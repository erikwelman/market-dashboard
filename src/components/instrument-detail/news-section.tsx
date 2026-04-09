"use client";

import type { NewsArticle } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";

interface NewsSectionProps {
  articles: NewsArticle[];
  loading: boolean;
  companyName: string;
}

export function NewsSection({ articles, loading, companyName }: NewsSectionProps) {
  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Market-Moving News
        </h3>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-2 rounded p-3 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Market-Moving News
      </h3>
      <div className="space-y-3">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} companyName={companyName} />
        ))}
      </div>
    </div>
  );
}

function NewsCard({ article, companyName }: { article: NewsArticle; companyName: string }) {
  const impact = analyseImpact(article.title, companyName);
  const timeAgo = formatTimeAgo(article.publishedAt);

  return (
    <div className="bg-surface-2 rounded p-3">
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-text-primary hover:text-accent transition-colors leading-snug block mb-1.5"
      >
        {article.title}
      </a>
      <div className="flex items-center gap-2 text-[10px] text-text-muted mb-2">
        <span>{article.publisher}</span>
        <span>·</span>
        <span>{timeAgo}</span>
      </div>
      <ImpactSummary impact={impact} />
    </div>
  );
}

interface Impact {
  shortTerm: "bullish" | "bearish" | "neutral";
  longTerm: "bullish" | "bearish" | "neutral";
  shortTermReason: string;
  longTermReason: string;
}

function ImpactSummary({ impact }: { impact: Impact }) {
  return (
    <div className="border-t border-border pt-2 mt-2 space-y-1.5">
      <ImpactRow label="Short term" direction={impact.shortTerm} reason={impact.shortTermReason} />
      <ImpactRow label="Long term" direction={impact.longTerm} reason={impact.longTermReason} />
    </div>
  );
}

function ImpactRow({
  label,
  direction,
  reason,
}: {
  label: string;
  direction: "bullish" | "bearish" | "neutral";
  reason: string;
}) {
  const arrow =
    direction === "bullish" ? "↑" : direction === "bearish" ? "↓" : "→";
  const colorClass =
    direction === "bullish"
      ? "text-gain"
      : direction === "bearish"
        ? "text-loss"
        : "text-text-muted";

  return (
    <div className="flex items-start gap-2 text-[11px] leading-tight">
      <span className="text-text-muted shrink-0 w-[60px]">{label}</span>
      <span className={cn("shrink-0 font-semibold", colorClass)}>{arrow}</span>
      <span className="text-text-secondary">{reason}</span>
    </div>
  );
}

/**
 * Keyword-based impact analysis derived from the headline.
 * This is a heuristic — it reads the title for signals of earnings,
 * regulatory actions, analyst moves, M&A, leadership changes, etc.
 * and infers directional short/long-term effect.
 */
function analyseImpact(title: string, companyName: string): Impact {
  const t = title.toLowerCase();

  // Earnings & guidance
  if (/beat(s|ing)?|surpass|top(s|ped)?.*estimate|strong (earnings|results|quarter)|profit (rise|jump|surge|soar)/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "bullish",
      shortTermReason: "Earnings beat raises near-term sentiment and price targets.",
      longTermReason: "Sustained earnings strength signals durable competitive advantage.",
    };
  }
  if (/miss(es|ed)?.*estimate|disappoint|weak (earnings|results|quarter)|profit (fall|drop|decline|slump)|loss wider/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "bearish",
      shortTermReason: "Earnings miss triggers immediate selling pressure.",
      longTermReason: "Weakening fundamentals may compress valuation multiples.",
    };
  }
  if (/raises? (guidance|outlook|forecast)|upward revision|lifts? forecast/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "bullish",
      shortTermReason: "Raised guidance lifts forward estimates and investor confidence.",
      longTermReason: "Improving trajectory signals management conviction in growth.",
    };
  }
  if (/cut(s|ting)? (guidance|outlook|forecast)|lower(s|ed)? (guidance|outlook)|warn(s|ing)?/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "bearish",
      shortTermReason: "Lowered guidance forces analysts to revise estimates down.",
      longTermReason: "Deteriorating outlook raises questions about business trajectory.",
    };
  }

  // Analyst upgrades/downgrades
  if (/upgrade(s|d)?|raises? (price )?target|buy rating|outperform/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "neutral",
      shortTermReason: "Analyst upgrade drives institutional buying interest.",
      longTermReason: "Analyst sentiment is cyclical and may not reflect long-term value.",
    };
  }
  if (/downgrade(s|d)?|cut(s)? (price )?target|sell rating|underperform/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "neutral",
      shortTermReason: "Downgrade triggers selling pressure and sentiment shift.",
      longTermReason: "Analyst ratings change frequently; business fundamentals matter more.",
    };
  }

  // M&A / deals
  if (/acqui(re|sition)|merge(r|s)|buyout|takeover|deal to buy/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "neutral",
      shortTermReason: "M&A activity typically drives share price toward deal valuation.",
      longTermReason: "Integration risk and deal terms determine long-term value creation.",
    };
  }

  // Regulatory / legal
  if (/regulat(or|ory)|fine(d|s)?|lawsuit|antitrust|investigation|sued|penalty|sanction/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "bearish",
      shortTermReason: "Regulatory risk creates uncertainty and potential financial liability.",
      longTermReason: "Ongoing regulatory pressure can constrain growth and margins.",
    };
  }
  if (/approv(al|ed)|clearance|green light|authoriz/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "bullish",
      shortTermReason: "Regulatory approval removes overhang and unlocks revenue potential.",
      longTermReason: "New approvals expand addressable market and growth runway.",
    };
  }

  // Layoffs / restructuring
  if (/layoff|job cut|restructur|downsiz|workforce reduction/.test(t)) {
    return {
      shortTerm: "neutral",
      longTerm: "bullish",
      shortTermReason: "Layoffs signal near-term cost pressure but may improve margins.",
      longTermReason: "Restructuring often leads to improved efficiency and profitability.",
    };
  }

  // Leadership
  if (/ceo (resign|step|depart|leave|replace|fired|ousted)|new ceo|leadership change/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "neutral",
      shortTermReason: "Leadership transitions create strategic uncertainty near-term.",
      longTermReason: "Impact depends on the successor's vision and execution ability.",
    };
  }

  // Dividends / buybacks
  if (/dividend (hike|increase|raise|boost)|special dividend|buyback|share repurchase/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "bullish",
      shortTermReason: "Capital returns signal management confidence and reward shareholders.",
      longTermReason: "Sustained buybacks and dividends reflect strong free cash flow.",
    };
  }
  if (/dividend (cut|slash|suspend|eliminat)/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "bearish",
      shortTermReason: "Dividend cut signals cash flow pressure and shakes income investors.",
      longTermReason: "May indicate deeper financial distress or strategic pivot.",
    };
  }

  // Product / innovation
  if (/launch(es|ed)?|unveil|new product|breakthrough|innovation|patent/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "bullish",
      shortTermReason: "New product launches generate revenue expectations and market buzz.",
      longTermReason: "Innovation pipeline supports long-term competitive positioning.",
    };
  }

  // Macro / sector
  if (/tariff|trade war|recession|inflation|rate hike|interest rate/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "neutral",
      shortTermReason: "Macro headwinds create broad selling pressure and risk-off sentiment.",
      longTermReason: "Macro cycles are temporary; company fundamentals drive long-term value.",
    };
  }

  // Revenue / growth
  if (/revenue (surge|jump|soar|growth|record)|record (revenue|sales)/.test(t)) {
    return {
      shortTerm: "bullish",
      longTerm: "bullish",
      shortTermReason: "Strong revenue growth validates demand and lifts sentiment.",
      longTermReason: "Revenue momentum suggests expanding market share or pricing power.",
    };
  }
  if (/revenue (decline|drop|fall|miss)|sales (slump|decline)/.test(t)) {
    return {
      shortTerm: "bearish",
      longTerm: "bearish",
      shortTermReason: "Revenue decline signals weakening demand or competitive pressure.",
      longTermReason: "Shrinking top line raises concerns about long-term viability.",
    };
  }

  // Default: neutral
  return {
    shortTerm: "neutral",
    longTerm: "neutral",
    shortTermReason: "No clear directional signal from this headline alone.",
    longTermReason: "Monitor for follow-up developments that may clarify impact.",
  };
}

function formatTimeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Convert a report date like "2025-12-31" to "Q4 2025" */
export function reportDateToQuarter(reportDate: string): string {
  const [year, month] = reportDate.split("-").map(Number);
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/** Format filing date for display: "2025-02-14" → "Feb 14, 2025" */
export function formatFilingDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

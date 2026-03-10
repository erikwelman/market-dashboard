import { RefreshStatus } from "@/components/ui/refresh-status";

export function Header() {
  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Market Dashboard
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Real-time market overview
        </p>
      </div>
      <RefreshStatus />
    </header>
  );
}

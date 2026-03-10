import type { MarketDataProvider } from "./provider";
import { YahooFinanceProvider } from "./yahoo-finance.provider";

let provider: MarketDataProvider | null = null;

export function getProvider(): MarketDataProvider {
  if (!provider) {
    provider = new YahooFinanceProvider();
  }
  return provider;
}

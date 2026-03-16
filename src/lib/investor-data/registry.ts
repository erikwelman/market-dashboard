import type { InvestorDataProvider } from "./provider";
import { SecEdgarProvider } from "./sec-edgar.provider";

let provider: InvestorDataProvider | null = null;

export function getInvestorProvider(): InvestorDataProvider {
  if (!provider) {
    provider = new SecEdgarProvider();
  }
  return provider;
}

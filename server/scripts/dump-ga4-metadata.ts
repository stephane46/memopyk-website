import { BetaAnalyticsDataClient } from "@google-analytics/data";

async function main() {
  const PROPERTY = "properties/501023254";
  const client = new BetaAnalyticsDataClient({
    credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY!)
  });

  const [resp] = await client.getMetadata({ name: `${PROPERTY}/metadata` });

  console.log("=== CUSTOM DIMENSIONS ===");
  for (const d of resp.dimensions ?? []) {
    if (d.apiName?.startsWith("customEvent:")) {
      console.log(d.apiName, "-", d.uiName);
    }
  }

  console.log("\n=== CUSTOM METRICS ===");
  for (const m of resp.metrics ?? []) {
    if (m.apiName?.startsWith("customEvent:")) {
      console.log(m.apiName, "-", m.uiName);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
// scripts/export-country-names-fr.js
import fs from "fs";
import countries from "i18n-iso-countries";
import fr from "i18n-iso-countries/langs/fr.json" assert { type: "json" };
import en from "i18n-iso-countries/langs/en.json" assert { type: "json" };

// Register locales
countries.registerLocale(fr);
countries.registerLocale(en);

// Build ISO3 -> French name mapping (fallback to English if missing)
const frMap = countries.getNames("fr");
const enMap = countries.getNames("en");

const rows = [];
for (const [iso2, frName] of Object.entries(frMap)) {
  const iso3 = countries.alpha2ToAlpha3(iso2);
  if (!iso3) continue;
  const nameFr = (frName || enMap[iso2] || "").replace(/,/g, " ");
  rows.push({ iso3, display: nameFr });
}

// Some countries may exist in EN but not FR; add missing ones
for (const [iso2, enName] of Object.entries(enMap)) {
  const iso3 = countries.alpha2ToAlpha3(iso2);
  if (!iso3) continue;
  if (!rows.find(r => r.iso3 === iso3)) {
    rows.push({ iso3, display: enName.replace(/,/g, " ") });
  }
}

rows.sort((a, b) => a.iso3.localeCompare(b.iso3));

fs.writeFileSync(
  "country_names_fr.csv",
  "iso3,display_name_fr\n" +
  rows.map(r => `${r.iso3},${r.display}`).join("\n")
);

console.log(`Wrote country_names_fr.csv with ${rows.length} rows`);
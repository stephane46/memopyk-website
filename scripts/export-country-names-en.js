// scripts/export-country-names-en.js
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" assert { type: "json" };
import fs from "fs";

// Register English locale
countries.registerLocale(enLocale);

// Get all country codes and their English names
const allCountries = countries.getNames("en", { select: "official" });

// Create CSV content with ISO-3 codes and English display names
const csvLines = ["iso3,display_name_en"];

for (const [code2, nameEn] of Object.entries(allCountries)) {
  try {
    // Convert ISO-2 to ISO-3
    const code3 = countries.alpha2ToAlpha3(code2);
    if (code3) {
      csvLines.push(`${code3},"${nameEn}"`);
    }
  } catch (error) {
    console.warn(`Could not convert ${code2} to ISO-3: ${error.message}`);
  }
}

// Write to CSV file
const csvContent = csvLines.join("\n");
fs.writeFileSync("country_names_en.csv", csvContent);

console.log(`✅ Generated country_names_en.csv with ${csvLines.length - 1} countries`);
console.log("First few entries:");
csvLines.slice(1, 6).forEach(line => console.log(line));
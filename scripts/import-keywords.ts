/**
 * Import French Keywords to Supabase
 *
 * Reads docs/data/Keyword_Stats_merged.csv (ISO-8859-1)
 * Applies tier classification and intent classification
 * Imports Tier 1-3 keywords to content_keywords table
 *
 * Run with: npx tsx scripts/import-keywords.ts
 */

import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ==============================================
// INTENT CLASSIFICATION (from INTENT_CLASSIFICATION_RULESET.md)
// ==============================================

function classifyIntent(keyword: string): { intent: string; rule: string } {
  const k = keyword.toLowerCase().trim();

  // === LAYER 1: LOW ===
  const lowWords = ['gratuit', 'gratis', 'diy', 'tutoriel', 'tuto ',
    'astuce', "c'est quoi", 'définition', 'definition',
    'télécharger', 'telecharger', 'logiciel', 'application pour'];
  for (const w of lowWords) {
    if (k.includes(w)) return { intent: 'low', rule: 'L1' };
  }
  if (/soi[- ]m[eê]me/.test(k)) return { intent: 'low', rule: 'L2' };
  if (/fait[e]?\s*maison|[àa] la maison/.test(k) && !k.includes('maison de retraite')) {
    return { intent: 'low', rule: 'L3' };
  }
  if (/^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)/.test(k)) {
    return { intent: 'low', rule: 'L4' };
  }
  if (k.includes('youtube') && !['prix', 'tarif', 'coût', 'cout'].some(w => k.includes(w))) {
    return { intent: 'low', rule: 'L5' };
  }

  // === LAYER 2: HIGH ===
  const highWords = ['prix', 'tarif', 'coût', 'cout', 'devis', 'acheter', 'achat',
    'commander', 'commande', 'pas cher', 'moins cher', 'bon marché',
    'livraison', 'expédition', 'professionnel', 'prestataire',
    'sur mesure', 'promo ', 'promotion', 'réduction', 'solde'];
  for (const w of highWords) {
    if (k.includes(w)) return { intent: 'high', rule: 'H1' };
  }
  if (/faire (faire|numériser|numeriser|réaliser|realiser|transférer|transferer)/.test(k)) {
    return { intent: 'high', rule: 'H2' };
  }
  if (/site.*(personnalis|cadeau|cadre|diaporama|montage|photo)/.test(k) ||
      /(personnalis|cadeau|cadre|diaporama|montage).*site/.test(k)) {
    return { intent: 'high', rule: 'H3' };
  }
  if (k.includes('en ligne') && !k.includes('gratuit')) {
    return { intent: 'high', rule: 'H4' };
  }
  const cities = '(paris|lyon|marseille|toulouse|bordeaux|nantes|lille|strasbourg|nice|rennes|montpellier|grenoble|rouen|toulon|dijon|angers|reims|brest|clermont|montréal|québec|ottawa)';
  const services = '(numérisation|numerisation|transfert|montage|diaporama|numériser|numeriser)';
  if (new RegExp(services + '.*' + cities).test(k) || new RegExp(cities + '.*' + services).test(k)) {
    return { intent: 'high', rule: 'H5' };
  }

  // === LAYER 3: MEDIUM explicit ===
  const mediumWords = ['meilleur', 'mieux', 'comparatif', 'comparaison', 'comparer',
    ' vs ', ' versus ', 'avis ', 'différence', 'difference',
    'lequel', 'laquelle', 'top ', 'classement', 'recommand'];
  for (const w of mediumWords) {
    if (k.includes(w)) return { intent: 'medium', rule: 'M1' };
  }
  if (/(quel|quelle).*(choisir|prendre|offrir|donner)/.test(k)) {
    return { intent: 'medium', rule: 'M2' };
  }

  // === LAYER 4: MEDIUM implicit ===
  if (/id[ée]e/.test(k)) return { intent: 'medium', rule: 'M3' };
  if (k.includes('cadeau')) return { intent: 'medium', rule: 'M4' };
  if (k.includes('original')) return { intent: 'medium', rule: 'M5' };
  if (k.includes('surprise')) return { intent: 'medium', rule: 'M6' };
  if (/pour (homme|femme|maman|papa|couple|ami|amie|parent|grand|retraité|retraitee|collègue|collegue|famille|bébé|bebe|enfant)/.test(k)) {
    return { intent: 'medium', rule: 'M7' };
  }
  if (/(numériser|numeriser|numérisation|numerisation|transférer|transferer|transfert|convertir|transformer)/.test(k)) {
    return { intent: 'medium', rule: 'M8' };
  }
  if (/(montage|diaporama)/.test(k)) return { intent: 'medium', rule: 'M9' };
  if (/personnalis/.test(k)) return { intent: 'medium', rule: 'M10' };
  if (/faire (un |une |des |le |la )/.test(k)) return { intent: 'medium', rule: 'M11' };
  if (k.includes('coffret')) return { intent: 'medium', rule: 'M12' };

  // === LAYER 5: DEFAULT ===
  return { intent: 'medium', rule: 'M99' };
}

// ==============================================
// TIER CLASSIFICATION (from KEYWORD_RESEARCH_PROGRESS.md)
// ==============================================

function classifyTier(keyword: string): number {
  const k = keyword.toLowerCase().trim();

  // Tier 4: Low Relevance - Skip these entirely
  // Physical products not related to MEMOPYK services
  const tier4Patterns = [
    /coque/,           // phone cases
    /^cadre photo$/,   // just "photo frame" (generic)
    /^cadre (?!personnalis)/, // cadre without personnalisé (physical frames)
    /t-?shirt/,        // t-shirts
    /tee[- ]?shirt/,
    /mug/,
    /coussin/,         // cushions
    /puzzle/,
    /poster(?! .*souvenir)/, // posters (unless souvenir related)
    /toile(?! .*souvenir)/,  // canvas (unless souvenir related)
    /tableau/,         // paintings/boards
    /magnet/,
    /aimant/,          // magnets
    /calendrier(?! .*souvenir)/, // calendars
    /agenda/,
    /album photo(?! .*numéri)/, // physical photo albums
    /faire part/,      // announcements (different business)
    /carte de voeux/,  // greeting cards
    /carte postale/,
    /gobelet/,         // cups
    /bougie/,          // candles
    /bijou/,           // jewelry
    /sac/,             // bags
    /plaque spotify/,  // spotify plaques
    /qr code/,
    /sticker/,
    /autocollant/,
    /^porte[- ]?cl[eé]/,  // keychains
    /^badge/,
  ];

  for (const pattern of tier4Patterns) {
    if (pattern.test(k)) return 4;
  }

  // Tier 1: Direct Service Keywords
  // These are exact or near-exact matches for what MEMOPYK offers
  const tier1Patterns = [
    /diaporama anniversaire/,
    /montage vid[eé]o mariage/,
    /montage photo avec musique/,
    /montage photo musique/,
    /diaporama photo anniversaire/,
    /montage vid[eé]o avec photo/,
    /montage video pour mariage/,
    /montage vid[eé]o souvenir/,
    /faire un film avec ses photos/,
    /film souvenir personnalis[eé]/,
    /film souvenir/,
    /montage vid[eé]o (?:photos?|souvenirs?)/,
    /diaporama (?:mariage|retraite|anniversaire|f[eê]te)/,
    /vid[eé]o (?:souvenir|hommage|anniversaire)/,
  ];

  for (const pattern of tier1Patterns) {
    if (pattern.test(k)) return 1;
  }

  // Tier 2: High Relevance Categories

  // VHS/Legacy Media - traffic magnet
  if (/(num[eé]ris|vhs|cassette|super\s?8|8mm|betamax|hi8|minidv|transfert.*vid[eé]o)/.test(k)) {
    return 2;
  }

  // Gift - Personalized (high commercial intent)
  if (/cadeau.*(personnalis|photo|original|unique)/.test(k) ||
      /(personnalis|photo|original|unique).*cadeau/.test(k)) {
    return 2;
  }

  // Gift - Occasion (massive volume, seasonal)
  if (/cadeau.*(retraite|anniversaire|mariage|no[eë]l|f[eê]te|m[eè]re|p[eè]re|grand)/.test(k) ||
      /(retraite|anniversaire|mariage|no[eë]l|f[eê]te).*cadeau/.test(k)) {
    return 2;
  }

  // Life Events - Retirement (untapped goldmine)
  if (/retraite/.test(k) && !/(maison de retraite|residenc|ehpad)/.test(k)) {
    return 2;
  }

  // Life Events - Baby, Wedding, Family
  if (/(b[eé]b[eé]|naissance|premi[eè]re ann[eé]e|wedding|mariage.*vid[eé]o)/.test(k)) {
    return 2;
  }

  // Life Events - Tribute/Hommage
  if (/(hommage|d[eé]c[eè]s|fun[eé]railles|m[eé]moire|disparu)/.test(k)) {
    return 2;
  }

  // Tier 3: Secondary/General

  // Montage General
  if (/(montage|diaporama)/.test(k)) {
    return 3;
  }

  // Photo/Video General
  if (/(photo|vid[eé]o|image).*(organis|class|tri|rang|sauv)/.test(k) ||
      /(organis|class|tri|rang|sauv).*(photo|vid[eé]o|image)/.test(k)) {
    return 3;
  }

  // Gift Generic (too broad but still relevant)
  if (/cadeau/.test(k)) {
    return 3;
  }

  // Personalized products (general)
  if (/personnalis/.test(k)) {
    return 3;
  }

  // Default to Tier 4 (irrelevant) if no patterns matched
  return 4;
}

// ==============================================
// MAIN IMPORT FUNCTION
// ==============================================

interface CsvRow {
  keyword: string;
  monthly_searches: number;
  competition: string;
}

function parseCSV(content: string): CsvRow[] {
  const lines = content.split('\n');
  const rows: CsvRow[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV format: Keyword,Currency,Avg. monthly searches,Three month change,YoY change,Competition,...
    const parts = line.split(',');
    if (parts.length < 6) continue;

    const keyword = parts[0].trim();
    const monthlySearches = parseInt(parts[2]) || 0;
    const competition = parts[5].trim() || 'Unknown';

    if (keyword) {
      rows.push({
        keyword,
        monthly_searches: monthlySearches,
        competition
      });
    }
  }

  return rows;
}

async function importKeywords() {
  console.log('🚀 Starting keyword import...\n');

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'docs/data/Keyword_Stats_merged.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Read as binary and decode ISO-8859-1
  const buffer = fs.readFileSync(csvPath);
  const content = iconv.decode(buffer, 'ISO-8859-1');

  const rows = parseCSV(content);
  console.log(`📄 Parsed ${rows.length} keywords from CSV\n`);

  // Classify and filter
  const keywordsToImport: Array<{
    keyword: string;
    monthly_searches: number;
    competition: string;
    tier: number;
    intent: string;
    market: string;
  }> = [];

  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const intentCounts = { high: 0, medium: 0, low: 0 };

  for (const row of rows) {
    const tier = classifyTier(row.keyword);
    const { intent } = classifyIntent(row.keyword);

    tierCounts[tier as keyof typeof tierCounts]++;
    intentCounts[intent as keyof typeof intentCounts]++;

    // Only import Tier 1-3
    if (tier <= 3) {
      keywordsToImport.push({
        keyword: row.keyword,
        monthly_searches: row.monthly_searches,
        competition: row.competition,
        tier,
        intent,
        market: 'fr' // French keywords from GKP France
      });
    }
  }

  console.log('📊 Classification Results:');
  console.log(`   Tier 1 (Direct Service): ${tierCounts[1]}`);
  console.log(`   Tier 2 (High Relevance): ${tierCounts[2]}`);
  console.log(`   Tier 3 (Secondary):      ${tierCounts[3]}`);
  console.log(`   Tier 4 (Skipped):        ${tierCounts[4]}`);
  console.log('');
  console.log('   Intent HIGH:   ', intentCounts.high);
  console.log('   Intent MEDIUM: ', intentCounts.medium);
  console.log('   Intent LOW:    ', intentCounts.low);
  console.log('');
  console.log(`✅ Importing ${keywordsToImport.length} keywords (Tier 1-3)\n`);

  // Clear existing keywords
  console.log('🗑️  Clearing existing keywords...');
  const { error: deleteError } = await supabase
    .from('content_keywords')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Error clearing keywords:', deleteError);
    process.exit(1);
  }

  // Insert in batches
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < keywordsToImport.length; i += BATCH_SIZE) {
    const batch = keywordsToImport.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('content_keywords')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      continue;
    }

    imported += batch.length;
    process.stdout.write(`\r📥 Imported: ${imported}/${keywordsToImport.length}`);
  }

  console.log('\n');

  // Verify import
  const { count, error: countError } = await supabase
    .from('content_keywords')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error verifying count:', countError);
  } else {
    console.log(`✅ Verification: ${count} keywords in database`);
  }

  // Show sample by tier
  console.log('\n📋 Sample Keywords by Tier:');

  for (const tier of [1, 2, 3]) {
    const { data: samples } = await supabase
      .from('content_keywords')
      .select('keyword, monthly_searches, intent')
      .eq('tier', tier)
      .order('monthly_searches', { ascending: false })
      .limit(5);

    console.log(`\n   Tier ${tier}:`);
    samples?.forEach(s => {
      console.log(`   - ${s.keyword} (${s.monthly_searches}/mo, ${s.intent})`);
    });
  }

  console.log('\n🎉 Import complete!');
}

// Run
importKeywords().catch(console.error);

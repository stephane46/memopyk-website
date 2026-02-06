/**
 * Apply Cluster Refinement Rules to Keywords
 *
 * Ported from: C:\Scripts\cluster_refinement_rules.py
 *
 * Rules applied:
 * 1. "other" → reclassify into proper clusters
 * 2. gift_anniversary → split into milestone/wedding/parents/couple
 * 3. vhs_legacy → split into info vs service intent
 * 4. gift_other → reclassify into existing or new clusters
 *
 * Usage: npx tsx scripts/apply-cluster-refinement.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ============================================================
// Part 1: Reclassify "other" cluster keywords
// ============================================================
const otherReclassification: [RegExp, string][] = [
  // Memorial / Sympathy
  [/sympathy|condolence|bereavement|funeral|in memory of|memorial gift|remembrance gift|loss of|grieving|passed away|heaven|angel.*gift/i, 'gift_memorial'],

  // Pet memorial
  [/(pet|dog|cat|puppy|kitten).*memorial|(pet|dog|cat).*loss|rainbow bridge|pet.*remembrance|pet.*sympathy/i, 'gift_pet_memorial'],

  // Graduation
  [/graduation|graduate|diploma|senior year|class of|commencement|grad gift|prom/i, 'gift_graduation'],

  // Physical products (not MEMOPYK service)
  [/photo frame|picture frame|canvas print|photo mug|photo blanket|photo poster|photo calendar|photo puzzle|photo keychain|photo magnet|custom frame|engraved frame|collage frame|shadow box|photo book print|photo cushion|photo coaster|photo ornament|personalized mug|custom canvas/i, 'physical_products'],

  // Baby / Life milestones
  [/baby shower|gender reveal|newborn gift|first birthday|baby.*first year|baby.*milestone|pregnancy.*gift|new mom|new dad|new parent|baby.*announcement|christening|baptism|birth.*announcement/i, 'life_events_baby'],

  // Wedding (not anniversary)
  [/wedding gift|bride.*gift|groom.*gift|bridesmaid|groomsmen|engagement gift|bridal shower|bachelorette|bachelor party|wedding favor|rehearsal dinner|wedding.*photo/i, 'gift_wedding'],

  // Retirement
  [/retirement|retiring|retire.*gift/i, 'gift_retirement'],

  // Housewarming / Moving
  [/housewarming|new home|moving gift|new house|first home/i, 'gift_housewarming'],

  // Travel / Adventure
  [/travel.*gift|adventure.*gift|wanderlust|travel.*photo|vacation.*gift|road trip.*gift|honeymoon.*gift/i, 'gift_travel'],

  // Birthday (generic)
  [/birthday gift|birthday present|birthday.*idea|happy birthday|bday|birth day/i, 'gift_birthday'],

  // Valentine / Romantic
  [/valentine|romantic gift|love gift|couple.*gift|boyfriend.*gift|girlfriend.*gift|husband.*gift|wife.*gift|him and her|his and hers/i, 'gift_romantic'],

  // Mother's/Father's Day
  [/mother'?s?\s*day|gift.*for mom|gift.*for mother|mama.*gift|mum.*gift/i, 'gift_mothers_day'],
  [/father'?s?\s*day|gift.*for dad|gift.*for father|papa.*gift|daddy.*gift/i, 'gift_fathers_day'],

  // Christmas / Holiday
  [/christmas gift|holiday gift|stocking stuffer|xmas|secret santa|white elephant/i, 'gift_christmas'],

  // Photo organization / management (informational)
  [/photo organiz|sort.*photo|declutter.*photo|manage.*photo|photo storage|backup.*photo|photo management|organize.*picture|digital.*organiz/i, 'photo_organization'],

  // Video editing / slideshow DIY
  [/slideshow maker|video editor|montage.*app|slideshow app|video collage|photo slideshow|movie maker|video montage.*software|slideshow software/i, 'diy_tools'],

  // Scrapbooking
  [/scrapbook|memory book|photo album diy|craft.*photo|journal.*photo/i, 'scrapbooking'],

  // Professional photography
  [/photographer|photography business|photo session|photoshoot|photo studio|portrait.*session/i, 'photography_professional'],
];

// ============================================================
// Part 2: Split gift_anniversary
// ============================================================
const anniversarySplits: [RegExp, string][] = [
  // Milestone anniversaries (specific year numbers)
  [/\b(1st|first|2nd|second|5th|fifth|10th|tenth|15th|20th|25th|silver|30th|40th|50th|golden|60th|diamond|ruby|pearl|paper|wood|tin|crystal)\b.*annivers/i, 'gift_anniversary_milestone'],
  [/annivers.*\b(1st|first|2nd|second|5th|fifth|10th|tenth|15th|20th|25th|silver|30th|40th|50th|golden|60th|diamond|ruby|pearl|paper|wood|tin|crystal)\b/i, 'gift_anniversary_milestone'],

  // For parents / family
  [/(parents?|parent|mom and dad|mum and dad|in-law|grandparent|mother and father).*annivers/i, 'gift_anniversary_parents'],
  [/annivers.*(parents?|parent|mom and dad|mum and dad|in-law|grandparent|for them)/i, 'gift_anniversary_parents'],

  // Wedding anniversary (generic)
  [/wedding annivers|marriage annivers|anniversaire.*mariage/i, 'gift_anniversary_wedding'],

  // Couple-focused
  [/(husband|wife|him|her|boyfriend|girlfriend|couple|partner|spouse).*annivers/i, 'gift_anniversary_couple'],
  [/annivers.*(husband|wife|him|her|boyfriend|girlfriend|couple|partner|spouse)/i, 'gift_anniversary_couple'],
];

// ============================================================
// Part 3: Split vhs_legacy
// ============================================================
const vhsSplits: [RegExp, string][] = [
  // Informational / DIY
  [/(how to|diy|can you|can i|ways to|best way to|guide|tutorial|step).*(vhs|cassette|tape|8mm|super 8|betamax|camcorder)/i, 'vhs_digitization_info'],
  [/(vhs|cassette|tape|8mm|super 8|betamax|camcorder).*(how to|diy|convert|digitize yourself|at home|with|using|software|adapter|capture card|usb)/i, 'vhs_digitization_info'],
  [/(vhs|cassette|tape).*to.*(digital|mp4|dvd|computer|usb|hard drive)/i, 'vhs_digitization_info'],
  [/(digitize|digitise|convert|transfer).*(vhs|cassette|tape|8mm|super 8)/i, 'vhs_digitization_info'],

  // Transactional / Service
  [/(service|price|cost|pricing|near me|cheap|affordable|best|company|business|shop|store|local|professional|where to|send).*(vhs|cassette|tape|8mm|super 8|betamax)/i, 'vhs_service'],
  [/(vhs|cassette|tape|8mm|super 8|betamax).*(service|price|cost|pricing|near me|cheap|affordable|company|business|shop|store|local|professional|where|send)/i, 'vhs_service'],
  [/(numérisation|numerisation|transfert|conversion).*(cassette|vhs|k7|8mm).*(prix|tarif|service|professionnel|magasin|boutique)/i, 'vhs_service'],
];

// ============================================================
// Part 4: Reclassify gift_other
// ============================================================
const giftOtherReclassification: [RegExp, string][] = [
  // Memorial
  [/sympathy|condolence|memorial|in memory|loss of|bereavement|remembrance|funeral|passed|heaven/i, 'gift_memorial'],

  // Pet
  [/(pet|dog|cat|horse|animal).*gift|(pet|dog|cat).*owner|fur baby|paw/i, 'gift_pet'],

  // Graduation
  [/graduation|graduate|grad gift|senior|class of/i, 'gift_graduation'],

  // Retirement
  [/retirement|retiring|coworker.*leaving|colleague.*leaving|farewell.*gift/i, 'gift_retirement'],

  // Birthday
  [/birthday|bday|born on|turning \d+/i, 'gift_birthday'],

  // Thank you / Appreciation
  [/thank you.*gift|appreciation|grateful|teacher.*gift|coach.*gift|mentor.*gift|hostess.*gift|host.*gift/i, 'gift_appreciation'],

  // Friendship
  [/best friend|friend.*gift|friendship|bff|girl friend.*gift.*platonic/i, 'gift_friendship'],

  // Seasonal/Holiday catch-all
  [/christmas|holiday|easter|thanksgiving|hanukkah|kwanzaa|new year/i, 'gift_seasonal'],

  // Romantic catch-all
  [/valentine|romantic|love|couple|boyfriend|girlfriend|husband|wife|fiance|fiancee|partner/i, 'gift_romantic'],

  // Mother/Father
  [/mom|mother|mum|mama|grandma|grandmother|nana/i, 'gift_mothers_day'],
  [/dad|father|papa|grandpa|grandfather|grandad/i, 'gift_fathers_day'],

  // Wedding
  [/wedding|bride|groom|bridesmaid|engagement|bridal/i, 'gift_wedding'],

  // Baby
  [/baby|newborn|new parent|new mom|new dad|expecting|pregnant|shower/i, 'life_events_baby'],

  // Anniversary (catch strays)
  [/anniversary/i, 'gift_anniversary'],

  // Physical products
  [/frame|canvas|mug|blanket|poster|print|pillow|cushion|ornament|keychain|necklace|bracelet|jewelry|jewellery/i, 'physical_products'],

  // Photo service related (potential MEMOPYK leads)
  [/photo.*gift|video.*gift|memory.*gift|personalized.*photo|custom.*photo|photo.*present/i, 'gift_photo_personalized'],
];

// ============================================================
// Rule application logic
// ============================================================
function applyRules(keyword: string, rules: [RegExp, string][]): string | null {
  for (const [pattern, newCluster] of rules) {
    if (pattern.test(keyword)) {
      return newCluster;
    }
  }
  return null;
}

const CLUSTER_RULES: Record<string, [RegExp, string][]> = {
  'other': otherReclassification,
  'gift_anniversary': anniversarySplits,
  'vhs_legacy': vhsSplits,
  'gift_other': giftOtherReclassification,
};

// ============================================================
// Main execution
// ============================================================
async function applyClusterRefinement() {
  console.log('🔄 Cluster Refinement Script');
  console.log('=============================\n');

  // Fetch all keywords that might need updating
  const clustersToProcess = Object.keys(CLUSTER_RULES);
  console.log(`📥 Fetching keywords with clusters: ${clustersToProcess.join(', ')}`);

  const { data: keywords, error } = await supabase
    .from('content_keywords')
    .select('id, keyword, cluster, market')
    .in('cluster', clustersToProcess);

  if (error) {
    console.error('Error fetching keywords:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${keywords?.length || 0} keywords to process\n`);

  // Track changes
  const changes: Record<string, Record<string, number>> = {
    'other': {},
    'gift_anniversary': {},
    'vhs_legacy': {},
    'gift_other': {},
  };
  const updates: { id: string; oldCluster: string; newCluster: string; keyword: string }[] = [];

  // Process each keyword
  for (const kw of keywords || []) {
    const rules = CLUSTER_RULES[kw.cluster];
    if (!rules) continue;

    const newCluster = applyRules(kw.keyword, rules);
    if (newCluster && newCluster !== kw.cluster) {
      updates.push({
        id: kw.id,
        oldCluster: kw.cluster,
        newCluster,
        keyword: kw.keyword,
      });

      // Track for reporting
      changes[kw.cluster][newCluster] = (changes[kw.cluster][newCluster] || 0) + 1;
    }
  }

  console.log(`🔄 Found ${updates.length} keywords to update\n`);

  // Apply updates in batches
  const BATCH_SIZE = 100;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('content_keywords')
        .update({ cluster: update.newCluster })
        .eq('id', update.id);

      if (updateError) {
        console.error(`  Error updating "${update.keyword}":`, updateError.message);
        errors++;
      } else {
        updated++;
      }
    }

    // Progress indicator
    if (updates.length > BATCH_SIZE) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
    }
  }

  // Report results
  console.log('\n=============================');
  console.log('📊 Cluster Refinement Results');
  console.log('=============================\n');

  for (const [originalCluster, destinations] of Object.entries(changes)) {
    const total = Object.values(destinations).reduce((a, b) => a + b, 0);
    if (total === 0) {
      console.log(`"${originalCluster}": No changes needed`);
      continue;
    }

    console.log(`"${originalCluster}" reclassified: ${total} keywords`);
    const sorted = Object.entries(destinations).sort((a, b) => b[1] - a[1]);
    for (const [dest, count] of sorted) {
      console.log(`  → ${dest}: ${count}`);
    }
    console.log('');
  }

  console.log('=============================');
  console.log(`Total keywords updated: ${updated}`);
  if (errors > 0) {
    console.log(`Errors: ${errors}`);
  }
  console.log('✅ Done!');
}

applyClusterRefinement().catch(console.error);

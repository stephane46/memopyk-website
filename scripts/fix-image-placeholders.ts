/**
 * Fix image placeholder format in draft blog posts.
 *
 * Standardizes all IMAGE SUGGESTION placeholders to:
 * <p style='color: #cc0000; font-weight: bold;'>📸 IMAGE SUGGESTION: [description] | [orientation] [dimensions] | [purpose]</p>
 *
 * Changes applied:
 * 1. Adds 📸 emoji before "IMAGE SUGGESTION"
 * 2. Translates orientation to English (paysage/horizontal→Landscape, portrait/vertical→Portrait, carre→Square)
 * 3. Translates purpose phrases from French to English
 * 4. Ensures single quotes in HTML style attribute
 *
 * Run: npx tsx scripts/fix-image-placeholders.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Orientation translations (case-insensitive matching)
const orientationMap: Record<string, string> = {
  'horizontal': 'Landscape',
  'paysage': 'Landscape',
  'landscape': 'Landscape',
  'portrait': 'Portrait',
  'vertical': 'Portrait',
  'carre': 'Square',
  'square': 'Square',
};

// Purpose phrase translations (French -> English)
// Keys are lowercase for case-insensitive matching
const purposeMap: Record<string, string> = {
  "illustration de l'experience emotionnelle partagee": "Illustration of shared emotional experience",
  "inspiration deco avec photos": "Home decor inspiration with photos",
  "moment de jeu et partage familial": "Family play and sharing moment",
  "illustrer les cadeaux d'experience": "Illustrate experience gifts",
  "emotion et partage familial": "Emotion and family sharing",
  "soin apporte a la presentation": "Care in gift presentation",
  "illustration du concept du film souvenir": "Illustration of souvenir film concept",
  "ambiance cocooning et confort": "Cozy and comfort atmosphere",
  "emotion de la decouverte": "Emotion of discovery",
  "illustrer l'importance des souvenirs": "Illustrate the importance of memories",
  "montrer l'aspect artisanal": "Show the artisanal aspect",
  "montrer l'emotion du moment": "Show the emotion of the moment",
  "illustrer l'impact emotionnel d'un film souvenir": "Illustrate the emotional impact of a souvenir film",
  "montrer la qualite des cadeaux tangibles": "Show the quality of tangible gifts",
  "illustrer la richesse des souvenirs accumules": "Illustrate the richness of accumulated memories",
  "illustrer l'emotion des souvenirs": "Illustrate the emotion of memories",
  "evoquer la relaxation et le bien-etre": "Evoke relaxation and well-being",
  "montrer l'impact emotionnel du cadeau": "Show the emotional impact of the gift",
  "symboliser le confort du quotidien": "Symbolize daily comfort",
  "ambiance chaleureuse de celebration": "Warm celebration atmosphere",
  "illustrer l'emotion partagee": "Illustrate shared emotion",
  "montrer le processus de selection": "Show the selection process",
  "atmosphere de celebration": "Celebration atmosphere",
  "illustrer l'experience immersive": "Illustrate the immersive experience",
  "ambiance creative et personnelle": "Creative and personal atmosphere",
  "moment de partage chaleureux": "Warm sharing moment",
  "illustration emotionnelle du partage de souvenirs": "Emotional illustration of memory sharing",
  "mise en scene nostalgique": "Nostalgic staging",
  "illustration du processus creatif": "Illustration of the creative process",
  "illustration du processus de transformation": "Illustration of the transformation process",
  "illustration du setup diy": "DIY setup illustration",
  "emotion de partage et transmission": "Sharing and passing down emotion",
  "illustrer la complexite technique": "Illustrate technical complexity",
  "montrer le resultat final paisible": "Show the peaceful final result",
  "montrer l'aspect technique professionnel": "Show the professional technical aspect",
  "illustrer le concept d'harmonie entre image et son": "Illustrate the concept of harmony between image and sound",
  "illustrer les outils disponibles": "Illustrate available tools",
  "montrer l'emotion partagee devant le resultat final": "Show shared emotion at the final result",
};

/**
 * Normalize a string for lookup: lowercase, strip accents
 */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Fix a single IMAGE SUGGESTION placeholder tag
 */
function fixPlaceholder(match: string): string {
  // Extract the inner text content
  const innerMatch = match.match(/>([^<]*)</);
  if (!innerMatch) return match;

  let inner = innerMatch[1];

  // 1. Add camera emoji if missing
  if (!inner.includes('\u{1F4F8}')) {
    inner = inner.replace('IMAGE SUGGESTION:', '\u{1F4F8} IMAGE SUGGESTION:');
  }

  // 2. Split by pipe to get segments: description | orientation dims | purpose
  const parts = inner.split('|');

  if (parts.length >= 2) {
    // Fix orientation in the second segment
    let orientPart = parts[1].trim();

    // Match orientation word at the start (case-insensitive)
    // Use (?=\s|$) instead of \b since \b doesn't work with accented chars like é
    const orientMatch = orientPart.match(/^(horizontal|paysage|landscape|portrait|vertical|carré|carre|square)(?=\s|$)/i);
    if (orientMatch) {
      const original = orientMatch[1];
      const normalizedOri = normalize(original);
      const englishOrientation = orientationMap[normalizedOri] || original;
      orientPart = englishOrientation + orientPart.substring(original.length);
    }

    parts[1] = ' ' + orientPart;
  }

  if (parts.length >= 3) {
    // Translate purpose in the third segment
    const purposeText = parts[2].trim();
    const normalizedPurpose = normalize(purposeText);

    const translation = purposeMap[normalizedPurpose];
    if (translation) {
      parts[2] = ' ' + translation;
    }
  }

  inner = parts.join('|');

  // 4. Rebuild with single quotes in style attribute
  return `<p style='color: #cc0000; font-weight: bold;'>${inner}</p>`;
}

async function main() {
  console.log('Fetching draft posts with IMAGE placeholders...\n');

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, content_html')
    .eq('status', 'draft')
    .like('content_html', '%IMAGE%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('No draft posts with IMAGE placeholders found.');
    return;
  }

  console.log(`Found ${posts.length} draft posts with IMAGE placeholders.\n`);

  let totalFixed = 0;
  const placeholderRegex = /<p[^>]*>[^<]*IMAGE SUGGESTION:[^<]*<\/p>/g;

  for (const post of posts) {
    const { id, title, content_html } = post;

    const matches = content_html.match(placeholderRegex);

    if (!matches || matches.length === 0) {
      console.log(`  [SKIP] "${title}" - no IMAGE SUGGESTION placeholders found`);
      continue;
    }

    let newContent = content_html;
    let changesInPost = 0;

    for (const match of matches) {
      const fixed = fixPlaceholder(match);
      if (fixed !== match) {
        newContent = newContent.replace(match, fixed);
        changesInPost++;
      }
    }

    if (changesInPost > 0) {
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ content_html: newContent })
        .eq('id', id);

      if (updateError) {
        console.error(`  [ERROR] "${title}": ${updateError.message}`);
      } else {
        console.log(`  [FIXED] "${title}" - ${changesInPost} placeholder(s) updated`);
        totalFixed += changesInPost;
      }
    } else {
      console.log(`  [OK] "${title}" - all ${matches.length} placeholders already correct`);
    }
  }

  console.log(`\nDone. Fixed ${totalFixed} placeholder(s) across ${posts.length} posts.`);

  // Verification pass
  console.log('\n--- VERIFICATION ---\n');

  const { data: verifyPosts, error: verifyError } = await supabase
    .from('blog_posts')
    .select('id, title, content_html')
    .eq('status', 'draft')
    .like('content_html', '%IMAGE%')
    .order('created_at', { ascending: false });

  if (verifyError) {
    console.error('Verification query error:', verifyError);
    return;
  }

  let allGood = true;
  let verifiedCount = 0;

  for (const post of verifyPosts || []) {
    const matches = post.content_html.match(placeholderRegex);
    if (!matches) continue;

    for (const p of matches) {
      verifiedCount++;
      const issues: string[] = [];

      if (!p.includes('\u{1F4F8}')) issues.push('missing camera emoji');
      // Check for French orientation words (not preceded by description text)
      const orientSection = p.split('|')[1] || '';
      if (/^\s*(paysage|horizontal|carré|carre|vertical)\b/i.test(orientSection)) {
        issues.push('orientation still in French');
      }
      if (p.includes('style="')) issues.push('double quotes in style');

      if (issues.length > 0) {
        console.log(`  [ISSUE] "${post.title}": ${issues.join(', ')}`);
        console.log(`    ${p.substring(0, 150)}...`);
        allGood = false;
      }
    }
  }

  if (allGood) {
    console.log(`  All ${verifiedCount} placeholders verified OK!`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

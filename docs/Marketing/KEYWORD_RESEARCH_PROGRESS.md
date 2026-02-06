# MEMOPYK Keyword Research — Progress Tracker

**Started:** February 5, 2026
**Last Updated:** February 6, 2026
**Status:** ✅ IMPORT COMPLETE — 12,501 keywords in Supabase (FR + EN)
**Goal:** Multi-language keywords for MEMOPYK blog content strategy

---

## Current State

### ✅ COMPLETED
- Identified 80 seed keywords across 9 clusters
- Exported 3 batches from Google Keyword Planner (France, French language)
- Got **3,410 raw keywords** (was estimated 3,099 — actual count after proper parsing)
- Merged all 3 CSVs into one file
- **Full tier classification completed** (see analysis below)
- Zero duplicates confirmed
- File encoding confirmed: ISO-8859-1 (not UTF-16 as originally noted)
- **Search intent classification ruleset created** → `INTENT_CLASSIFICATION_RULESET.md`
  - 5-layer rule-based system (LOW → HIGH → MEDIUM explicit → MEDIUM implicit → DEFAULT)
  - 20 rules, tested against all 3,410 keywords
  - Results: HIGH 119 (3.5%) | MEDIUM 3,247 (95.2%) | LOW 44 (1.3%)
  - Python + SQL implementations included
  - Edge cases verified: maison de retraite, youtube+prix, faire numériser, en ligne+gratuit
- **Supabase import complete** (February 6, 2026)
  - Import script: `scripts/import-keywords.ts`
  - 2,605 keywords imported (Tier 1-3)
  - 805 Tier 4 keywords skipped (irrelevant physical products)
  - Keywords CRUD UI added to Blog Hub → Keywords tab

### 🔄 NEXT STEPS
1. ~~Read merged CSV in new thread and do final analysis~~ ✅ DONE
2. ~~Search intent classification~~ ✅ DONE → `INTENT_CLASSIFICATION_RULESET.md`
3. ~~Import classified keywords into `content_keywords` table~~ ✅ DONE (Feb 6)
4. Consolidate accent/phrasing variants → group into keyword concepts
5. Update 40 topics in `content_topics` to reference verified keywords
6. Prioritize blog posts based on actual search opportunity

---

## Data Files

| File | Location | Description |
|------|----------|-------------|
| Merged CSV | `docs\data\Keyword_Stats_merged.csv` | All 3 GKP batches merged, ISO-8859-1 CSV |
| Batch 1 CSV | Uploaded to Claude (not saved locally) | VHS, montage, diaporama seeds |
| Batch 2 CSV | Uploaded to Claude (not saved locally) | Gift, photo org seeds |
| Batch 3 CSV | Uploaded to Claude (not saved locally) | Life events, tribute, family seeds |

---

## Full Analysis Results (February 6, 2026)

### File Stats
- **Total rows:** 3,410
- **Unique keywords:** 3,410 (zero duplicates)
- **Encoding:** ISO-8859-1 (not UTF-16)
- **Total monthly volume:** 2,282,650/mo

### Volume Distribution (GKP rounds to fixed thresholds)
| Volume | Keywords | Notes |
|--------|----------|-------|
| 50,000/mo | 15 | cadre photo personnalisé variants, idée cadeau fête des mères, coques |
| 5,000/mo | 217 | VHS numérisation, cadeaux retraite/mariage, cadeau personnalisé |
| 500/mo | 643 | Core service keywords, VHS long-tail, specific gift occasions |
| 50/mo | 2,523 | Long-tail variations, niche queries |
| 0/mo | 12 | Seed keywords with no GKP data |

**Note:** GKP only reports at 50, 500, 5K, 50K thresholds — no values between.

### Competition Breakdown
| Level | Keywords |
|-------|----------|
| High | 2,727 (80%) |
| Medium | 154 (5%) |
| Low | 218 (6%) |
| Unknown | 311 (9%) |

### Tier Classification

| Tier | Category | Keywords | Volume/mo | Priority |
|------|----------|----------|-----------|----------|
| **1** | **Direct Service** | 79 | 14,100 | 🔴 Highest — convert directly |
| **2** | VHS/Legacy | 521 | 88,550 | 🟠 Best blog driver |
| **2** | Gift Personalized | 122 | 111,350 | 🟠 High commercial intent |
| **2** | Gift Occasion | 345 | 346,200 | 🟠 Massive volume, seasonal |
| **2** | Life Event (Retirement) | 276 | 178,950 | 🟠 Huge volume, year-round |
| **2** | Life Baby | 15 | 2,100 | 🟡 Niche but perfect fit |
| **2** | Wedding Video | 20 | 2,800 | 🟡 Direct service match |
| **2** | Life Family | 1 | 0 | ⚪ Too niche in search |
| **2** | Life Tribute | 2 | 0 | ⚪ No search volume |
| **2** | Travel | 0 | 0 | ⚪ Not captured by seeds |
| **2** | Pet | 0 | 0 | ⚪ Not captured by seeds |
| **3** | Montage General | 41 | 7,900 | 🟡 Secondary content |
| **3** | Gift Generic | 804 | 594,600 | ⚪ Too broad for MEMOPYK |
| **3** | Photo/Video General | 255 | 271,900 | ⚪ Mostly physical products |
| **4** | Low Relevance | 913 | 662,500 | ❌ Skip (coques, cadres, t-shirts) |

### Top Tier 1 Keywords (Direct Service — non-"gratuit")
| Keyword | Volume | Competition |
|---------|--------|-------------|
| diaporama anniversaire | 500/mo | Medium |
| montage vidéo mariage | 500/mo | Medium |
| montage photo avec musique | 500/mo | Medium |
| montage photo musique | 500/mo | Medium |
| diaporama photo anniversaire | 500/mo | Medium |
| montage vidéo avec photo et musique | 500/mo | Medium |
| montage video pour mariage | 500/mo | Medium |
| montage vidéo souvenir | 50/mo | High |
| faire un film avec ses photos | 50/mo | High |
| film souvenir personnalisé | 0/mo | Unknown |

**Critical insight:** Most Tier 1 keywords are **Medium competition** — the best ROI zone for new content.

### "Gratuit" Keywords — Content Opportunity
34 keywords, 7,100/mo total. People searching for free montage tools = perfect audience for blog posts showing that professional quality >> free tools. Example: "montage vidéo photo musique gratuit" (500/mo).

### VHS/Numérisation Breakdown
- 6 keywords at 5,000/mo (all variants of "numériser vhs")
- 73 keywords at 500/mo (cassette, transfert, prix)
- 441 keywords at 50/mo (long-tail: convertir, transformer, super 8, etc.)
- **Total: 521 keywords, 88,550/mo**
- **Competition: Almost all High** — but blog content can rank on long-tail

### Retirement (cadeau retraite) — Surprise Goldmine
- 291 keywords, 180,150/mo total volume
- Top keywords all at 5,000/mo: cadeau retraite, cadeau retraite homme/femme, idée cadeau retraite
- **Blog angle:** "Un film souvenir comme cadeau de départ en retraite"

### Seasonal Signals
- **Fête des mères** keywords: YoY -90% (data captured post-peak, volume spikes April-May)
- **Anniversaire de mariage** keywords: YoY -90% (peaks in spring/summer)
- **Noël** keywords: 3-month change shows current season effects
- **Retirement:** Stable year-round (not seasonal)

---

## Key Strategic Insights

### 1. "Film souvenir" has almost zero search volume
People don't know this product exists. Content must target the **problem** (overwhelmed by photos, need a gift, want to preserve VHS) — not the solution name.

### 2. Medium competition Tier 1 keywords = best immediate opportunity
"diaporama anniversaire", "montage photo musique", "montage vidéo mariage" — all 500/mo with Medium competition. These should be the first blog posts.

### 3. VHS is the #1 content magnet
521 keywords, 88K/mo. Even though MEMOPYK doesn't directly do digitization, a comprehensive guide ("Comment numériser vos cassettes VHS") drives traffic → then redirect to the film souvenir service.

### 4. Retirement is an untapped emotional goldmine
180K/mo for "cadeau retraite" variants. Blog post: "Le plus beau cadeau de départ en retraite : un film souvenir de sa carrière" — positions MEMOPYK as the emotional alternative to generic gifts.

### 5. "Gratuit" searchers are frustrated future customers
7,100/mo searching for free tools. Content strategy: comparison posts showing limitations of free tools vs. professional service.

---

## Strategic Insights — Deep Analysis (February 6, 2026)

These 4 insights fundamentally change how MEMOPYK should approach content strategy.

### Insight 1: "Film souvenir" = Dead Keyword

**The Data:**
```
film souvenir personnalisé: (blank volume)
film souvenir voyage: (blank volume)  
film souvenir famille: (blank volume)
Total: 3 keywords, effectively 0 monthly searches
```

**What this means:**

MEMOPYK's core product name — "film souvenir" — has essentially **no search demand**. Out of 3,410 keywords in the dataset, only 3 contain "film souvenir" and none show measurable volume.

**Why it matters:**

People don't wake up thinking "I need a film souvenir." They think:
- "My grandpa's 80th birthday is coming up, what can I give him?"
- "I have boxes of photos I don't know what to do with"
- "How do I preserve my VHS tapes?"
- "I want to surprise mom for Mother's Day"

This means **all website copy, blog content, and SEO strategy must target the problem or occasion, not the product**. Writing "Créez votre film souvenir" as a headline is invisible to search engines. Writing "Le cadeau parfait pour un départ en retraite" captures actual search intent.

---

### Insight 2: VHS Digitization = Traffic Magnet (That You Don't Deliver)

**The Data:**
```
316 keywords containing VHS/numériser
Top performers (all 5,000/mo):
- numériser vhs
- numérisation vhs
- vhs numerisation
- numériser des vhs
- numériser une vhs
- numeriser une vhs
```

**What this means:**

VHS/cassette digitization has **massive search volume** — roughly 88,000+ searches/month across all variants. But MEMOPYK doesn't do digitization directly; you partner with labs.

**Why it matters — the content funnel:**

This is a **top-of-funnel traffic magnet** that feeds naturally into MEMOPYK's actual service:

```
Search: "comment numériser vhs" (informational)
   ↓
Blog: "Guide complet de la numérisation VHS" 
   → Partner referral to digitization lab
   ↓
Search: "que faire avec mes vhs numérisées" (next step)
   ↓
Blog: "Transformez vos cassettes numérisées en film souvenir"
   → MEMOPYK conversion
```

You capture the traffic, help them solve problem #1 (digitization), then position MEMOPYK as problem #2 (what to do with the raw files). The person who just paid €200 to digitize 20 tapes is **highly motivated** to do something meaningful with them.

---

### Insight 3: Retirement Gifts = Unexpected Winner

**The Data:**
```
291 keywords containing "retraite"
Top performers (ALL at 5,000/mo):
- cadeau retraite
- cadeau retraite homme
- cadeau retraite femme
- cadeau depart retraite
- idée cadeau retraite
- cadeau pour retraite
- cadeau homme retraite
- cadeau pour retraite femme
- cadeau pour la retraite
- cadeau femme retraite
- cadeau pour depart retraite
... (continues)
```

**What this means:**

Retirement gift searches represent approximately **180,000+ monthly searches** in France. This is **year-round demand** (unlike Christmas or Mother's Day), and the emotional context is perfect: honoring 40+ years of work, celebrating a major life transition.

**Why it matters:**

This should become a **primary content pillar**, not a secondary topic. Consider:

1. **Emotional resonance**: A film souvenir celebrating someone's career hits much harder than a watch or gift card
2. **Year-round**: Unlike seasonal gifts, retirements happen every month
3. **Budget flexibility**: Corporate gifts often have €500-1000+ budgets
4. **Two buyer types**: 
   - Colleagues/HR (corporate gift, bulk potential)
   - Family members (personal, emotional)

The blog strategy should include multiple angles: "Cadeau retraite original", "Discours de départ en retraite", "Idées de cadeau de départ personnalisé", etc.

---

### Insight 4: "Gratuit" Keywords = Frustrated Future Customers

**The Data:**
```
34 keywords containing "gratuit"
Top performers (500/mo each):
- montage vidéo photo musique gratuit
- montage photo musique gratuit
- montage photo avec musique gratuit
- diaporama anniversaire gratuit
- montage photo et musique gratuit
- montage photo en musique gratuit
- diaporama gratuit anniversaire
- diaporama gratuit pour anniversaire
... etc
```

**What this means:**

People searching for "free photo montage with music" are trying to create **exactly what MEMOPYK sells**. They want a souvenir video but think they can DIY it.

**Why it matters — the conversion content opportunity:**

These searchers will experience:
1. **Hour 1**: "This free tool looks easy!"
2. **Hour 3**: "Why is the music cutting off? The transitions are clunky..."
3. **Hour 6**: "I've wasted my whole Saturday and it looks amateur"
4. **Hour 7**: Google → "professional photo video montage service"

Your content can **intercept them at hour 3** with articles like:
- "Montage photo musique gratuit vs professionnel : la vraie différence"
- "Pourquoi les outils gratuits ne suffisent pas pour un anniversaire spécial"
- "J'ai testé 5 logiciels gratuits — voici ce que j'ai appris"

These aren't aggressive sales pitches. They're honest comparisons that help frustrated DIYers understand **when** professional help is worth it (emotional milestones, tight deadlines, quality expectations).

---

### Summary: How These Insights Change the Strategy

| Insight | Old Assumption | New Reality | Action |
|---------|---------------|-------------|--------|
| Film souvenir | Our product name = our keyword | Zero search demand | Rewrite all content around problems/occasions |
| VHS | Not our service, ignore | 88K/mo traffic magnet | Partner-referral funnel, capture top-of-funnel |
| Retirement | Nice-to-have topic | 180K/mo, year-round | Elevate to primary content pillar |
| Gratuit | Competitors, avoid | Frustrated future customers | Conversion content, "professional vs free" |

---

## Database Status

### Combined Totals (February 6, 2026)
- `content_keywords` table: **12,501 keywords**
  - 🇫🇷 French: 2,605 keywords
  - 🇬🇧 English: 9,896 keywords

### French Market (FR)
- Source: `docs/data/Keyword_Stats_merged.csv` (ISO-8859-1)
- Import script: `scripts/import-keywords.ts`
- Distribution:
  - Tier 1: 51 (Direct Service)
  - Tier 2: 1,597 (High Relevance)
  - Tier 3: 957 (Secondary)
- Total monthly volume: 1,677,350/mo

### English Market (EN)
- Source: `docs/Marketing/EN_keywords_merged_classified.csv`
- Import script: `scripts/import-keywords-en.ts`
- Distribution:
  - Tier 1: 385 (Direct Service)
  - Tier 2: 5,072 (High Relevance)
  - Tier 3: 4,439 (Secondary)
- Total monthly volume: Very high (500K+ per top keyword)
- **Notes:** English keywords include `cluster` field stored in notes column

### Database Schema
- Composite unique constraint: `(keyword, market)` — allows same keyword in different markets
- `content_topics` table: 102 topics (need to reference verified keywords)

---

## English Keywords Analysis (February 6, 2026)

### Top English Tier 1 Keywords (Direct Service)
| Keyword | Volume | Intent | Cluster |
|---------|--------|--------|---------|
| slideshow with music | 5,000/mo | Medium | direct_service |
| slideshow maker with music | 5,000/mo | Medium | direct_service |
| best app for making video from photos | 500/mo | Low | direct_service |
| best app to create video from photos | 500/mo | Low | direct_service |
| add music to google photo slideshow | 500/mo | Medium | direct_service |

### Top English Tier 2 Keywords (High Relevance)
| Keyword | Volume | Intent | Cluster |
|---------|--------|--------|---------|
| personalized photo products | 500,000/mo | High | gift_personalized |
| 1 year anniversary gift | 50,000/mo | Medium | gift_anniversary |
| 10 year anniversary gift | 50,000/mo | Medium | gift_anniversary |
| 20 year anniversary gift | 50,000/mo | Medium | gift_anniversary |
| retirement gift ideas | 50,000/mo | Medium | gift_retirement |

### English Keyword Clusters
- **gift_anniversary**: Anniversary-related gifts (massive volume)
- **gift_retirement**: Retirement gift ideas (mirrors FR "cadeau retraite" goldmine)
- **gift_personalized**: Personalized photo/video gifts
- **direct_service**: Slideshow/video creation queries
- **physical_products**: Moved to Tier 3 (mugs, blankets, etc.)

### Key Insight: Anniversary Market
The English market shows **massive volume for anniversary gifts** — multiple keywords at 50,000/mo. Combined with retirement and personalized gift clusters, this represents significant content opportunity for international expansion.

---

## Google Keyword Planner Settings Used (French)
- **Location:** France
- **Language:** French
- **Date range:** January 2025 – December 2025
- **Currency:** VND (account default — ignore CPC values, volumes are correct)

---

## Seed Keywords Used (3 batches)

### Batch 1 (8 seeds → 672 keywords)
numériser cassettes VHS, montage vidéo souvenir, film souvenir personnalisé, montage vidéo avec photos et musique, faire un film avec ses photos, montage vidéo prix, diaporama anniversaire, montage vidéo mariage

### Batch 2 (7 seeds → 2,090 keywords)
trop de photos téléphone, organiser ses photos numériques, cadeau personnalisé photo, cadeau anniversaire mariage, cadeau fête des mères original, cadeau grands-parents, cadeau noël personnalisé

### Batch 3 (7 seeds → 337 keywords)
vidéo hommage décès, film souvenir voyage, bébé première année souvenir, réunion famille vidéo, hommage animal décédé, cadeau retraite, film souvenir famille

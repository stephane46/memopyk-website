# MEMOPYK Keyword Research — Complete Reference

**Started:** February 5, 2026  
**Last Updated:** February 6, 2026  
**Status:** ✅ COMPLETE — 12,501 keywords in Supabase, all with clusters assigned  
**Supersedes:** `KEYWORD_RESEARCH_PROGRESS.md`, `EN_KEYWORD_RESEARCH_ANALYSIS.md`, `EN_STRATEGIC_NOTES_US_MARKET.md`, `EN_SEED_KEYWORDS_FOR_GKP.md` (all deleted Feb 6, 2026)
**Companion file:** `INTENT_CLASSIFICATION_RULESETS.md` (combined FR+EN rulesets)

---

## Database Status

| Market | Keywords | Tier 1 | Tier 2 | Tier 3 | Source |
|--------|----------|--------|--------|--------|--------|
| 🇫🇷 French | 2,605 | 51 | 1,597 | 957 | `Keyword_Stats_merged.csv` |
| 🇺🇸 English | 9,896 | 385 | 5,072 | 4,439 | `EN_keywords_merged_classified.csv` |
| **Total** | **12,501** | **436** | **6,669** | **5,396** | |

- Tier 4 keywords excluded from import (irrelevant physical products)
- All keywords have `cluster` field assigned (both FR and EN)
- Composite unique constraint: `(keyword, market)`
- `content_topics` table: 0 topics (cleaned Feb 6 — ready for fresh generation from verified keywords)

### Cluster Coverage (as of Feb 6, 2026)
| Market | Total | With Cluster |
|--------|-------|-------------|
| 🇺🇸 EN | 9,896 | 9,896 ✅ |
| 🇫🇷 FR | 2,605 | 2,605 ✅ |

### Cluster Distribution (after refinement)
| Cluster | Count | Notes |
|---------|-------|-------|
| other | 2,697 | Remaining uncategorized |
| vhs_digitization_info | 1,292 | How-to, DIY (top-funnel) |
| gift_graduation | 1,087 | Combined from splits |
| gift_anniversary_wedding | 667 | Split from gift_anniversary |
| gift_anniversary_milestone | 652 | 1st, 5th, 10th, 25th, 50th |
| gift_anniversary | 628 | Remaining general |
| gift_memorial | 587 | Sympathy, condolence |
| vhs_legacy | 560 | Remaining VHS |
| gift_personalized | 538 | Personalized gifts |
| direct_service | 523 | Core conversion keywords |
| physical_products | 502 | Low priority (mugs, frames) |
| gift_other | 441 | Remaining gift |
| gift_retirement | 374 | Year-round goldmine |
| gift_anniversary_couple | 364 | Dating/relationship |
| life_events | 331 | Wedding, baby, milestones |

---

## 🇫🇷 FRENCH MARKET (2,605 keywords)

### GKP Settings & Seeds
- **Location:** France | **Language:** French | **Date range:** Jan–Dec 2025
- **Batch 1** (8 seeds → 672 kw): VHS numérisation, montage vidéo, diaporama, mariage
- **Batch 2** (7 seeds → 2,090 kw): Photos téléphone, cadeaux personnalisés, fête des mères, grands-parents, Noël
- **Batch 3** (7 seeds → 337 kw): Hommage décès, voyage, bébé, réunion famille, animal, retraite
- **Total raw:** 3,410 | **After dedup:** 3,410 | **After Tier 4 removal:** 2,605

### Volume Distribution
| Volume | Keywords | Notes |
|--------|----------|-------|
| 50,000/mo | 15 | cadre photo personnalisé, idée cadeau fête des mères |
| 5,000/mo | 217 | VHS numérisation, cadeaux retraite/mariage |
| 500/mo | 643 | Core service keywords, VHS long-tail |
| 50/mo | 2,523 | Long-tail variations |
| 0/mo | 12 | Seed keywords with no GKP data |

### Competition: High 80% | Medium 5% | Low 6% | Unknown 9%

### Tier Breakdown
| Tier | Category | Keywords | Volume/mo | Priority |
|------|----------|----------|-----------|----------|
| **1** | Direct Service | 51 | 14,100 | 🔴 Convert directly |
| **2** | VHS/Legacy | 521 | 88,550 | 🟠 Best blog driver |
| **2** | Gift Personalized | 122 | 111,350 | 🟠 High commercial intent |
| **2** | Gift Occasion | 345 | 346,200 | 🟠 Massive, seasonal |
| **2** | Retirement | 276 | 178,950 | 🟠 Year-round goldmine |
| **2** | Life Baby | 15 | 2,100 | 🟡 Niche, perfect fit |
| **2** | Wedding Video | 20 | 2,800 | 🟡 Direct match |
| **3** | Montage General | 41 | 7,900 | 🟡 Secondary |
| **3** | Gift Generic | 804 | 594,600 | ⚪ Too broad |
| **3** | Photo/Video General | 255 | 271,900 | ⚪ Mostly physical |

### Top FR Tier 1 Keywords
| Keyword | Volume | Competition |
|---------|--------|-------------|
| diaporama anniversaire | 500/mo | Medium |
| montage vidéo mariage | 500/mo | Medium |
| montage photo avec musique | 500/mo | Medium |
| montage photo musique | 500/mo | Medium |
| diaporama photo anniversaire | 500/mo | Medium |
| montage vidéo souvenir | 50/mo | High |
| faire un film avec ses photos | 50/mo | High |

### "Gratuit" Keywords (34 kw, 7,100/mo)
Frustrated DIYers = future customers. "montage vidéo photo musique gratuit" (500/mo) is prime conversion content territory.

---

## 🇬🇧 ENGLISH/US MARKET (9,896 keywords)

### GKP Settings & Seeds
- **Location:** United States | **Language:** English | **Date range:** Jan–Dec 2025
- **Batch 1** (10 seeds): photo slideshow with music, video montage, tribute video, memorial video
- **Batch 2** (8 seeds): VHS digitization, convert VHS, 8mm film, old home movies
- **Batch 3** (10 seeds): retirement gift, anniversary gift, Mother's Day, memorial gift, graduation
- **Batch 4** (10 seeds): too many photos, baby first year, wedding slideshow, free vs paid, DIY vs pro
- **Total raw:** 9,979 | **After dedup:** 9,896

### Tier Breakdown
| Tier | Keywords | Key Insight |
|------|----------|-------------|
| **1** Direct Service | 385 | "slideshow with music" = anchor (5K/mo + 370 variations) |
| **2** High Relevance | 5,072 | Anniversary gifts 50K/mo each, VHS massive, memorial huge |
| **3** Secondary | 4,439 | Generic gifts, broad photo/video terms |

### Top EN Tier 1 Keywords
| Keyword | Volume | Cluster |
|---------|--------|---------|
| slideshow with music | 5,000/mo | direct_service |
| slideshow maker with music | 5,000/mo | direct_service |
| photo slideshow with music | 500/mo | direct_service |
| photo montage with music | 500/mo | direct_service |

### EN Cluster Analysis
| Cluster | Keywords | Total Volume | Insight |
|---------|----------|-------------|---------|
| Gift Occasions | 4,699 | 9,008,600 | Anniversary + sympathy = biggest. Competition index 100 |
| VHS/Legacy | 2,352 | 2,061,250 | Massive funnel entry. 50K/mo per variant group |
| Photo Products | 338 | 481,000 | Blankets, mugs — not MEMOPYK |
| Software/DIY | 1,881 | 217,850 | "Free" + "how to" — frustrated future customers |
| Slideshow/Montage | 1,074 | 144,850 | Core service, low volume per keyword |
| Pet Content | 111 | 117,150 | `pet memorial gift` = 50K/mo. Underrated |
| Life Events | 64 | 25,700 | Wedding, baby — narrow but high-intent |

### US SEO Competition Assessment
| Factor | France | US |
|--------|--------|-----|
| Direct competitors | ~5-10 | 50+ |
| Content volume | Low | Extremely high |
| Domain authority needed | Moderate | High |
| Long-tail opportunity | Excellent | Good (more competition even on long-tail) |
| Local SEO | Limited (remote service) | Higher value ("near me" queries) |

**US strategy focus:** Very specific long-tail, emotional angles competitors miss, comparison content, VHS-to-story funnel.

### US Pricing & Currency Notes
- US market expects USD pricing
- US consumers accustomed to subscription models — may expect lower per-project costs
- "How much does a professional slideshow cost" = real search query to target
- Consider pricing transparency content: "How Much Does a Custom Photo Slideshow Cost in 2026?"

### Canadian English
- No separate research needed — same terminology as US English
- Add Canadian cities (Toronto, Vancouver, Montreal, Calgary, Ottawa) to city matching rules
- Canadian Thanksgiving is in October (not November)
- If targeting Canada specifically later, a separate GKP export with Location: Canada would be useful

### Top EN Volume Keywords
| Keyword | Volume | Cluster |
|---------|--------|---------|
| 1 year anniversary gift | 50,000/mo | gift_anniversary |
| 10 year anniversary gift | 50,000/mo | gift_anniversary |
| sympathy gifts | 50,000/mo | gift_memorial |
| pet memorial gift | 50,000/mo | gift_personalized |
| retirement gift ideas | 50,000/mo | gift_retirement |
| personalized photo products | 500,000/mo | gift_personalized |

---

## 🔄 FRENCH vs ENGLISH COMPARISON

| Metric | 🇫🇷 French | 🇬🇧 English | Multiplier |
|--------|-----------|------------|------------|
| Total keywords imported | 2,605 | 9,896 | ~4x |
| VHS cluster | ~521 kw, 88K/mo | ~2,352 kw, 2M/mo | ~23x volume |
| Gift cluster | ~1,200 kw | ~4,699 kw | ~4x keywords |
| Anniversary gifts | 5K/mo (generic) | 50K/mo per year-specific | ~10x |
| Retirement gifts | 180K/mo | 50K/mo per variant | Comparable |
| Direct service | 51 kw | 385 kw | ~7x |

### Key Differences
1. **Memorial/Sympathy** = HUGE in US (50K/mo for "sympathy gifts"), minor in French data. "Celebration of life" is uniquely American.
2. **Anniversary gifts by year** = much more granular in US (1st through 50th, each 50K/mo).
3. **Pet memorial** = outsized in US ($136B pet industry).
4. **"Free" searchers** = much larger proportion in US (extremely DIY-oriented culture).
5. **Photo organization** = surprisingly tiny in both markets.
6. **Travel** = nearly absent in keyword data for both markets.

### Shared Patterns
- Core service terms ("film souvenir", "memory video") have near-zero search volume in both.
- VHS/digitization = top-of-funnel in both.
- Gift occasions = largest cluster by volume in both.

---

## 🎯 STRATEGIC INSIGHTS

### Insight 1: "Film Souvenir" / "Memory Video" = Dead Keywords
Only 3 FR keywords contain "film souvenir" — all with 0 volume. People don't search for the product. They search for the **problem** (overwhelmed by photos) or the **occasion** (retirement gift, anniversary).

**Action:** All content targets problems/occasions, not the product name.

### Insight 2: VHS Digitization = Traffic Magnet (Partner Funnel)
88K/mo in France, 2M+/mo in US. MEMOPYK doesn't do digitization but partners with labs.

**Funnel:** "How to digitize VHS" → Partner referral → "What to do with digitized footage" → MEMOPYK conversion.

### Insight 3: Retirement Gifts = Year-Round Goldmine
180K/mo in France, massive in US. Year-round demand (unlike seasonal gifts). Perfect emotional context. Two buyer types: corporate (HR/colleagues) and family.

### Insight 4: "Gratuit"/Free Searchers = Frustrated Future Customers
7.1K/mo (FR), much larger in US. DIYers who discover free tools aren't good enough → prime conversion content ("professional vs free" comparisons).

### Insight 5: US Market 5-6x Larger But More Competitive
50+ direct competitors in US vs ~5-10 in France. Strategy: very specific long-tail, emotional angles competitors miss, comparison content, VHS-to-story funnel.

---

## US-SPECIFIC TERMINOLOGY

| Term | US Usage | MEMOPYK Relevance |
|------|----------|-------------------|
| **slideshow** | Dominant for photo-to-video | ⭐ Primary keyword |
| **montage** | Movie-style rapid editing (Rocky) | Secondary |
| **tribute video** | Funerals, memorials | High emotional intent |
| **highlight reel** | Sports, events, recaps | Good for travel/events |
| **souvenir film** | Almost unknown in US | ❌ Don't use as keyword |

### US-Specific Occasions (Not in French Data)
- **Celebration of life** — Major US memorial format (378K/mo combined)
- **Quinceañera** — Hispanic 15th birthday (60M+ Hispanic Americans)
- **Bar/Bat Mitzvah** — Jewish coming-of-age, high-budget
- **Military homecoming/deployment** — Deeply emotional niche
- **Thanksgiving** — Family gathering, gratitude (November seasonal)

### US Competitor Landscape
**Direct:** Animoto, Tribute.co, Memorial Slideshow, Forever Studios, SmileBox
**DIY tools (frustrated users = prospects):** Canva, iMovie, CapCut, Google Photos, PowerPoint
**VHS digitization (top-of-funnel partners):** Legacybox, iMemories, Costco Photo, Walmart Photo

### US Seasonal Calendar
| Month | Peak Occasions | Content Angle |
|-------|---------------|---------------|
| **May** | Mother's Day + Memorial Day + graduations | 🔴 Peak gift + celebration |
| **Jun** | Father's Day + wedding season | 🔴 Peak gifts + weddings |
| **Nov** | Thanksgiving + Veterans Day + gift season start | 🔴 Family + military + gifts |
| **Dec** | Christmas + Hanukkah + year-end | 🔴 Gifts + year-in-review |
| Jan | New Year resolutions | "Finally organize your photos" |
| Feb | Valentine's Day | "Photo gift for partner" |
| Sep | Labor Day + back to routine | "Do something with vacation photos" |

---

## 🎯 CONTENT PRIORITIES (Both Markets)

### Priority 1 — Anchor Pages (Tier 1 keywords)
- FR: "montage photo avec musique", "diaporama anniversaire", "montage vidéo mariage"
- EN: "photo slideshow with music", "memorial video from photos", "wedding photo slideshow"

### Priority 2 — Top-of-Funnel Content (Tier 2 high-volume)
- VHS digitization guides (both markets)
- Retirement gift guides (both markets)
- Anniversary gift roundups (EN: year-specific)
- Memorial/tribute content (EN: "celebration of life")
- Pet memorial (EN priority)

### Priority 3 — Conversion Content
- "Free vs professional" comparisons (both markets)
- "When to hire a pro" articles
- Competitor comparisons (EN: "Animoto vs professional editor")
- Pricing transparency content

---

## 🔄 NEXT STEPS

1. ✅ French keyword research complete (2,605 imported)
2. ✅ English keyword research complete (9,896 imported)
3. ✅ Intent classification rulesets created (both markets)
4. ✅ Keyword-to-Topic Framework created (KEYWORD_TO_TOPIC_FRAMEWORK_1.md)
5. ✅ Hub-and-spoke schema added (role, parent_topic_id, cluster columns)
6. ✅ P1 grouping validation — script run, decisions documented (P1_GROUPING_REPORT.txt)
7. ✅ 21 P1 topic records created (4 pillars + 17 spokes) — gift_retirement FR/EN + gift_memorial EN
8. ☐ Add occasion/tool splitter for direct_service cluster (EN + FR)
9. ☐ Expand FR gift_memorial keywords via GKP (deuil/hommage/condoléance seeds)
10. ☐ Create direct_service topic records (~10-11 articles) after splitter
11. ☐ Repeat framework for P2 clusters (gift_personalized, vhs_legacy)
12. ☐ Build editorial calendar based on seasonal peaks

---

## Data Files Reference

### Marketing Folder Contents (after consolidation)
| File | Description |
|------|-------------|
| `KEYWORD_RESEARCH_COMPLETE.md` | This file — master reference |
| `KEYWORD_TO_TOPIC_FRAMEWORK_1.md` | Hub-and-spoke grouping framework with decision trees, normalization rules, P1 structures |
| `P1_GROUPING_REPORT.txt` | Validation report from running grouping script on 1,484 P1 keywords |
| `insert_p1_topics.sql` | SQL script for 21 P1 topic records (4 pillars + 17 spokes) |
| `CONTENT_STRATEGY_PROGRESS.md` | Tracker for topic/article pipeline status |
| `INTENT_CLASSIFICATION_RULESETS.md` | Combined FR+EN intent classification rulesets with Python + SQL |
| `BLOG_TOPICS_STRATEGIC.md` | 40 strategic blog topics |
| `blog_topics.json` | Same topics in JSON format |
| `Keyword_Stats_merged.csv` | 3,410 FR keywords, ISO-8859-1 |
| `EN_keywords_merged_classified.csv` | 9,896 EN classified keywords |
| `EN_batch1-4_mixed.csv` | Raw GKP exports (4 files, UTF-16 TSV) |

### Import Scripts
| Script | Description |
|--------|-------------|
| `scripts/import-keywords.ts` | FR import to Supabase |
| `scripts/import-keywords-en.ts` | EN import to Supabase |

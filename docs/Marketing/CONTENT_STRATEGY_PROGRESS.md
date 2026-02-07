# Content Strategy Progress

*Last updated: Feb 7, 2026*

## Overview

Content strategy converting 12,501 classified keywords into targeted blog topics organized as Topic Groups with Main Guides and Supporting Articles. Framework documented in `KEYWORD_TO_TOPIC_FRAMEWORK_1.md`.

---

## Terminology

This project uses a structured approach to content planning. Here's how the pieces fit together, from raw data to published articles.

### The Three Layers

**Layer 1 — Keywords** (raw search data)
A keyword is something real people type into Google: "retirement gift ideas," "cadeau retraite femme," "how to convert vhs to digital." We have 12,501 of them imported from Google Keyword Planner, each with a monthly search volume and competition level. Keywords are the raw material — they tell us what people want.

**Layer 2 — Topic Groups** (organization)
Keywords are organized into Topic Groups: clusters of related searches about the same theme. For example, the "Gift Retirement" topic group contains 374 keywords — everything from "retirement gift ideas" to "best retirement gifts for women" to "funny retirement gifts." A topic group represents a **content opportunity**: a theme worth writing about because enough people are searching for it.

In the database, this is the `cluster` column on keywords (e.g., `gift_retirement`, `gift_anniversary`, `vhs_digitization_info`). There are currently 35 topic groups spanning 12,501 keywords.

**Layer 3 — Articles** (what we actually write)
Each topic group produces a set of planned articles. These come in two types:

| In the admin UI | What it means | Example |
|----------------|---------------|----------|
| **Main Guide** | The broad overview article for the topic group. Covers the theme comprehensively and links to all its Supporting Articles. | "Retirement Gift Ideas: The Complete Guide" |
| **Supporting Article** | A focused piece that goes deep on one specific angle within the topic group. Links back to its Main Guide. | "Best Retirement Gifts for Women" |

In the database, this is the `role` column on topics (`pillar` = Main Guide, `spoke` = Supporting Article).

### How They Connect

```
Keywords (12,501)                    Topic Groups (35)              Articles (27 planned)
─────────────────                    ─────────────────              ────────────────────
"retirement gift ideas" ─────┐
"best retirement gifts"  ────┤
"retirement gift for         │       Gift Retirement     ───►     📄 Main Guide: Retirement Gift Ideas
  coworker" ─────────────────┤       (374 keywords)                  ↳ Supporting: Gifts for Coworkers
"cadeau retraite" ───────────┤       (216K monthly vol)              ↳ Supporting: Gifts for Women
"cadeau retraite femme" ─────┤                                       ↳ Supporting: Gifts for Men
"cadeau retraite humour" ────┘                                       ↳ Supporting: Personalized Gifts
                                                                     ↳ ...4 more
```

The conversion process (keywords → topic group → articles) is called the **framework pass** and is documented in `KEYWORD_TO_TOPIC_FRAMEWORK_1.md`. Not all topic groups have articles yet — of our 35 groups, only 8 have planned articles so far.

### Why This Structure Matters for SEO

Search engines reward websites that demonstrate **topical authority** — comprehensive coverage of a subject from multiple angles. When Google sees:
- A Main Guide covering "Retirement Gift Ideas" broadly
- Five Supporting Articles each covering a specific angle
- All linking to each other within the same Topic Group

...it understands that this website is an authority on retirement gifts, and ranks all those pages higher than a single standalone article would rank.

This is why every Supporting Article links back to its Main Guide, and every Main Guide links out to its Supporting Articles. The linking structure IS the authority signal.

### Quick Reference

| Term in docs/code | Term in admin UI | What it is |
|-------------------|-----------------|------------|
| `cluster` | Topic Group | A group of related keywords about the same theme |
| `pillar` | Main Guide | The broad overview article for a topic group |
| `spoke` | Supporting Article | A focused article within a topic group |
| `parent_topic_id` | Parent Guide | Which Main Guide a Supporting Article belongs to |
| `primary_keyword` | Primary Keyword | The main search term an article targets |
| `search_volume` | Monthly Searches | How many times per month people search this term |
| Framework pass | — | The process of analyzing a topic group's keywords and deciding what articles to write |

---

## Database Schema

| Column | Type | Purpose | Status |
|--------|------|---------|--------|
| `role` | TEXT DEFAULT 'spoke' | pillar / spoke / standalone | ✅ Added |
| `parent_topic_id` | UUID FK → content_topics(id) | Links spokes to pillar | ✅ Added |
| `cluster` | TEXT | Keyword cluster grouping | ✅ Added |

Indexes: `idx_content_topics_parent`, `idx_content_topics_cluster`, `idx_content_topics_role` — all created.

---

## P1 Topics — Created (21 articles)

### gift_retirement FR (1 pillar + 6 spokes = 7)

| # | Role | Title | Primary KW | Vol |
|---|------|-------|-----------|-----|
| 1 | 🏛️ Pillar | Cadeaux de Départ à la Retraite : Le Guide Complet | cadeau retraite | 5,000 |
| 2 | 🔗 Spoke | Idées Cadeaux de Retraite pour Femme | cadeau retraite femme | 5,000 |
| 3 | 🔗 Spoke | Idées Cadeaux de Retraite pour Homme | cadeau retraite homme | 5,000 |
| 4 | 🔗 Spoke | Cadeau Retraite Personnalisé : Les Meilleures Idées | cadeau retraite personnalisé | 500 |
| 5 | 🔗 Spoke | Cadeau de Retraite Original et Inoubliable | cadeau retraite original | 500 |
| 6 | 🔗 Spoke | Cadeau Retraite Collègue : Idées pour Marquer le Coup | cadeau de départ pour un collègue | 500 |
| 7 | 🔗 Spoke | Cadeau Retraite Humour : Offrir le Sourire | cadeau retraite humour | 500 |

### gift_retirement EN (1 pillar + 4 spokes = 5)

| # | Role | Title | Primary KW | Vol |
|---|------|-------|-----------|-----|
| 8 | 🏛️ Pillar | Retirement Gift Ideas: The Complete Guide | retirement gift ideas | 5,000 |
| 9 | 🔗 Spoke | Best Retirement Gifts for Coworkers | retirement gift for coworker | 5,000 |
| 10 | 🔗 Spoke | Best Retirement Gifts for Women | retirement gift for coworker female | 500 |
| 11 | 🔗 Spoke | Best Retirement Gifts for Men | retirement gifts for male coworkers | 500 |
| 12 | 🔗 Spoke | Personalized Retirement Gifts That Last Forever | personalized retirement gifts for coworkers | 50 |

### gift_memorial EN (2 pillars + 7 spokes = 9)

| # | Role | Title | Primary KW | Vol |
|---|------|-------|-----------|-----|
| 13 | 🏛️ Pillar | Memorial & Sympathy Gift Guide | sympathy gifts | 50,000 |
| 14 | 🏛️ Pillar | Pet Memorial Gifts: Honoring Your Furry Friend | pet memorial gift | 50,000 |
| 15 | 🔗 Spoke | Memorial Gifts for Loss of Mother | memorial gifts for loss of mom | 5,000 |
| 16 | 🔗 Spoke | Memorial Gifts for Loss of Father | loss of father memorial gifts | 5,000 |
| 17 | 🔗 Spoke | Unique & Unusual Memorial Gifts | unique memorial gifts | 5,000 |
| 18 | 🔗 Spoke | Personalized Sympathy & Memorial Gifts | personalized sympathy gifts | 500 |
| 19 | 🔗 Spoke | Bereavement Gifts for Coworkers | sympathy gifts for coworker | 500 |
| 20 | 🔗 Spoke | DIY Memorial & Sympathy Gifts | diy memorial gifts | 500 |
| 21 | 🔗 Spoke | Sympathy Gifts for a Grieving Friend | sympathy gifts for friend | 500 |

**MEMOPYK money pages** (strongest CTA): #4 (personnalisé FR), #5 (original FR), #12 (personalized EN), #17 (unique EN), #18 (personalized EN memorial)

---

## Pillar-First Expansion — 6 New Main Guides (Feb 7, 2026)

Strategic gap analysis revealed that 21 topics covering only retirement + memorial made MEMOPYK look like a death & retirement service. Brand identity is joyful life celebrations. Solution: pillar-first pass across top untapped topic groups.

### Why these 6?

Full keyword inventory showed 35 topic groups totaling 16.3M monthly volume. Only 2 groups had articles (709K / 4.3% coverage). The 6 largest untapped groups by volume were selected for Main Guide creation:

| # | Topic Group | Market | Main Guide Title | Primary KW | Vol | Group Total |
|---|------------|--------|-----------------|-----------|-----|-------------|
| 22 | gift_anniversary | EN | Anniversary Gift Ideas: The Complete Guide | anniversary gift ideas | 50K | 5.2M |
| 23 | gift_graduation | EN | Best Graduation Gift Ideas | graduation gifts | 50K | 2.2M |
| 24 | vhs_digitization_info | EN | How to Convert VHS to Digital: Complete Guide | convert vhs to digital | 50K | 1.2M |
| 25 | gift_anniversary_wedding | EN | Wedding Anniversary Gifts by Year | wedding anniversary gifts | 50K | 993K |
| 26 | gift_mothers | EN | Creative Mother's Day Gift Ideas | cool mothers day gifts | 50K | 867K |
| 27 | vhs_legacy | EN | Super 8, 8mm & VCR Tapes: Guide to Your Home Movie Collection | 8mm film to digital | 5K | 460K |

All inserted with `status: idea`, `role: pillar`, `priority: 1`.

### Clusters dropped from this batch

| Cluster | Reason |
|---------|--------|
| gift_personalized | Product SERP trap — top keywords are physical items (photo blankets, frames, pillows). MEMOPYK would compete against Etsy/Amazon/Shutterfly. Better as cross-cutting spokes within occasion clusters. |
| life_events | FR-dominant (318 FR vs 13 EN), low volume (5K top). Works as internal linking hub later, not a traffic-driving pillar. |

### Keyword verification decisions

| Topic Group | Issue | Resolution |
|---|---|---|
| gift_mothers | "gifts for mom" doesn't exist in database — cluster is 100% Mother's Day seasonal | Used "cool mothers day gifts" (50K, actual top term). Awkward phrasing but real data. |
| gift_personalized | 500K on "personalized photo products" = GKP outlier | Dropped entire pillar — cluster is product-oriented, wrong SERP for MEMOPYK. |
| vhs_legacy | "film super 8mm" (50K) = product SERP (Kodak, eBay, Walmart film stock) | Fell back to "8mm film to digital" (5K) — unambiguous preservation/conversion intent. |

### Notes for content briefs

- **#26 gift_mothers**: SEASONAL — must publish by early March to catch April-May spike. 50K is seasonal average masking 200K+ peak.
- **#27 vhs_legacy**: Title-to-keyword tension — title hooks "what is this old format?" readers, primary KW targets conversion intent. Content must bridge both: H1/intro captures format curiosity, body satisfies digitization intent, CTA funnels to MEMOPYK service.
- **VHS scope separation**: #24 (vhs_digitization_info) = "how do I do this?" / DIY guide. #27 (vhs_legacy) = "what do I have and why does it matter?" / format identification. Different intent, different SERP.

### Revised totals

| | Main Guides | Supporting Articles | Total |
|---|---|---|---|
| Before | 4 | 17 | 21 |
| Added | 6 | 0 | 6 |
| **Total** | **10** | **17** | **27** |

Topic groups with articles: 8 of 35. Supporting Articles get added per group via full framework passes, starting with gift_anniversary (biggest opportunity at 5.2M).

---

## Folded Keywords (not separate topics)

These groups had ≥500/mo volume but ≤3 keywords (GKP bucketing artifact). Folded into parent spokes as secondary keywords:

| Group | Folded Into |
|-------|-------------|
| men/personalized (500/mo, 2 kw) | Loss of Father spoke (#16) |
| men/unique (500/mo, 3 kw) | Loss of Father spoke (#16) |
| women/unique (500/mo, 2 kw) | Loss of Mother spoke (#15) |

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | FR homme/femme = spokes, not pillars | GKP bucketing inflated volume to 5K; editorial intent is sub-topic |
| 2 | Pet memorial = standalone pillar | 50K/mo, completely different audience/emotion than human loss |
| 3 | EN retirement: generic pillar, coworker as spoke | Future-proof URL; generic ranks broader; coworker data is seed bias |
| 4 | Fold rule: ≥500/mo + ≤3 keywords = fold | Not enough keyword diversity for a standalone article |

---

## Pending Work

### In Progress
- [x] **UI: Plain language rename** — Replacing pillar/spoke/cluster jargon with Main Guide/Supporting Article/Topic Group in admin UI (Claude Code, Feb 7)
- [x] **UI: Grouped topic list** — Topics grouped by Topic Group with collapsible sections, Main Guides first, Supporting Articles indented (Claude Code, Feb 7)
- [x] **UI: Role/cluster/parent fields in TopicFormModal** — Three new form fields: Article Role, Topic Group, Parent Guide (Claude Code, Feb 7)
- [x] **UI: Help panel rewrite** — Topics help content updated with plain-language terminology (Claude Code, Feb 7)

### Immediate (P1 completion)
- [ ] **direct_service occasion/tool splitter** — grouping algorithm needs cluster-specific override for occasion-based keywords (wedding, anniversary, funeral) and tool-based keywords (slideshow maker, montage, diaporama)
- [ ] **FR gift_memorial GKP expansion** — run keyword research with seeds: deuil, hommage, condoléances, cadeau souvenir décès, vidéo hommage
- [ ] **Create direct_service topic records** (~10-11 articles) after splitter is built
- [ ] **Full framework pass: gift_anniversary** — Biggest opportunity (5.2M volume). Analyze 1,280 keywords → identify spoke topics. Target: 4-8 Supporting Articles.

### Next Wave
- [ ] **FR pillar mirrors** — Create FR versions of anniversary, VHS, and personalized pillars after verifying FR keyword volume per group
- [ ] **Full framework pass: gift_graduation** — 2.2M volume, 1,087 keywords. EN-only.
- [ ] **Full framework pass: vhs_digitization_info** — 1.2M volume, 1,292 keywords.
- [ ] Build editorial calendar with seasonal peaks (Mother's Day March deadline)
- [ ] Evaluate gift_personalized as cross-cutting spoke strategy vs standalone pillar

---

## Reference Files

| File | Description |
|------|-------------|
| `KEYWORD_TO_TOPIC_FRAMEWORK_1.md` | Full framework: decision trees, normalization, P1 structures |
| `P1_GROUPING_REPORT.txt` | Grouping script output validating 1,484 P1 keywords |
| `insert_p1_topics.sql` | SQL for 21 P1 topic records |
| `KEYWORD_RESEARCH_COMPLETE.md` | Master keyword research reference |
| `INTENT_CLASSIFICATION_RULESETS.md` | FR+EN intent classification rules |

---

*Document maintained by Claude Chat*

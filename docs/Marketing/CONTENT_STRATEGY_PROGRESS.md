# Content Strategy Progress

*Last updated: Feb 7, 2026*

## Overview

Hub-and-spoke content strategy converting 12,501 classified keywords into targeted blog topics. Framework documented in `KEYWORD_TO_TOPIC_FRAMEWORK_1.md`.

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

### Immediate (P1 completion)
- [ ] **direct_service occasion/tool splitter** — grouping algorithm needs cluster-specific override for occasion-based keywords (wedding, anniversary, funeral) and tool-based keywords (slideshow maker, montage, diaporama)
- [ ] **FR gift_memorial GKP expansion** — run keyword research with seeds: deuil, hommage, condoléances, cadeau souvenir décès, vidéo hommage
- [ ] **Create direct_service topic records** (~10-11 articles) after splitter is built

### Later (P2+)
- [ ] Repeat framework for P2 clusters (gift_personalized, vhs_legacy)
- [ ] Build editorial calendar with seasonal peaks
- [ ] UI: Add role/cluster/parent fields to TopicFormModal
- [ ] UI: Show pillar/spoke hierarchy in ContentProductionTopics list

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

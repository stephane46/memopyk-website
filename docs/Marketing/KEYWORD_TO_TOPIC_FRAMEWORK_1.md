# Keyword-to-Topic Structure Framework

## Purpose
Convert 12,501 classified keywords into a manageable set of content topics using consistent rules for grouping, deduplication, and hub-and-spoke structuring.

---

## 1. Framework: What Defines a "Topic"

### Core Principle
**A topic = one search intent that deserves its own page.** Two keywords belong to the same topic if a single article would satisfy both searchers. They are separate topics if a reader searching one would be disappointed by content targeting the other.

### Decision Tree

```
Two keywords in the same cluster → Ask:

1. Are they spelling/accent/filler variants?
   → SAME TOPIC. Merge. Pick canonical keyword.
   
   Example: "cadeau retraite" = "cadeau pour la retraite" = "cadeau pour un départ en retraite"

2. Do they share the same TARGET PERSON?
   → Check modifiers:
   
   2a. Same target, no meaningful modifier difference?
       → SAME TOPIC
       Example: "cadeau retraite homme" = "cadeau pour homme retraite" = "idée cadeau homme retraite"
   
   2b. Same target, different MODIFIER with distinct intent?
       → Check volume (see §5 thresholds):
       - Volume ≥ 500/mo → SEPARATE SPOKE
       - Volume < 500/mo → FOLD INTO parent topic as secondary keyword
       Example: "cadeau retraite personnalisé" (500/mo) → separate spoke
       Example: "cadeau retraite pas cher" (50/mo) → fold into pillar

3. Do they target DIFFERENT PEOPLE?
   → SEPARATE TOPICS (always)
   
   Example: "cadeau retraite homme" ≠ "cadeau retraite femme" ≠ "cadeau retraite collègue"

4. Do they target different OCCASIONS even if same cluster?
   → SEPARATE TOPICS
   
   Example: "cadeau départ retraite" ≠ "cadeau anniversaire retraite"
```

### Same-Topic Signals (MERGE)
- Accent variations: idée/idee, fête/fete, mère/mere
- Plural/singular: cadeau/cadeaux
- Filler words: pour/pour la/pour un/pour une
- Word order swaps: "cadeau retraite homme" = "cadeau homme retraite"
- "idée cadeau X" = "cadeau X" (same intent, just prefixed)
- Synonym in same position: "original" ≈ "originale" (gender agreement only)

### Different-Topic Signals (SEPARATE)
- Different target person: homme/femme/collègue/patron/ami/parent
- Different occasion: retraite/anniversaire/mariage/noël
- Different product type: film/cadre/mug/coffret
- DIY vs. service: "comment faire" vs. "service de" 
- Informational vs. transactional: "qu'est-ce que" vs. "prix/tarif/devis"

---

## 2. Modifier Treatment

### Modifier Categories

| Modifier | French Terms | EN Terms | Treatment |
|----------|-------------|----------|-----------|
| **Personalized** | personnalisé(e) | personalized, custom | Spoke if ≥500/mo |
| **Original/Unique** | original(e), unique | original, unique, creative | Spoke if ≥500/mo |
| **Budget** | pas cher, petit budget | cheap, budget, affordable | Spoke if ≥500/mo |
| **Humour** | humour, drôle, rigolo | funny, humorous | Spoke if ≥500/mo |
| **DIY/Handmade** | fait main, DIY | handmade, DIY, homemade | Spoke if ≥500/mo |
| **Last minute** | dernière minute | last minute | Spoke if ≥500/mo |
| **Best/Top** | meilleur(e), top | best, top | Fold into pillar — ranking modifier, not different intent |
| **Idea** | idée | idea | Fold into pillar — "idée cadeau X" = "cadeau X" |

### Rules

1. **"Personnalisé" and "original" get their own spokes** when volume ≥ 500/mo, because MEMOPYK IS the personalized/original option. These are money keywords.
2. **"Pas cher" gets a spoke** when volume ≥ 500/mo — even if MEMOPYK isn't cheap, the article can position the service as good value vs. alternatives.
3. **"Humour" gets a spoke** when volume ≥ 500/mo — distinct creative angle.
4. **"Meilleur/top/idée" always fold** into the parent topic as secondary keywords. They don't change the search intent.
5. If a modifier exists in BOTH "cadeau X personnalisé" and "cadeau personnalisé X" forms, these are the SAME spoke — just word order variants.

---

## 3. Gender Treatment

**Separate topics.** Always.

Rationale: Someone searching "cadeau retraite femme" wants feminine gift ideas — an article covering both genders would waste half their reading time. Google also ranks gender-specific pages for gender-specific queries.

Structure:
```
PILLAR: "Cadeau de Départ à la Retraite" (gender-neutral, links to both spokes)
├── SPOKE: "Cadeau Retraite Femme" 
└── SPOKE: "Cadeau Retraite Homme"
```

**Exception:** If gender-specific volume < 500/mo for BOTH genders in a cluster, combine into one article with sections.

---

## 4. Relationship Treatment

**Separate spokes** when the relationship implies a different gifting context:

| Relationship | Why Separate |
|-------------|-------------|
| Collègue (colleague) | Workplace gift → different budget, formality |
| Patron (boss) | Professional hierarchy → different tone |
| Parent/Père/Mère | Family emotional angle |
| Ami(e) (friend) | Casual, personal |
| Grands-parents | Intergenerational, nostalgia angle |

Threshold: ≥ 500/mo gets its own spoke. Below that, fold into the pillar with a section.

---

## 5. Volume Thresholds

| Monthly Volume | Action |
|---------------|--------|
| ≥ 5,000 | **Pillar page** — comprehensive guide |
| 500 – 4,999 | **Spoke article** if distinct intent, otherwise fold into pillar |
| 50 – 499 | **Fold as secondary keyword** into nearest topic |
| < 50 | **Ignore** unless it's a Tier 1 direct service keyword |

### Special Rules
- **Tier 1 keywords** (direct service) get topics regardless of volume — these are conversion keywords.
- **High intent keywords** get topics at lower thresholds (≥ 50/mo) — buyer-ready traffic is worth a dedicated page even at low volume.
- **GKP volume bucketing caveat**: Many FR keywords show identical volumes (e.g., 26 retirement keywords all at 5,000/mo). This is GKP's bucketing, not real distribution. Treat the highest-volume bucket as one "virtual volume" for the pillar — don't sum 26 × 5,000 as if they're 130K separate searches.

---

## 6. Hub-and-Spoke Structures for P1 Clusters

### A. gift_retirement (FR: 279 kw, 169,650/mo | EN: 46 kw, 21,650/mo)

```
PILLAR: "Cadeaux de Départ à la Retraite : Le Guide Complet"
  Primary KW: cadeau retraite (5,000/mo FR)
  Secondary: cadeau départ retraite, cadeau pour la retraite, idée cadeau retraite, retraite cadeau
  (all 5,000/mo variants = same bucket = same topic)
  
├── SPOKE 1: "Idées Cadeaux de Retraite pour Femme"
│   Primary: cadeau retraite femme (5,000/mo)
│   Secondary: cadeau pour une retraite femme, idée cadeau retraite femme, cadeau départ retraite femme
│
├── SPOKE 2: "Idées Cadeaux de Retraite pour Homme"  
│   Primary: cadeau retraite homme (5,000/mo)
│   Secondary: cadeau homme retraite, cadeau pour homme retraite, cadeau de retraite homme
│
├── SPOKE 3: "Cadeau Retraite Personnalisé : Les Meilleures Idées"
│   Primary: cadeau retraite personnalisé (500/mo)
│   Secondary: cadeau personnalisé retraite
│   ** MEMOPYK money page — this is where the CTA is strongest **
│
├── SPOKE 4: "Cadeau de Retraite Original et Inoubliable"
│   Primary: cadeau original pour retraite (500/mo)
│   Secondary: idée cadeau retraite original, cadeau original pour retraite homme
│   ** Second money page for MEMOPYK **
│
├── SPOKE 5: "Cadeau Retraite Collègue : Idées pour Marquer le Coup"
│   Primary: idée cadeau départ retraite collègue femme (500/mo)
│   Secondary: cadeau collègue retraite, cadeau départ collègue
│
└── SPOKE 6: "Cadeau Retraite Humour : Offrir le Sourire"
    Primary: cadeau humour retraite (500/mo)
    Secondary: cadeau drôle retraite, cadeau rigolo départ retraite

TOTAL: 1 pillar + 6 spokes = 7 articles
Absorbs: ~200+ keyword variants as secondary keywords across these 7 pages
```

**EN version** (lower volume, fewer spokes):
```
PILLAR: "Retirement Gift Ideas: The Complete Guide"
  Primary: retirement gift ideas
├── SPOKE 1: "Best Retirement Gifts for Women"
├── SPOKE 2: "Best Retirement Gifts for Men"  
├── SPOKE 3: "Personalized Retirement Gifts That Last Forever"
└── SPOKE 4: "Retirement Gifts for Coworkers"

TOTAL: 1 pillar + 4 spokes = 5 articles
```

---

### B. gift_memorial (EN: 414 kw, 378,450/mo | FR: minimal — needs GKP expansion)

```
PILLAR: "Memorial & Sympathy Gift Guide"
  Primary: sympathy gifts (50,000/mo)
  Secondary: sympathy gift ideas, sympathy gift suggestions, condolence gift ideas, memorial gifts for loss
  
├── SPOKE 1: "Memorial Gifts for Loss of Mother"
│   Primary: memorial gift for loss of mother (5,000/mo)
│   Secondary: memorial gifts for loss of mom, gifts for sympathy loss of mother, 
│              remembrance gift for loss of mother, condolences gift for loss of mother
│
├── SPOKE 2: "Memorial Gifts for Loss of Father"
│   Primary: sympathy gifts for loss of father (5,000/mo)
│   Secondary: loss of father memorial gifts, remembrance gifts for loss of father,
│              condolence gifts for loss of father, sympathy gifts for loss of dad
│
├── SPOKE 3: "Pet Memorial Gifts: Honoring Your Furry Friend"
│   Primary: pet memorial gift (50,000/mo)
│   Secondary: sympathy gift for loss of dog, condolence gifts for loss of dog,
│              sympathy gifts for dog death
│   ** High volume — could be its own pillar eventually **
│
├── SPOKE 4: "Unique & Unusual Memorial Gifts"
│   Primary: unique memorial gifts (5,000/mo)
│   Secondary: unusual memorial gifts
│   ** MEMOPYK money page **
│
├── SPOKE 5: "Sympathy Gift Baskets & Packages"
│   Primary: sympathy gift baskets (50,000/mo)
│   Secondary: sympathy gift packages
│   ** Less relevant to MEMOPYK — use to capture traffic, CTA to "video alternative" **
│
└── SPOKE 6: "Bereavement Gifts for Coworkers"
    Primary: bereavement gift for male coworker (500/mo)
    Secondary: sympathy gift coworker, bereavement gift basket ideas

TOTAL: 1 pillar + 6 spokes = 7 articles
```

**FR version** (needs keyword research expansion with deuil/hommage/condoléance seeds):
```
PILLAR: "Cadeaux de Condoléances et de Souvenir"
├── SPOKE: "Hommage Vidéo : Un Cadeau de Souvenir Unique"  ← MEMOPYK core
└── (more spokes pending keyword research)
```

---

### C. direct_service (EN: 372 kw, 49,200/mo | FR: 54 kw, 8,700/mo)

This cluster is different — keywords are mostly DIY/tool-related, not gift-focused. The strategy is **intercept DIY searchers and convert them to service**.

```
FR PILLAR: "Montage Vidéo Souvenir : Guide Complet"
  Primary: montage photo musique (500/mo)
  Secondary: montage video avec photo et musique, montage vidéo avec photo et musique
  
├── SPOKE 1: "Montage Vidéo Mariage : Comment Créer un Film Inoubliable"
│   Primary: montage vidéo mariage (500/mo)
│   Secondary: montage video pour mariage, mariage montage video
│
├── SPOKE 2: "Diaporama Anniversaire : Idées et Conseils"
│   Primary: diaporama anniversaire (500/mo)
│   Secondary: diaporama photo anniversaire, diaporama anniversaire gratuit
│   ** "gratuit" variant = opportunity to show why free tools disappoint **
│
├── SPOKE 3: "Montage Photo Musique : Outils vs. Service Pro"
│   Primary: montage photo musique gratuit (500/mo)
│   Secondary: montage vidéo photo musique gratuit
│   ** Comparison page: DIY tools vs. MEMOPYK service **
│
└── SPOKE 4: "Film Souvenir : Pourquoi Faire Appel à un Professionnel"
    Primary: film souvenir (from site content — low GKP volume but Tier 1)
    ** Conversion page — pure MEMOPYK positioning **

TOTAL: 1 pillar + 4 spokes = 5 articles
```

**EN version:**
```
PILLAR: "How to Create a Photo Slideshow with Music"
  Primary: slideshow with music (5,000/mo)
├── SPOKE 1: "Best Slideshow Makers with Music (Free & Paid)"
├── SPOKE 2: "How to Add Music to Google Photos Slideshow"
├── SPOKE 3: "Create a Photo Montage with Music: Step-by-Step"
└── SPOKE 4: "Why DIY Slideshows Disappoint (And What to Do Instead)"

TOTAL: 1 pillar + 4 spokes = 5 articles
```

---

## 7. Canonical Keyword Selection

When merging variants into one topic, pick the **primary keyword** by this priority:

1. **Proper French spelling** (accents, grammar) — "idée cadeau" beats "idee cadeau"
2. **Highest volume** — if tied on spelling, pick the higher volume variant
3. **Shortest clean form** — "cadeau retraite" beats "cadeau pour la retraite" (fewer filler words)
4. **Most natural phrasing** — what a real person would type

All other variants become **secondary keywords** in the topic record.

**FR-specific rules:**
- Keep accents: "fête" not "fete", "retraité" not "retraite" (when meaning differs)
- Use singular unless plural is the dominant form
- "idée cadeau X" → primary is "cadeau X" (shorter), "idée cadeau X" is secondary

---

## 8. Normalization Rules (Python)

```python
import re
import unicodedata

# ============================================================
# Step 1: Accent normalization (for MATCHING, not for display)
# ============================================================
def normalize_for_matching(keyword: str) -> str:
    """Remove accents and normalize for comparison only.
    Original keyword with accents stays as display/primary keyword."""
    kw = keyword.lower().strip()
    # Decompose unicode, remove combining marks
    kw = unicodedata.normalize('NFD', kw)
    kw = re.sub(r'[\u0300-\u036f]', '', kw)
    return kw

# ============================================================
# Step 2: Filler word removal (for GROUPING)
# ============================================================
FR_FILLERS = [
    r'\bpour\s+(la|le|les|un|une|des|l\')\b',
    r'\bpour\b',
    r'\bde\s+(la|le|les|l\')\b',
    r'\bà\s+(la|le|les|l\')\b',
    r'\bd\'un\b', r'\bd\'une\b',
    r'\ben\b',
]

EN_FILLERS = [
    r'\bfor\s+(a|an|the|my|your|his|her)\b',
    r'\bfor\b',
    r'\bthe\b',
    r'\bto\b',
    r'\bof\b',
    r'\ba\b',
    r'\ban\b',
]

def remove_fillers(keyword: str, market: str = 'fr') -> str:
    """Remove filler words for grouping comparison."""
    kw = keyword.lower().strip()
    fillers = FR_FILLERS if market == 'fr' else EN_FILLERS
    for pattern in fillers:
        kw = re.sub(pattern, ' ', kw)
    kw = re.sub(r'\s+', ' ', kw).strip()
    return kw

# ============================================================
# Step 3: Extract components for grouping
# ============================================================
FR_MODIFIERS = {
    'personnalise': r'personnalis[ée]+',
    'original': r'original[e]?',
    'unique': r'unique',
    'pas_cher': r'pas\s+cher|petit\s+budget|economique',
    'humour': r'humour|drole|rigolo|marrant|amusant',
    'fait_main': r'fait\s+main|diy|artisanal',
    'derniere_minute': r'derni[eè]re?\s+minute',
    'best': r'meilleur[e]?|top|id[ée]e',
    'luxe': r'luxe|haut\s+de\s+gamme|premium',
}

FR_TARGETS = {
    'homme': r'\bhomme[s]?\b',
    'femme': r'\bfemme[s]?\b',
    'collegue': r'\bcoll[eè]gue[s]?\b',
    'patron': r'\bpatron[ne]?\b|\bboss\b|\bchef\b',
    'ami': r'\bami[e]?[s]?\b',
    'parent': r'\bparent[s]?\b|\bpère\b|\bmère\b|\bpapa\b|\bmaman\b',
    'grand_parent': r'\bgrand[s]?[\s-]?(père|mère|parent|maman|papa|mamie|papi|papy)\b|\bmamie\b|\bpapi\b|\bpapy\b',
    'couple': r'\bcouple\b|\bmari\b|\bfemme\b.*\bmari\b',
    'bebe': r'\bbébé\b|\bbebe\b|\bnouveau[\s-]?né\b|\bnaissance\b',
}

EN_MODIFIERS = {
    'personalized': r'personalized|custom|customized',
    'unique': r'unique|unusual|creative|original',
    'budget': r'cheap|budget|affordable|inexpensive|under\s+\$?\d+',
    'funny': r'funny|humorous|humor|gag|joke',
    'diy': r'diy|handmade|homemade',
    'last_minute': r'last\s+minute',
    'best': r'best|top|great|good|idea',
    'luxury': r'luxury|premium|high[\s-]end',
}

EN_TARGETS = {
    'men': r'\bmen\b|\bmale\b|\bhim\b|\bhusband\b|\bboyfriend\b|\bdad\b|\bfather\b|\bgrandpa\b|\bgrandfather\b',
    'women': r'\bwomen\b|\bfemale\b|\bher\b|\bwife\b|\bgirlfriend\b|\bmom\b|\bmother\b|\bgrandma\b|\bgrandmother\b',
    'coworker': r'\bcoworker\b|\bcolleague\b|\bco[\s-]?worker\b',
    'boss': r'\bboss\b|\bmanager\b|\bsupervisor\b',
    'friend': r'\bfriend\b|\bbff\b|\bbestie\b',
    'parent': r'\bparent[s]?\b|\bmom\s+and\s+dad\b|\bin[\s-]?law\b',
    'pet': r'\bdog\b|\bcat\b|\bpet\b|\bpuppy\b|\bkitten\b|\bfur\s+baby\b',
    'baby': r'\bbaby\b|\bnewborn\b|\bnew\s+mom\b|\bnew\s+dad\b',
}

def extract_components(keyword: str, market: str = 'fr') -> dict:
    """Extract modifier, target person, and base intent from a keyword."""
    kw_normalized = normalize_for_matching(keyword)
    
    modifiers = FR_MODIFIERS if market == 'fr' else EN_MODIFIERS
    targets = FR_TARGETS if market == 'fr' else EN_TARGETS
    
    found_modifiers = []
    for mod_name, pattern in modifiers.items():
        if re.search(pattern, kw_normalized):
            found_modifiers.append(mod_name)
    
    found_target = None
    for target_name, pattern in targets.items():
        if re.search(pattern, kw_normalized):
            found_target = target_name
            break  # First match wins (patterns ordered by specificity)
    
    # Build grouping key: cluster + target (modifiers are extracted, not grouped)
    base = remove_fillers(kw_normalized, market)
    
    return {
        'original': keyword,
        'normalized': kw_normalized,
        'base': base,
        'modifiers': found_modifiers,
        'target': found_target,
    }

# ============================================================
# Step 4: Group keywords into topics
# ============================================================
def build_grouping_key(components: dict, cluster: str) -> str:
    """
    Create a grouping key that determines which topic a keyword belongs to.
    
    Key structure: cluster::target::modifier (if modifier is a spoke-worthy one)
    
    Keywords with same grouping key → same topic.
    """
    target = components['target'] or 'generic'
    
    # Only spoke-worthy modifiers create separate groups
    spoke_modifiers = {'personnalise', 'personalized', 'original', 'unique', 
                       'pas_cher', 'budget', 'humour', 'funny', 
                       'fait_main', 'diy', 'derniere_minute', 'last_minute',
                       'luxe', 'luxury'}
    
    active_spoke_mod = None
    for mod in components['modifiers']:
        if mod in spoke_modifiers:
            active_spoke_mod = mod
            break  # First spoke-worthy modifier wins
    
    if active_spoke_mod:
        return f"{cluster}::{target}::{active_spoke_mod}"
    else:
        return f"{cluster}::{target}::base"
```

---

## 9. Cluster Correction Rules

### Known Misassignments

| Pattern | Current Cluster | Correct Cluster |
|---------|----------------|-----------------|
| mamie, mamies, papi, papy | gift_other | gift_grandparents |
| grands-mères, grand-mère | gift_other | gift_grandparents |
| communion, baptême, confirmation | gift_other | gift_celebration_fr |
| pot de départ | gift_other | gift_retirement |
| bébé, naissance, nouveau-né | gift_other | life_events |
| chien, chat, animal (memorial context) | gift_other | gift_pet_memorial |

### Correction Python

```python
cluster_corrections = {
    # gift_other → gift_grandparents
    r'mamie|papi|papy|grand[\s-]?(m[eè]re|p[eè]re|parent|maman|papa)': 
        ('gift_other', 'gift_grandparents'),
    
    # gift_other → gift_celebration_fr
    r'communion|bapt[eê]me|confirmation': 
        ('gift_other', 'gift_celebration_fr'),
    
    # gift_other → gift_retirement
    r'pot\s+de\s+d[eé]part|d[eé]part.*retraite|retraite': 
        ('gift_other', 'gift_retirement'),
    
    # gift_other → life_events
    r'b[eé]b[eé]|naissance|nouveau[\s-]?n[eé]|enceinte|grossesse': 
        ('gift_other', 'life_events'),
    
    # gift_other → gift_pet_memorial (new cluster)
    r'(chien|chat|animal|compagnon).*m[eé]morial|(m[eé]morial|hommage|souvenir).*(chien|chat|animal)':
        ('gift_other', 'gift_pet_memorial'),
}

def apply_corrections(keyword: str, current_cluster: str) -> str | None:
    """Returns corrected cluster or None if no correction needed."""
    kw = keyword.lower()
    for pattern, (from_cluster, to_cluster) in cluster_corrections.items():
        if current_cluster == from_cluster and re.search(pattern, kw):
            return to_cluster
    return None
```

---

## 10. Content Topics Table: New Fields Needed

The current `content_topics` table lacks a **role** field to distinguish pillars from spokes. Recommended additions:

```sql
ALTER TABLE content_topics ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'spoke';
-- Values: 'pillar', 'spoke', 'standalone'

ALTER TABLE content_topics ADD COLUMN IF NOT EXISTS parent_topic_id UUID REFERENCES content_topics(id);
-- Links spokes to their pillar

ALTER TABLE content_topics ADD COLUMN IF NOT EXISTS cluster TEXT;
-- Links topic to its keyword cluster
```

This enables:
- Querying all spokes for a pillar
- Verifying each pillar has enough spokes
- Tracking which clusters have been covered

---

## 11. Summary: P1 Topic Counts

| Cluster | Market | Pillar | Spokes | Total Articles | Keywords Absorbed |
|---------|--------|--------|--------|----------------|-------------------|
| gift_retirement | FR | 1 | 6 | 7 | ~200+ |
| gift_retirement | EN | 1 | 4 | 5 | ~40+ |
| gift_memorial | EN | 1 | 6 | 7 | ~350+ |
| gift_memorial | FR | 1 | 1 | 2 | ~2 (needs GKP expansion) |
| direct_service | FR | 1 | 4 | 5 | ~50+ |
| direct_service | EN | 1 | 4 | 5 | ~300+ |
| **TOTAL** | | **6** | **25** | **31** | **~1,000+** |

31 articles to write for P1. Each absorbs dozens of keyword variants. This is the right level of granularity — not 1,000 thin pages, not 3 generic pages.

---

## 12. Next Steps

1. **Add `role`, `parent_topic_id`, `cluster` columns** to content_topics table
2. **Run normalization + grouping script** on P1 keywords to validate grouping accuracy
3. **Create the 31 topic records** in content_topics with proper pillar/spoke relationships
4. **Expand FR gift_memorial keywords** via GKP round with deuil/hommage/condoléance seeds
5. **Repeat for P2 clusters** (gift_personalized, vhs_legacy)

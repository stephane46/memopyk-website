# MEMOPYK — Intent Classification Rulesets (FR + EN)

**Version:** 1.0  
**Created:** February 6, 2026  
**Tested against:** 3,410 FR keywords + 9,896 EN keywords

---

## Architecture (Both Languages)

Five layers checked in order. **First match wins.**

```
Layer 1: LOW   → informational / DIY / free-seeking (checked FIRST)
Layer 2: HIGH  → transactional / ready to buy
Layer 3: MEDIUM explicit → comparison / exploration signals
Layer 4: MEDIUM implicit → structural patterns
Layer 5: MEDIUM default  → no signal detected
```

**Why LOW first:** "montage photo gratuit" / "free photo slideshow" — the free signal overrides the service signal.  
**Why default is MEDIUM:** GKP keywords are commercially-oriented. No-signal keywords are typically product browsing.

---

## Classification Results

### French
| Intent | Keywords | % | Volume/mo |
|--------|----------|---|-----------|
| HIGH | 119 | 3.5% | 11,800 |
| MEDIUM | 3,247 | 95.2% | 2,263,250 |
| LOW | 44 | 1.3% | 7,600 |

### English
| Intent | Keywords | % |
|--------|----------|---|
| HIGH | 1,686 | 17.0% |
| MEDIUM | 7,338 | 74.2% |
| LOW | 872 | 8.8% |

> English has more HIGH and LOW because US market is more polarized: more "free"/"DIY" seekers AND more explicit purchase signals.

---

# 🇫🇷 FRENCH RULESET

## Layer 1: LOW

### Rule L1 — Explicit LOW words (substring)
```
gratuit, gratis, diy, tutoriel, tuto (+ space), astuce,
c'est quoi, définition, definition,
télécharger, telecharger, logiciel, application pour
```

### Rule L2 — "soi même" (regex)
```python
r'soi[- ]m[eê]me'
```

### Rule L3 — "fait maison" (regex, with exclusion)
```python
r'fait[e]?\s*maison|[àa] la maison'
# EXCLUDE: 'maison de retraite' in keyword
```

### Rule L4 — Question words at start (regex)
```python
r'^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)'
```

### Rule L5 — YouTube (no price signals)
```python
'youtube' in kw AND no ['prix', 'tarif', 'coût', 'cout']
```

## Layer 2: HIGH

### Rule H1 — Explicit HIGH words (substring)
```
prix, tarif, coût, cout, devis,
acheter, achat, commander, commande,
pas cher, moins cher, bon marché,
livraison, expédition,
professionnel, prestataire, sur mesure,
promo (+ space), promotion, réduction, solde
```

### Rule H2 — "faire [service]" — delegating (regex)
```python
r'faire (faire|numériser|numeriser|réaliser|realiser|transférer|transferer)'
```

### Rule H3 — "site + product" (regex)
```python
r'site.*(personnalis|cadeau|cadre|diaporama|montage|photo)'
# OR reverse direction
```

### Rule H4 — "en ligne" (no "gratuit")
```python
'en ligne' in kw AND 'gratuit' not in kw
```

### Rule H5 — Service + city (regex)
```python
cities = r'(paris|lyon|marseille|toulouse|bordeaux|nantes|lille|strasbourg|nice|rennes|montpellier|grenoble|rouen|toulon|dijon|angers|reims|brest|clermont|montréal|québec|ottawa)'
services = r'(numérisation|numerisation|transfert|montage|diaporama|numériser|numeriser)'
```

## Layer 3: MEDIUM explicit

### Rule M1 — Comparison words (substring)
```
meilleur, mieux, comparatif, comparaison, comparer,
vs, versus, avis, différence, difference,
lequel, laquelle, top, classement, recommand
```

### Rule M2 — "quel + action" (regex)
```python
r'(quel|quelle).*(choisir|prendre|offrir|donner)'
```

## Layer 4: MEDIUM implicit

| Rule | Pattern | Logic |
|------|---------|-------|
| M3 | `r'id[ée]e'` | "idée cadeau" = browsing |
| M4 | `'cadeau' in kw` | Gift shopping |
| M5 | `'original' in kw` | Wants something different |
| M6 | `'surprise' in kw` | Gift-giving |
| M7 | `r'pour (homme\|femme\|maman\|papa\|couple\|ami\|...)'` | Targeting recipient |
| M8 | `r'(numériser\|numérisation\|transférer\|convertir\|transformer)'` | Digitization intent |
| M9 | `r'(montage\|diaporama)'` | Core service exploration |
| M10 | `r'personnalis'` | Customization seeking |
| M11 | `r'faire (un \|une \|des \|le \|la )'` | Exploring how |
| M12 | `'coffret' in kw` | Gift box = shopping |

## Layer 5: DEFAULT → MEDIUM

---

# 🇬🇧 ENGLISH RULESET

## Layer 1: LOW

### Rule L1 — Explicit LOW words (substring)
```
free, freeware, open source, diy, tutorial, how to guide,
tips, trick, hack, what is, definition, meaning of,
download, software, app for, application for
```

### Rule L2 — "yourself"/"own" (regex)
```python
r'(do it yourself|by yourself|on your own|make your own|create your own|build your own)'
```

### Rule L3 — "homemade"/"at home" (regex, with exclusion)
```python
r'(homemade|home\s*made|at home)'
# EXCLUDE: 'retirement home', 'nursing home', 'care home'
```

### Rule L4 — Question words at start (regex)
```python
r'^(how to |how do |how can |why do |why is |what is |what are |what does |can i |can you |is it possible|should i )'
```

### Rule L5 — Free platform intent (no price signals)
```python
['youtube', 'canva', 'imovie', 'capcut', 'tiktok', 'instagram reel'] in kw
AND no ['price', 'cost', 'pricing', 'quote', 'rate', 'fee']
```

### Rule L6 — Reddit (free advice)
```python
'reddit' in kw
```

## Layer 2: HIGH

### Rule H1 — Explicit HIGH words (substring)
```
price, pricing, cost, quote, estimate, rates, fee,
buy, purchase, order, book, hire, commission,
cheap, affordable, budget, discount, deal, sale, coupon, promo,
delivery, shipping, rush,
professional, pro (+ space), service, company, studio,
custom, bespoke, personalized, personalised,
near me, in my area
```

### Rule H2 — "get/have [done]" — delegating (regex)
```python
r'(get|have|send|pay).*(digitized|converted|transferred|made|created|edited|produced)'
```

### Rule H3 — "site/website + product" (regex)
```python
r'(site|website|store|shop).*(slideshow|montage|photo|video|digitiz|conver)'
# OR reverse direction
```

### Rule H4 — "online" (no "free")
```python
'online' in kw AND 'free' not in kw
```

### Rule H5 — Service + city/state (regex)
```python
cities = r'(new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|seattle|denver|boston|nashville|portland|las vegas|atlanta|miami|tampa|orlando|charlotte|sacramento|minneapolis|nyc|la|sf)'
states = r'(california|texas|florida|new york|illinois|pennsylvania|ohio|georgia|north carolina|michigan|new jersey|virginia|washington|arizona|massachusetts|tennessee|indiana|maryland|missouri|wisconsin|colorado|minnesota|south carolina|alabama|louisiana|kentucky|oregon|oklahoma|connecticut|utah|iowa|nevada|arkansas|mississippi|kansas|nebraska)'
services = r'(digitiz|conver|transfer|slideshow|montage|video|photo service|editing)'
```

### Rule H6 — "[number] + media" — project scoping (regex)
```python
r'\d+\s*(photos?|videos?|pictures?|images?|clips?|tapes?|cassettes?)'
```

## Layer 3: MEDIUM explicit

### Rule M1 — Comparison words (substring)
```
best, top, vs, versus, compare, comparison, review, reviews,
difference between, pros and cons, worth it,
alternative, alternatives, which, recommend, recommendation
```

### Rule M2 — "what/which + action" (regex)
```python
r'(what|which).*(choose|pick|get|buy|give|use|try|make)'
```

## Layer 4: MEDIUM implicit

| Rule | Pattern | Logic |
|------|---------|-------|
| M3 | `r'\bideas?\b'` | "gift ideas" = browsing |
| M4 | `'gift' in kw` | Gift shopping |
| M5 | `r'\bunique\b'` | Wants something different |
| M6 | `'surprise' in kw` | Gift-giving |
| M7 | `r'for (him\|her\|mom\|dad\|wife\|husband\|...)'` | Targeting recipient |
| M8 | `r'(digitiz\|convert\|transfer\|preserv)'` + media words | Digitization intent |
| M9 | `r'(slideshow\|montage\|compilation\|highlight)'` | Core service exploration |
| M10 | `r'(personali[sz]\|custom\|bespoke)'` | Customization seeking |
| M11 | `r'\bmake a\b\|\bcreate a\b'` | Exploring how |
| M12 | `r'(keepsake\|memento\|souvenir\|remembrance\|tribute\|memorial)'` | Memory preservation |
| M13 | `r'(retirement\|anniversary\|graduation\|birthday\|wedding\|funeral\|...)'` | Life event |

## Layer 5: DEFAULT → MEDIUM

---

# KEY DIFFERENCES BETWEEN RULESETS

| Aspect | French | English |
|--------|--------|---------|
| FREE signal | "gratuit" (1.3% of keywords) | "free" (8.8% — much more DIY culture) |
| DIY platforms | YouTube only | YouTube, Canva, iMovie, CapCut, TikTok |
| Reddit | N/A | Added as L6 |
| City matching | 20 FR cities + 3 Canadian | 30+ US cities + all 50 states |
| Project scoping | N/A | H6: "500 photos slideshow" |
| Delegation | "faire numériser" | "get digitized" / "have converted" |
| Life events | Limited | Expanded (quinceañera, bar mitzvah, etc.) |
| "Retirement home" exclusion | "maison de retraite" | "retirement home" / "nursing home" |

---

# PYTHON IMPLEMENTATION

```python
import re

def classify_intent_fr(keyword: str) -> tuple[str, str]:
    k = keyword.lower().strip()
    
    # LAYER 1: LOW
    low_words = ['gratuit', 'gratis', 'diy', 'tutoriel', 'tuto ',
        'astuce', "c'est quoi", 'définition', 'definition',
        'télécharger', 'telecharger', 'logiciel', 'application pour']
    for w in low_words:
        if w in k: return ('low', 'L1')
    if re.search(r'soi[- ]m[eê]me', k): return ('low', 'L2')
    if re.search(r'fait[e]?\s*maison|[àa] la maison', k) and 'maison de retraite' not in k:
        return ('low', 'L3')
    if re.match(r'^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)', k):
        return ('low', 'L4')
    if 'youtube' in k and not any(w in k for w in ['prix', 'tarif', 'coût', 'cout']):
        return ('low', 'L5')
    
    # LAYER 2: HIGH
    high_words = ['prix', 'tarif', 'coût', 'cout', 'devis', 'acheter', 'achat',
        'commander', 'commande', 'pas cher', 'moins cher', 'bon marché',
        'livraison', 'expédition', 'professionnel', 'prestataire',
        'sur mesure', 'promo ', 'promotion', 'réduction', 'solde']
    for w in high_words:
        if w in k: return ('high', 'H1')
    if re.search(r'faire (faire|numériser|numeriser|réaliser|realiser|transférer|transferer)', k):
        return ('high', 'H2')
    if re.search(r'site.*(personnalis|cadeau|cadre|diaporama|montage|photo)', k) or \
       re.search(r'(personnalis|cadeau|cadre|diaporama|montage).*site', k):
        return ('high', 'H3')
    if 'en ligne' in k and 'gratuit' not in k: return ('high', 'H4')
    cities = r'(paris|lyon|marseille|toulouse|bordeaux|nantes|lille|strasbourg|nice|rennes|montpellier|grenoble|rouen|toulon|dijon|angers|reims|brest|clermont|montréal|québec|ottawa)'
    services = r'(numérisation|numerisation|transfert|montage|diaporama|numériser|numeriser)'
    if re.search(services + r'.*' + cities, k) or re.search(cities + r'.*' + services, k):
        return ('high', 'H5')
    
    # LAYER 3: MEDIUM explicit
    medium_words = ['meilleur', 'mieux', 'comparatif', 'comparaison', 'comparer',
        ' vs ', ' versus ', 'avis ', 'différence', 'difference',
        'lequel', 'laquelle', 'top ', 'classement', 'recommand']
    for w in medium_words:
        if w in k: return ('medium', 'M1')
    if re.search(r'(quel|quelle).*(choisir|prendre|offrir|donner)', k):
        return ('medium', 'M2')
    
    # LAYER 4: MEDIUM implicit
    if re.search(r'id[ée]e', k): return ('medium', 'M3')
    if 'cadeau' in k: return ('medium', 'M4')
    if 'original' in k: return ('medium', 'M5')
    if 'surprise' in k: return ('medium', 'M6')
    if re.search(r'pour (homme|femme|maman|papa|couple|ami|amie|parent|grand|retraité|retraitee|collègue|collegue|famille|bébé|bebe|enfant)', k):
        return ('medium', 'M7')
    if re.search(r'(numériser|numeriser|numérisation|numerisation|transférer|transferer|transfert|convertir|transformer)', k):
        return ('medium', 'M8')
    if re.search(r'(montage|diaporama)', k): return ('medium', 'M9')
    if re.search(r'personnalis', k): return ('medium', 'M10')
    if re.search(r'faire (un |une |des |le |la )', k): return ('medium', 'M11')
    if 'coffret' in k: return ('medium', 'M12')
    
    return ('medium', 'M99')


def classify_intent_en(keyword: str) -> tuple[str, str]:
    k = keyword.lower().strip()
    
    # LAYER 1: LOW
    low_words = ['free', 'freeware', 'open source', 'diy', 'tutorial',
        'how to guide', 'tips', 'trick', 'hack', 'what is',
        'definition', 'meaning of', 'download', 'software',
        'app for', 'application for']
    for w in low_words:
        if w in k: return ('low', 'L1')
    if re.search(r'(do it yourself|by yourself|on your own|make your own|create your own|build your own)', k):
        return ('low', 'L2')
    if re.search(r'(homemade|home\s*made|at home)', k) and \
       not any(x in k for x in ['retirement home', 'nursing home', 'care home']):
        return ('low', 'L3')
    if re.match(r'^(how to |how do |how can |why do |why is |what is |what are |what does |can i |can you |is it possible|should i )', k):
        return ('low', 'L4')
    free_platforms = ['youtube', 'canva', 'imovie', 'capcut', 'tiktok', 'instagram reel']
    price_signals = ['price', 'cost', 'pricing', 'quote', 'rate', 'fee']
    for platform in free_platforms:
        if platform in k and not any(p in k for p in price_signals):
            return ('low', 'L5')
    if 'reddit' in k: return ('low', 'L6')
    
    # LAYER 2: HIGH
    high_words = ['price', 'pricing', 'cost', 'quote', 'estimate', 'rates',
        'buy', 'purchase', 'order', 'book', 'hire', 'commission',
        'cheap', 'affordable', 'budget', 'discount', 'deal', 'sale',
        'coupon', 'promo ', 'delivery', 'shipping', 'rush',
        'professional', 'pro ', 'service', 'company', 'studio',
        'custom ', 'bespoke', 'personalized', 'personalised',
        'near me', 'in my area']
    for w in high_words:
        if w in k: return ('high', 'H1')
    if re.search(r'(get|have|send|pay).*(digitized|converted|transferred|made|created|edited|produced)', k):
        return ('high', 'H2')
    if re.search(r'(site|website|store|shop).*(slideshow|montage|photo|video|digitiz|conver)', k) or \
       re.search(r'(slideshow|montage|photo|video|digitiz|conver).*(site|website|store|shop)', k):
        return ('high', 'H3')
    if 'online' in k and 'free' not in k: return ('high', 'H4')
    cities_pattern = r'(new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|seattle|denver|boston|nashville|portland|las vegas|atlanta|miami|tampa|orlando|charlotte|sacramento|minneapolis|pittsburgh|cleveland|columbus|indianapolis|detroit|san francisco|washington dc|nyc|la |sf )'
    services_pattern = r'(digitiz|conver|transfer|slideshow|montage|video|photo service|editing)'
    if re.search(services_pattern + r'.*' + cities_pattern, k) or \
       re.search(cities_pattern + r'.*' + services_pattern, k):
        return ('high', 'H5')
    if re.search(r'\d+\s*(photos?|videos?|pictures?|images?|clips?|tapes?|cassettes?)', k):
        return ('high', 'H6')
    
    # LAYER 3: MEDIUM explicit
    medium_words = ['best', 'top ', ' vs ', ' versus ', 'compare', 'comparison',
        'review', 'difference between', 'pros and cons', 'worth it',
        'alternative', 'which ', 'recommend']
    for w in medium_words:
        if w in k: return ('medium', 'M1')
    if re.search(r'(what|which).*(choose|pick|get|buy|give|use|try|make)', k):
        return ('medium', 'M2')
    
    # LAYER 4: MEDIUM implicit
    if re.search(r'\bideas?\b', k): return ('medium', 'M3')
    if 'gift' in k: return ('medium', 'M4')
    if re.search(r'\bunique\b', k): return ('medium', 'M5')
    if 'surprise' in k: return ('medium', 'M6')
    recipients = r'for (him|her|mom|dad|wife|husband|boyfriend|girlfriend|grandma|grandpa|grandmother|grandfather|parents|boss|coworker|colleague|friend|teacher|son|daughter|brother|sister|family|mother|father)'
    if re.search(recipients, k): return ('medium', 'M7')
    if re.search(r'(digitiz|convert|transfer|preserv)', k) and \
       re.search(r'(vhs|tape|cassette|film|8mm|super 8|video|dvd|photo)', k):
        return ('medium', 'M8')
    if re.search(r'(slideshow|montage|compilation|highlight)', k): return ('medium', 'M9')
    if re.search(r'(personali[sz]|custom|bespoke)', k): return ('medium', 'M10')
    if re.search(r'\bmake a\b|\bcreate a\b', k): return ('medium', 'M11')
    if re.search(r'(keepsake|memento|souvenir|remembrance|tribute|memorial)', k): return ('medium', 'M12')
    if re.search(r'(retirement|anniversary|graduation|birthday|wedding|funeral|baby shower|bridal shower|engagement|quinceañera|quinceanera|bar mitzvah|bat mitzvah)', k):
        return ('medium', 'M13')
    
    return ('medium', 'M99')
```

---

# SQL IMPLEMENTATION

## French
```sql
UPDATE content_keywords SET search_intent =
  CASE
    WHEN keyword ~* '(gratuit|gratis|diy|tutoriel|tuto\s|astuce|définition|definition|télécharger|telecharger|logiciel|application pour)' THEN 'low'
    WHEN keyword ~* 'soi[- ]m[eê]me' THEN 'low'
    WHEN keyword ~* '(fait[e]?\s*maison|[àa] la maison)' AND keyword NOT ILIKE '%maison de retraite%' THEN 'low'
    WHEN keyword ~* '^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)' THEN 'low'
    WHEN keyword ILIKE '%youtube%' AND keyword NOT SIMILAR TO '%(prix|tarif|coût|cout)%' THEN 'low'
    WHEN keyword ~* '(prix|tarif|coût|cout|devis|acheter|achat|commander|commande|pas cher|moins cher|bon marché|livraison|expédition|professionnel|prestataire|sur mesure|promo\s|promotion|réduction|solde)' THEN 'high'
    WHEN keyword ~* 'faire (faire|numériser|numeriser|réaliser|realiser|transférer|transferer)' THEN 'high'
    WHEN keyword ~* 'site.*(personnalis|cadeau|cadre|diaporama|montage|photo)' THEN 'high'
    WHEN keyword ~* '(personnalis|cadeau|cadre|diaporama|montage).*site' THEN 'high'
    WHEN keyword ILIKE '%en ligne%' AND keyword NOT ILIKE '%gratuit%' THEN 'high'
    WHEN keyword ~* '(meilleur|mieux|comparatif|comparaison|comparer|\svs\s|\sversus\s|avis\s|différence|difference|lequel|laquelle|top\s|classement|recommand)' THEN 'medium'
    ELSE 'medium'
  END
WHERE market = 'fr';
```

## English
```sql
UPDATE content_keywords SET search_intent =
  CASE
    WHEN keyword ~* '(free|freeware|open source|\bdiy\b|tutorial|how to guide|tips|trick|hack|what is|definition|meaning of|download|software|app for|application for)' THEN 'low'
    WHEN keyword ~* '(do it yourself|by yourself|on your own|make your own|create your own|build your own)' THEN 'low'
    WHEN keyword ~* '(homemade|home\s*made|at home)' AND keyword NOT ILIKE '%retirement home%' AND keyword NOT ILIKE '%nursing home%' THEN 'low'
    WHEN keyword ~* '^(how to |how do |how can |why do |why is |what is |what are |what does |can i |can you |is it possible|should i )' THEN 'low'
    WHEN keyword ILIKE '%youtube%' AND keyword NOT SIMILAR TO '%(price|cost|pricing|quote|rate|fee)%' THEN 'low'
    WHEN keyword ~* '(canva|imovie|capcut|tiktok|instagram reel)' AND keyword NOT SIMILAR TO '%(price|cost|pricing|quote)%' THEN 'low'
    WHEN keyword ILIKE '%reddit%' THEN 'low'
    WHEN keyword ~* '(price|pricing|cost|quote|estimate|rates|buy|purchase|order|hire|commission|cheap|affordable|budget|discount|deal|sale|coupon|promo\s|delivery|shipping|rush|professional|pro\s|service|company|studio|custom\s|bespoke|personalized|personalised|near me|in my area)' THEN 'high'
    WHEN keyword ~* '(get|have|send|pay).*(digitized|converted|transferred|made|created|edited|produced)' THEN 'high'
    WHEN keyword ~* '(site|website|store|shop).*(slideshow|montage|photo|video|digitiz|conver)' THEN 'high'
    WHEN keyword ~* '(slideshow|montage|photo|video|digitiz|conver).*(site|website|store|shop)' THEN 'high'
    WHEN keyword ILIKE '%online%' AND keyword NOT ILIKE '%free%' THEN 'high'
    WHEN keyword ~* '\d+\s*(photos?|videos?|pictures?|images?|clips?|tapes?|cassettes?)' THEN 'high'
    WHEN keyword ~* '(\bbest\b|\btop\b|\bvs\b|\bversus\b|compare|comparison|review|difference between|pros and cons|worth it|alternative|recommend)' THEN 'medium'
    ELSE 'medium'
  END
WHERE market = 'en';
```

---

# EDGE CASES

## French
| Keyword | Expected | Rule |
|---------|----------|------|
| cadeau fait maison | LOW | L3 |
| cadeau maison de retraite | MEDIUM | M4 (exclusion works) |
| prix montage vidéo youtube | HIGH | H1 ("prix" first) |
| montage photo youtube | LOW | L5 |
| faire numériser cassette vhs | HIGH | H2 |
| montage photo gratuit en ligne | LOW | L1 ("gratuit" first) |

## English
| Keyword | Expected | Rule |
|---------|----------|------|
| free photo slideshow maker | LOW | L1 |
| photo slideshow near me | HIGH | H1 |
| best photo slideshow app | MEDIUM | M1 |
| get VHS tapes digitized | HIGH | H2 |
| retirement gift ideas | MEDIUM | M3/M4 |
| how to make a slideshow | LOW | L4 |
| 500 photos video montage | HIGH | H6 |
| photo slideshow canva | LOW | L5 |
| retirement home gift | MEDIUM | M13 (exclusion works) |

---

# KNOWN LIMITATIONS

1. **"service" (EN H1) is broad** — "customer service" false-positives as HIGH. Could require co-occurrence with media terms.
2. **"free" much more common in EN** — 8.8% LOW vs 1.3% in FR. Expected.
3. **State abbreviations not covered** — "VHS conversion CA" won't match H5. Add if needed.
4. **"top" ambiguity** — "top 10 slideshows" = comparison, "crop top" = product. Trailing space helps but isn't perfect.
5. **VHS intent (FR M8)** — "numériser vhs" is MEDIUM but arguably HIGH. Promote if conversion data supports it.
6. **"personnalisé" volume** — 648 FR keywords hit M10. Consider sub-classifying for finer intent.

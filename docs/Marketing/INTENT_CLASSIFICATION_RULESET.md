# MEMOPYK — French Keyword Search Intent Classification Ruleset

**Version:** 1.0  
**Created:** February 6, 2026  
**Tested against:** 3,410 keywords from Google Keyword Planner (France/French)

---

## Classification Results

| Intent | Keywords | % | Volume/mo |
|--------|----------|---|-----------|
| **HIGH** | 119 | 3.5% | 11,800 |
| **MEDIUM** | 3,247 | 95.2% | 2,263,250 |
| **LOW** | 44 | 1.3% | 7,600 |

> 95% MEDIUM is expected. GKP is an advertising tool — it skews commercial. Informational queries like "comment organiser ses photos" are underrepresented. A GSC or Semrush dataset would show more LOW intent keywords.

---

## How It Works

Five layers checked in order. **First match wins.**

```
Layer 1: LOW   → informational / DIY / free-seeking (checked FIRST — overrides all)
Layer 2: HIGH  → transactional / ready to buy
Layer 3: MEDIUM explicit → comparison / exploration signals
Layer 4: MEDIUM implicit → structural patterns in keyword
Layer 5: MEDIUM default  → no signal detected
```

**Why LOW first:** "montage photo gratuit" — the "gratuit" overrides the "montage" service signal. They're not buying.  
**Why default is MEDIUM:** GKP keywords are commercially-oriented. No-signal keywords are typically product browsing ("porte clé photo", "cadre photo famille").

---

## Layer 1: LOW INTENT — Informational / DIY / Free-seeking

User wants to **learn**, **do it themselves**, or **find free tools**.

### Rule L1 — Explicit LOW words (substring match)
```
gratuit, gratis, diy, tutoriel, tuto (+ space), astuce,
c'est quoi, définition, definition,
télécharger, telecharger, logiciel, application pour
```

### Rule L2 — "soi même" pattern (regex)
```python
r'soi[- ]m[eê]me'
```
Catches: `soi même`, `soi-même`, `soi meme`

### Rule L3 — "fait maison" (regex, with exclusion)
```python
r'fait[e]?\s*maison|[àa] la maison'
# BUT only if 'maison de retraite' NOT in keyword
```
- ✅ "cadeau fait maison" → LOW
- ✅ "cadeau maison de retraite" → falls through to MEDIUM (Layer 4, "cadeau")

### Rule L4 — Question words at start (regex)
```python
r'^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)'
```

### Rule L5 — YouTube (free content intent)
```python
'youtube' in keyword AND no price signals (prix, tarif, coût, cout)
```
- ✅ "montage photo avec musique youtube" → LOW
- ✅ "prix montage vidéo youtube" → falls through to HIGH (Layer 2, "prix")

---

## Layer 2: HIGH INTENT — Transactional / Ready to buy

User is **ready to spend money** or **comparing prices to purchase**.

### Rule H1 — Explicit HIGH words (substring match)
```
prix, tarif, coût, cout, devis,
acheter, achat, commander, commande,
pas cher, moins cher, bon marché,
livraison, expédition,
professionnel, prestataire, sur mesure,
promo (+ space), promotion, réduction, solde
```

### Rule H2 — "faire [service verb]" — delegating to a pro (regex)
```python
r'faire (faire|numériser|numeriser|réaliser|realiser|transférer|transferer)'
```
- ✅ "faire numériser cassette vhs" → HIGH (wants someone else to do it)
- ✅ "faire un diaporama" → NOT matched here (falls to Layer 4 "faire un/une")

### Rule H3 — "site + product" — vendor search (regex)
```python
r'site.*(personnalis|cadeau|cadre|diaporama|montage|photo)'
r'(personnalis|cadeau|cadre|diaporama|montage).*site'
```
- ✅ "site cadre photo personnalisé" → HIGH

### Rule H4 — "en ligne" — online purchase
```python
'en ligne' in keyword AND 'gratuit' not in keyword
```
- ✅ "diaporama anniversaire en ligne" → HIGH
- ✅ "montage photo gratuit en ligne" → already caught as LOW by L1

### Rule H5 — Service + city — local provider search (regex)
```python
cities = r'(paris|lyon|marseille|toulouse|bordeaux|nantes|lille|strasbourg|nice|rennes|montpellier|grenoble|rouen|toulon|dijon|angers|reims|brest|clermont|montréal|québec|ottawa)'
services = r'(numérisation|numerisation|transfert|montage|diaporama|numériser|numeriser)'
# Match both directions
```

---

## Layer 3: MEDIUM INTENT — Explicit comparison/exploration

User is **actively comparing options** or **seeking the best choice**.

### Rule M1 — Explicit comparison words (substring match)
```
meilleur, mieux,
comparatif, comparaison, comparer,
vs (with spaces), versus (with spaces),
avis (+ space),
différence, difference,
lequel, laquelle,
top (+ space), classement, recommand
```

### Rule M2 — "quel + action verb" (regex)
```python
r'(quel|quelle).*(choisir|prendre|offrir|donner)'
```

---

## Layer 4: MEDIUM INTENT — Implicit structural patterns

No explicit signals, but **keyword structure implies active exploration**. Checked in this order:

| Rule | Pattern | Hits | Logic |
|------|---------|------|-------|
| **M3** | `r'id[ée]e'` | 492 | "idée cadeau" = inspiration browsing |
| **M4** | `'cadeau' in kw` | 1,055 | Gift shopping intent |
| **M5** | `'original' in kw` | 29 | Wants something different |
| **M6** | `'surprise' in kw` | 11 | Gift-giving intent |
| **M7** | `r'pour (homme\|femme\|maman\|papa\|couple\|ami\|...)'` | 3 | Targeting a recipient |
| **M8** | `r'(numériser\|numeriser\|numérisation\|...\|convertir\|transformer)'` | 420 | Digitization = wants service done |
| **M9** | `r'(montage\|diaporama)'` | 73 | Core service exploration |
| **M10** | `r'personnalis'` | 648 | Customization seeking |
| **M11** | `r'faire (un \|une \|des \|le \|la )'` | 9 | "faire un diaporama" = exploring how |
| **M12** | `'coffret' in kw` | 2 | Gift box = shopping |

---

## Layer 5: DEFAULT → MEDIUM

**491 keywords** reach this layer. Mostly physical product queries without signal words:
- "porte clé photo", "cadre photo famille", "noce de froment", "tee shirt avec photo"

MEDIUM is correct for a GKP-sourced dataset.

---

## Python Implementation

```python
import re

def classify_intent(keyword: str) -> tuple[str, str]:
    """
    Classify French keyword search intent.
    Returns (intent, rule_id) where intent is 'high', 'medium', or 'low'.
    """
    k = keyword.lower().strip()
    
    # === LAYER 1: LOW ===
    low_words = ['gratuit', 'gratis', 'diy', 'tutoriel', 'tuto ',
        'astuce', "c'est quoi", 'définition', 'definition',
        'télécharger', 'telecharger', 'logiciel', 'application pour']
    for w in low_words:
        if w in k: return ('low', 'L1')
    if re.search(r'soi[- ]m[eê]me', k):
        return ('low', 'L2')
    if re.search(r'fait[e]?\s*maison|[àa] la maison', k) and 'maison de retraite' not in k:
        return ('low', 'L3')
    if re.match(r'^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)', k):
        return ('low', 'L4')
    if 'youtube' in k and not any(w in k for w in ['prix', 'tarif', 'coût', 'cout']):
        return ('low', 'L5')
    
    # === LAYER 2: HIGH ===
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
    if 'en ligne' in k and 'gratuit' not in k:
        return ('high', 'H4')
    cities = r'(paris|lyon|marseille|toulouse|bordeaux|nantes|lille|strasbourg|nice|rennes|montpellier|grenoble|rouen|toulon|dijon|angers|reims|brest|clermont|montréal|québec|ottawa)'
    services = r'(numérisation|numerisation|transfert|montage|diaporama|numériser|numeriser)'
    if re.search(services + r'.*' + cities, k) or re.search(cities + r'.*' + services, k):
        return ('high', 'H5')
    
    # === LAYER 3: MEDIUM explicit ===
    medium_words = ['meilleur', 'mieux', 'comparatif', 'comparaison', 'comparer',
        ' vs ', ' versus ', 'avis ', 'différence', 'difference',
        'lequel', 'laquelle', 'top ', 'classement', 'recommand']
    for w in medium_words:
        if w in k: return ('medium', 'M1')
    if re.search(r'(quel|quelle).*(choisir|prendre|offrir|donner)', k):
        return ('medium', 'M2')
    
    # === LAYER 4: MEDIUM implicit ===
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
    
    # === LAYER 5: DEFAULT ===
    return ('medium', 'M99')
```

---

## SQL Implementation (for Supabase)

For the `content_keywords` table, add a computed column or run this as an UPDATE after import:

```sql
-- After importing keywords, classify intent:
UPDATE content_keywords SET search_intent = 
  CASE
    -- LAYER 1: LOW
    WHEN keyword ~* '(gratuit|gratis|diy|tutoriel|tuto\s|astuce|définition|definition|télécharger|telecharger|logiciel|application pour)' THEN 'low'
    WHEN keyword ~* 'soi[- ]m[eê]me' THEN 'low'
    WHEN keyword ~* '(fait[e]?\s*maison|[àa] la maison)' AND keyword NOT ILIKE '%maison de retraite%' THEN 'low'
    WHEN keyword ~* '^(comment |pourquoi |qu est |quel est le |quelle est |est[- ]ce que |peut[- ]on |combien de temps)' THEN 'low'
    WHEN keyword ILIKE '%youtube%' AND keyword NOT SIMILAR TO '%(prix|tarif|coût|cout)%' THEN 'low'
    
    -- LAYER 2: HIGH
    WHEN keyword ~* '(prix|tarif|coût|cout|devis|acheter|achat|commander|commande|pas cher|moins cher|bon marché|livraison|expédition|professionnel|prestataire|sur mesure|promo\s|promotion|réduction|solde)' THEN 'high'
    WHEN keyword ~* 'faire (faire|numériser|numeriser|réaliser|realiser|transférer|transferer)' THEN 'high'
    WHEN keyword ~* 'site.*(personnalis|cadeau|cadre|diaporama|montage|photo)' THEN 'high'
    WHEN keyword ~* '(personnalis|cadeau|cadre|diaporama|montage).*site' THEN 'high'
    WHEN keyword ILIKE '%en ligne%' AND keyword NOT ILIKE '%gratuit%' THEN 'high'
    
    -- LAYER 3: MEDIUM explicit
    WHEN keyword ~* '(meilleur|mieux|comparatif|comparaison|comparer|\svs\s|\sversus\s|avis\s|différence|difference|lequel|laquelle|top\s|classement|recommand)' THEN 'medium'
    
    -- LAYER 4+5: MEDIUM implicit + default
    ELSE 'medium'
  END;
```

---

## Edge Cases Verified

| Keyword | Expected | Got | Rule | Notes |
|---------|----------|-----|------|-------|
| cadeau fait maison | LOW | LOW ✅ | L3 | DIY pattern |
| cadeau maison de retraite | MEDIUM | MEDIUM ✅ | M4 | "maison de retraite" exclusion works |
| prix montage vidéo youtube | HIGH | HIGH ✅ | H1 | "prix" caught before "youtube" |
| montage photo youtube | LOW | LOW ✅ | L5 | YouTube = free content |
| faire numériser cassette vhs | HIGH | HIGH ✅ | H2 | Delegating to a professional |
| faire un diaporama anniversaire | MEDIUM | MEDIUM ✅ | M11 | Exploring options |
| montage photo gratuit en ligne | LOW | LOW ✅ | L1 | "gratuit" caught first |
| diaporama anniversaire en ligne | HIGH | HIGH ✅ | H4 | "en ligne" = online purchase |

---

## Known Limitations & Future Improvements

1. **VHS intent ambiguity:** "numériser vhs" is MEDIUM (M8) but arguably HIGH — these users actively want a service. Consider promoting M8 to HIGH if conversion data supports it.

2. **No "quoi offrir" pattern:** "quoi offrir à sa mère pour noël" falls to M99 default. Could add: `r'^quoi (offrir|donner|acheter)'` → MEDIUM.

3. **Accent normalization:** Rules duplicate accented/non-accented variants. A preprocessing step (`unidecode`) would simplify.

4. **City list limited:** 20 French cities + 3 Canadian. Expand for smaller cities or use a geographic database.

5. **No "free" as English signal:** Some French searches include English words. Currently only "free" would need explicit handling if present.

6. **"personnalisé" volume:** 648 keywords hit M10 alone. This is correct (customization = browsing) but consider sub-classifying: "personnalisé + [product]" vs "personnalisé + [action verb]" for finer intent.

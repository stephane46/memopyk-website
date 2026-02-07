# FR Cluster Classification Ruleset

## Overview
- **Source**: `Keyword_Stats_merged.csv` (3,410 FR keywords, ISO-8859-1 encoding)
- **Method**: Regex pattern matching on accent-normalized text
- **Coverage**: 100% (0 unclassified)
- **Date**: February 2026

## Key Technical Decision: Accent Normalization

All keywords are normalized using Unicode NFKD decomposition before matching. This strips accents (é→e, è→e, ê→e, ë→e, à→a, etc.) so all patterns are written in plain ASCII. This avoids the common bug of misplacing accent characters in regex character classes.

```python
import unicodedata
def normalize(text):
    text = text.lower().strip()
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))
```

## Distribution Summary

| Cluster | Count | % | Notes |
|---------|------:|---:|-------|
| physical_products | 605 | 17.7% | Cadres, toiles, mugs, t-shirts, etc. |
| vhs_legacy | 548 | 16.1% | Strong FR demand for VHS/digitization |
| gift_anniversary | 457 | 13.4% | "Anniversaire" is overloaded in FR (birthday + anniversary) |
| life_events | 424 | 12.4% | Mariage, bébé, naissance, baptême |
| gift_personalized | 360 | 10.6% | "Personnalisé" + "cadeau photo" patterns |
| gift_retirement | 314 | 9.2% | **Large in FR** — pot de départ, EHPAD, retraité |
| gift_mothers | 216 | 6.3% | Fête des mères + maman |
| gift_grandparents | 204 | 6.0% | **Large in FR** — grands-parents, mamie, papi |
| direct_service | 172 | 5.0% | Montage vidéo, diaporama, film souvenir |
| gift_other | 59 | 1.7% | Catch-all gift queries |
| gift_fathers | 40 | 1.2% | Fête des pères + papa |
| tools_comparison | 9 | 0.3% | Logiciel, gratuit, en ligne |
| photo_organization | 2 | 0.1% | Organiser/trier photos |
| gift_graduation | 0 | 0.0% | **Gap** — no FR keywords in dataset |
| gift_memorial | 0 | 0.0% | **Gap** — caught by direct_service instead |
| gift_birthday | 0 | 0.0% | **Gap** — FR "anniversaire" = both birthday & anniversary |

## FR-Specific Observations

### Larger in FR vs EN:
- **gift_retirement** (9.2%): French "pot de départ" culture + EHPAD gifts
- **gift_grandparents** (6.0%): Strong intergenerational gifting tradition
- **gift_mothers** (6.3%): "Fête des mères" is a major gifting occasion

### Gaps vs EN Taxonomy:
- **gift_graduation** (0): French education system has different milestones; "diplôme", "bac" weren't in keyword research
- **gift_memorial** (0): Memorial keywords like "hommage décès" were classified under direct_service (they're service queries, not gift queries)
- **gift_birthday** (0): In French, "anniversaire" means both birthday AND anniversary — all absorbed by gift_anniversary

### FR "anniversaire" Ambiguity:
In French, "anniversaire" is the word for BOTH birthday and wedding anniversary. The EN taxonomy splits these into gift_birthday and gift_anniversary. In FR, nearly all go to gift_anniversary. This is structurally correct since the content strategy treats them similarly.

## Pattern Rules by Cluster

```python
cluster_rules_fr = {
    'vhs_legacy': [
        'vhs', 'cassette', 'k7', 'hi8', 'super 8', 'mini dv',
        'numeriser', 'numerisation', 'digitaliser',
        'convertir cassette', 'transferer video', 'convertisseur video',
        'pellicule', 'diapositive', 'bobine', '8mm', 'film argentique',
        'transfert dvd', 'scanner negatif/diapo',
    ],

    'direct_service': [
        'montage video', 'montage photo', 'diaporama', 'film souvenir',
        'montage + musique', 'video hommage', 'retrospective',
        'video/photo + musique', 'film + famille/voyage/bebe/animal',
        'hommage animal', 'montage + animal/voyage/vacances',
        'tarif/prix/devis montage', 'monteur video prix',
        'creation video', 'video pour maries',
        'film avec photos', 'montage souvenir',
    ],

    'tools_comparison': [
        'logiciel', 'application', 'gratuit', 'en ligne',
        'tuto', 'comment faire',
        'iphone', 'android', 'smartphone',
        'youtube', 'canva', 'imovie', 'filmora', 'capcut',
        'windows', 'mac', 'pc', 'ordinateur',
        'telecharger', 'sans logiciel',
    ],

    'gift_mothers': [
        'fete des meres', 'fete des mamans',
        'cadeau/idee + maman/mere',
        'original fete des meres',
        'meilleur cadeau fete des meres',
        'maman' (broad catch),
    ],

    'gift_fathers': [
        'fete des peres',
        'cadeau/idee + papa',
        'papa' (broad catch),
    ],

    'gift_grandparents': [
        'grands-parents', 'grand-mere', 'grand-pere',
        'mamie', 'papi', 'papy', 'mamy',
        'meme', 'pepe', 'grand-maman',
        'fete des grands',
        'idee/original + grand*',
    ],

    'gift_retirement': [
        'retraite', 'depart en retraite', 'pot de depart',
        'depart collegue', 'fin de carriere',
        'pension', 'ehpad', 'resident',
        'box retraite',
    ],

    'gift_graduation': [
        'diplome', 'remise de diplome', 'graduation',
        'etudes + cadeau', 'reussite examen',
    ],

    'gift_memorial': [
        'deuil', 'deces', 'funeraire', 'funerailles',
        'hommage', 'in memoriam', 'condoleances',
        'enterrement', 'memorial', 'decede',
        'commemorati*', 'obseques', 'cremation',
        'perte animal/chien/chat/proche',
    ],

    'gift_anniversary': [
        'anniversaire de mariage', 'noces',
        'anniversaire couple/mariage',
        'cadeau/idee anniversaire',
        'anniversaire' (broad catch),
    ],

    'gift_birthday': [
        'cadeau anniversaire + ans/enfant/ado/ami',
    ],

    'photo_organization': [
        'organiser/classer/trier/sauvegarder + photo',
        'trop de photos',
    ],

    'physical_products': [
        'mug', 'tasse', 'coussin', 'couverture', 'plaid',
        'puzzle', 'porte-cles', 'magnet', 'bijou', 'bracelet',
        't-shirt', 'sweat', 'coque', 'tableau', 'toile', 'poster',
        'affiche', 'cadre', 'album photo', 'livre photo', 'calendrier',
        'spotify', 'plaque', 'gourde', 'bougie', 'chaussette',
        'taie oreiller', 'impression photo', 'peignoir',
        'objet photo', 'smartphoto', 'boule noel',
    ],

    'life_events': [
        'mariage', 'fiancailles', 'grossesse', 'naissance',
        'bebe', 'enfant', 'bapteme', 'communion',
        'demenagement', 'renovation', 'maison', 'adoption',
    ],

    'gift_personalized': [
        'personnalis*', 'sur mesure',
        'grave', 'gravure', 'prenom',
        'cadeau photo', 'photo cadeau',
        'perso',
    ],

    'gift_other': [
        'cadeau', 'idee cadeau', 'offrir',
        'noel', 'valentin', 'surprise',
        'idee original', 'ideecadeau*',
        'noel parents',
    ],
}
```

## Priority Order (first match wins)

1. vhs_legacy
2. direct_service
3. tools_comparison
4. gift_mothers
5. gift_fathers
6. gift_grandparents
7. gift_retirement
8. gift_graduation
9. gift_memorial
10. gift_anniversary
11. gift_birthday
12. photo_organization
13. physical_products
14. life_events
15. gift_personalized
16. gift_other

## Confidence Levels

- **high**: Specific multi-word match or clear cluster signal
- **medium**: Broad single-word matches (e.g., "anniversaire" alone, physical product names, life events, gift_other catch-all)
- **low**: Only assigned to "other" (none in current output)

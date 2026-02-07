#!/usr/bin/env python3
"""
classify_fr_clusters.py
Classifies French keywords into MEMOPYK content clusters.
Mirrors the EN cluster taxonomy for bilingual content strategy.

Strategy: Normalize all text (remove accents) before matching.
This avoids accent position bugs in regex patterns.
"""

import csv
import re
import unicodedata


def normalize(text: str) -> str:
    """Remove accents and normalize to lowercase ASCII-like string."""
    text = text.lower().strip()
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


# ============================================================
# CLUSTER RULES — ALL patterns use normalized (accent-free) text
# ============================================================

cluster_rules_fr = {
    'vhs_legacy': [
        r'\bvhs\b', r'\bcassette', r'\bk7\b', r'\bhi8\b', r'\bhi-8\b',
        r'\bsuper\s*8\b', r'\bmini\s*dv\b', r'\bbetamax\b', r'\bvideo\s*8\b',
        r'\bnumeriser\b', r'\bnumerisation\b', r'\bnumeris',
        r'\bdigitalis',
        r'\bconvertir.*cassette', r'\bcassette.*convertir',
        r'\btransferer.*video', r'\bvideo.*transferer',
        r'\bconvertisseur.*video', r'\blecteur.*cassette',
        r'\bconvertir.*vhs', r'\bvhs.*dvd', r'\bvhs.*numerique',
        r'\bpellicule', r'\bdiapositive', r'\bdia\b.*photo',
        r'\bbobin', r'\b8\s*mm\b', r'\bfilm\s*argentique',
        r'\btransferer.*pellicule', r'\bscanner.*negatif',
        r'\bnegatif.*photo', r'\bscanner.*diapo',
        r'\btransfert\b.*\bdvd\b', r'\bcle\b.*\bnumerisation\b',
    ],

    'direct_service': [
        r'\bmontage\s+video\b', r'\bmontage\s+photo\b',
        r'\bdiaporama\b', r'\bfilm\s+souvenir\b', r'\bfilms?\s+souvenirs?\b',
        r'\bmontage\b.*\bmusique\b', r'\bmusique\b.*\bmontage\b',
        r'\bdiaporama.*musique\b',
        r'\bcre(er|ation)\b.*\bvideo\b.*\bphoto',
        r'\bfaire\b.*\bmontage\b',
        r'\bvideo\b.*\bsouvenir\b', r'\bsouvenir\b.*\bvideo\b',
        r'\bmontage\b.*\banniversaire\b', r'\bmontage\b.*\bmariage\b',
        r'\bvideo\s+hommage\b', r'\bhommage\b.*\bvideo\b',
        r'\bretrospective\b',
        r'\bslideshow\b', r'\bphoto\b.*\bmontage\b',
        r'\bvideo\b.*\bphoto\b.*\bmusique\b',
        r'\bphoto\b.*\bvideo\b.*\bmusique\b',
        r'\bcreer\b.*\bdiaporama\b', r'\bfaire\b.*\bdiaporama\b',
        r'\bmontage\b.*\bfuneraire\b', r'\bmontage\b.*\benterrement\b',
        r'\bfilm\b.*\bfamille\b', r'\bfilm\b.*\bvoyage\b',
        r'\breunion\b.*\bfamille\b',
        r'\bfilm\b.*\bbebe\b', r'\bmontage\b.*\bbebe\b',
        r'\bmontage\b.*\bvoyage\b', r'\bmontage\b.*\bvacances\b',
        r'\bmontage\b.*\banimal\b', r'\bhommage\b.*\banimal\b',
        r'\bfilm\b.*\banimal\b',
        r'\btarif\b.*\bmontage\b', r'\bprix\b.*\bmontage\b',
        r'\bmontage\b.*\btarif\b', r'\bmontage\b.*\bprix\b',
        r'\bcombien\b.*\bmontage\b', r'\bmonteur\b.*\b(prix|tarif|cout)\b',
        r'\b(prix|tarif|cout)\b.*\bmonteur\b',
        r'\bcombien\b.*\bmonteur\b',
        r'\bgrille\b.*\btarifaire\b.*\bmontage\b',
        r'\bdevis\b.*\bmontage\b',
        r'\bfaire\b.*\bfilm\b.*\bphoto',
        r'\bfilm\b.*\bphoto\b.*\bmusique\b',
        r'\bvideo\b.*\bphoto\b.*\bmusique\b',
        r'\bphoto\b.*\bmusique\b.*\bvideo\b',
        r'\bcreation\b.*\bvideo\b',
        r'\bvideo\b.*\bpour\b.*\bmaries?\b',
        r'\bfaire\b.*\bvideo\b.*\bmaries?\b',
        r'\bvideo\b.*\bavec\b.*\bphoto', r'\bphoto\b.*\bavec\b.*\bmusique\b',
        r'\bfilm\b.*\bavec\b.*\bphotos?\b',
        r'\bmontage\b.*\bsouvenir\b',
    ],

    'tools_comparison': [
        r'\blogiciel\b', r'\bapplication\b', r'\bappli\b',
        r'\bgratuit', r'\bfree\b', r'\ben\s+ligne\b',
        r'\btuto', r'\bcomment\s+faire\b', r'\bmeilleur.*logiciel\b',
        r'\biphone\b', r'\bandroid\b', r'\bsmartphone\b',
        r'\binsta\b', r'\btiktok\b', r'\byoutube\b', r'\bcanva\b',
        r'\bimovie\b', r'\bfilmora\b', r'\bpremiere\b', r'\bcapcut\b',
        r'\bdavinci\b', r'\bfinal\s*cut\b', r'\bshotcut\b', r'\bopenshot\b',
        r'\bwindows\b', r'\bmac\b', r'\bpc\b', r'\bordinateur\b',
        r'\btelecharger\b', r'\boutil\b', r'\btemplate\b',
        r'\bsans\b.*\blogiciel\b', r'\bfacilement\b',
    ],

    'gift_mothers': [
        r'\bfete\b.*\bmeres?\b', r'\bfete\b.*\bmaman',
        r'\bjournee.*mere\b',
        r'\bcadeau.*maman\b', r'\bmaman\b.*\bcadeau\b',
        r'\bidee.*maman\b', r'\bmaman\b.*\bidee\b',
        r'\bidee.*mere\b', r'\bmere\b.*\bidee\b',
        r'\bcadeau.*mere\b', r'\bmere\b.*\bcadeau\b',
        r'\boriginal.*fete\b.*\bmere', r'\bfete\b.*\bmere.*\boriginal',
        r'\bidees?\b.*\bcadeau.*\bmere', r'\bidees?\b.*\bcadeau.*\bmaman',
        r'\bmeilleur.*cadeau.*fete\b.*\bmere',
        r'\bbonne\b.*\bfete\b.*\bmere', r'\boriginal\b.*\bbonne\b.*\bfete\b.*\bmere',
        r'\blivraison\b.*\bfete\b.*\bmere',
        r'\bmaman\b',
    ],

    'gift_fathers': [
        r'\bfete\b.*\bperes?\b', r'\bfete\b.*\bpapa\b',
        r'\bjournee.*pere\b',
        r'\bcadeau.*papa\b', r'\bpapa\b.*\bcadeau\b',
        r'\bidee.*papa\b', r'\bpapa\b.*\bidee\b',
        r'\bimpression\b.*\bfete\b.*\bpere',
        r'\bpapa\b',
    ],

    'gift_grandparents': [
        r'\bgrands?\s*-?\s*parents?\b', r'\bgrand\s*-?\s*mere\b',
        r'\bgrand\s*-?\s*pere\b', r'\bmamie\b', r'\bpapi\b',
        r'\bmeme\b', r'\bpepe\b', r'\bgrand\s*-?\s*maman\b',
        r'\bfete\b.*\bgrand', r'\baieul',
        r'\bpapy\b', r'\bmamy\b',
        r'\bidee\b.*\bgrand', r'\bgrand.*\bidee\b',
        r'\boriginal\b.*\bgrand', r'\bgrand.*\boriginal\b',
        r'\bbox\b.*\bpapy\b', r'\bbox\b.*\bmamy\b',
    ],

    'gift_retirement': [
        r'\bretraite\b', r'\bdepart\b.*\bretraite\b',
        r'\bpot\s+de\s+depart\b', r'\bdepart\b.*\bcollegue\b',
        r'\bcollegue\b.*\bdepart\b', r'\bfin\s+de\s+carriere\b',
        r'\bpension\b', r'\behpad\b', r'\bresident',
        r'\bbox\b.*\bretraite\b',
    ],

    'gift_graduation': [
        r'\bdiplome\b', r'\bremise\s+de\s+diplome\b',
        r'\bgraduation\b', r'\bobtention\b.*\bdiplome\b',
        r'\betudes\b.*\bcadeau\b', r'\bcadeau\b.*\betudes\b',
        r'\breussite\b.*\bexamen\b', r'\bexamen\b.*\breussite\b',
    ],

    'gift_memorial': [
        r'\bdeuil\b', r'\bdeces\b',
        r'\bfuneraire\b', r'\bfunerailles\b',
        r'\bhommage\b',
        r'\bmemoire\b.*\bdefunt\b', r'\bin\s+memoriam\b',
        r'\bsympathie\b', r'\bcondoleances\b', r'\benterrement\b',
        r'\bmemorial\b', r'\bsouvenir.*decede\b', r'\bdecede\b',
        r'\bcommemorati', r'\bobseques\b', r'\bcremation\b',
        r'\bperte\b.*\b(animal|chien|chat|proche)\b',
        r'\b(animal|chien|chat)\b.*\bdecede\b',
    ],

    'gift_anniversary': [
        r'\banniversaire\s+de\s+mariage\b', r'\bnoces\b',
        r'\banniversaire.*couple\b', r'\bcouple\b.*\banniversaire\b',
        r'\banniversaire\b.*\bmariage\b',
        r'\bcadeau.*anniversaire\b', r'\banniversaire\b.*\bcadeau\b',
        r'\bidee.*anniversaire\b', r'\banniversaire\b.*\bidee\b',
        r'\banniversaire\b',
    ],

    'gift_birthday': [
        r'\bcadeau\b.*\banniversaire\b.*\b(ans|enfant|ado|adulte|ami|copain|copine)\b',
        r'\banniversaire\b.*\b(ans|enfant|ado|adulte|ami|copain|copine)\b.*\bcadeau\b',
    ],

    'photo_organization': [
        r'\borganiser\b.*\bphoto', r'\bphoto.*\borganiser\b',
        r'\bclasser\b.*\bphoto', r'\bphoto.*\bclasser\b',
        r'\btrier\b.*\bphoto', r'\bphoto.*\btrier\b',
        r'\bsauvegarder\b.*\bphoto', r'\bstockage\b.*\bphoto',
        r'\borganisation\b.*\bphoto', r'\bphoto.*\borganisation\b',
        r'\brangement\b.*\bphoto', r'\barchiver\b.*\bphoto',
        r'\btrop\s+de\s+photos?\b',
    ],

    'physical_products': [
        r'\bmug\b', r'\btasse\b', r'\bcoussin\b', r'\bcouverture\b',
        r'\bplaid\b', r'\bpuzzle\b', r'\bporte\s*-?\s*cles?\b', r'\bmagnet\b',
        r'\baimant\b', r'\bbijou\b', r'\bbracelet\b', r'\bcollier\b',
        r'\bpendentif\b', r'\bmontre\b', r'\bt-?\s*shirt\b', r'\btee\s*shirt\b',
        r'\bsweat\b', r'\bhoodie\b', r'\bcoque\b',
        r'\btableau\b', r'\btoile\b', r'\bposter\b',
        r'\baffiche\b', r'\bcadre\b', r'\btirage\b.*\bphoto\b',
        r'\balbum\s+photo\b', r'\blivre\s+photo\b', r'\bcalendrier\b',
        r'\bspotify\b', r'\bplaque\b', r'\bgourde\b',
        r'\bsac\b.*\bpersonnalis', r'\bbougie\b',
        r'\bporte.*photo\b', r'\bboule\b.*\bnoel\b',
        r'\bchaussette', r'\bcube\b.*\bphoto\b', r'\bphoto\b.*\bcube\b',
        r'\btaie\b.*\boreiller\b', r'\boreiller\b.*\bphoto\b',
        r'\bimpression\b.*\bphoto\b', r'\bphoto\b.*\bimpression\b',
        r'\bpeignoir\b', r'\bobjet\b.*\bphoto\b', r'\bphoto\b.*\bobjet\b',
        r'\bportrait\b.*\bfamille\b.*\boriginal\b',
        r'\bphoto\b.*\bporte\s*-?\s*cles?\b',
        r'\bsmartphoto\b',
        r'\bboule\b.*\bpremier\b.*\bnoel\b',
    ],

    'life_events': [
        r'\bmariage\b', r'\bnoce\b', r'\bfiancailles\b',
        r'\bgrossesse\b', r'\bnaissance\b', r'\bbebe\b', r'\benfant\b',
        r'\bbapteme\b', r'\bcommunion\b', r'\bconfirmation\b',
        r'\bdemenagement\b', r'\brenovation\b', r'\bmaison\b',
        r'\badoption\b',
    ],

    'gift_personalized': [
        r'\bpersonnalis', r'\bpersonnal', r'\bsur\s+mesure\b',
        r'\bgrave\b', r'\bgravure\b', r'\bprenom\b',
        r'\bavec.*photo\b.*\bcadeau\b', r'\bcadeau\b.*\bavec.*photo\b',
        r'\bcadeau\b.*\bphoto\b', r'\bphoto\b.*\bcadeau\b',
        r'\bperso\b',
    ],

    'gift_other': [
        r'\bcadeau', r'\bidees?\b.*\bcadeau', r'\bcadeau\b.*\bidees?\b',
        r'\boffrir\b', r'\bnoel\b', r'\bvalentin\b',
        r'\bidees?\b.*\boriginal', r'\boriginal\b.*\bidees?\b',
        r'\bsurprise\b',
        r'\bidees?\b.*\bnoel\b', r'\bnoel\b.*\bidees?\b',
        r'\bidees?\s+cadeau', r'\bcadeaux?\b.*\bphoto',
        r'\bidee\b', r'\bidees\b',
        r'\bideecadeau',
        r'\bnoel\b.*\bparents?\b', r'\bparents?\b.*\bnoel\b',
    ],
}

CLUSTER_PRIORITY = [
    'vhs_legacy',
    'direct_service',
    'tools_comparison',
    'gift_mothers',
    'gift_fathers',
    'gift_grandparents',
    'gift_retirement',
    'gift_graduation',
    'gift_memorial',
    'gift_anniversary',
    'gift_birthday',
    'photo_organization',
    'physical_products',
    'life_events',
    'gift_personalized',
    'gift_other',
]


def classify_keyword(keyword: str) -> tuple:
    kw = normalize(keyword)
    for cluster in CLUSTER_PRIORITY:
        patterns = cluster_rules_fr[cluster]
        for pattern in patterns:
            if re.search(pattern, kw):
                if cluster == 'gift_other':
                    confidence = 'medium'
                elif cluster == 'gift_anniversary' and pattern == r'\banniversaire\b':
                    confidence = 'medium'
                elif cluster == 'life_events':
                    confidence = 'medium'
                elif cluster == 'physical_products':
                    confidence = 'medium'
                else:
                    confidence = 'high'
                return cluster, confidence
    return 'other', 'low'


def main():
    input_file = '/mnt/user-data/uploads/Keyword_Stats_merged.csv'
    output_file = '/home/claude/FR_keywords_classified.csv'

    keywords = []
    with open(input_file, 'r', encoding='latin-1') as f:
        reader = csv.DictReader(f)
        for row in reader:
            keywords.append(row['Keyword'].strip())

    print(f"Read {len(keywords)} keywords")

    results = []
    cluster_counts = {}
    for kw in keywords:
        cluster, confidence = classify_keyword(kw)
        results.append((kw, cluster, confidence))
        cluster_counts[cluster] = cluster_counts.get(cluster, 0) + 1

    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(['keyword', 'cluster', 'confidence'])
        for kw, cluster, confidence in results:
            writer.writerow([kw, cluster, confidence])

    print(f"\nWrote {len(results)} classified keywords to {output_file}")
    print(f"\n{'Cluster':<25} {'Count':>6} {'%':>6}")
    print("-" * 40)
    for cluster in CLUSTER_PRIORITY + ['other']:
        count = cluster_counts.get(cluster, 0)
        pct = count / len(results) * 100
        print(f"{cluster:<25} {count:>6} {pct:>5.1f}%")


if __name__ == '__main__':
    main()

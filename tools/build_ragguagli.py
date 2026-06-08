#!/usr/bin/env python3
"""Build data/ragguagli.json from the ragguagli extraction workflow output.
Usage: python3 tools/build_ragguagli.py <workflow_output.json>"""
import json, sys, collections, statistics, re, os

d = json.load(open(sys.argv[1]))
recs = d.get('result', d).get('records', [])

ALIAS = {
 'barzalona': 'Barcelona', 'barcellona': 'Barcelona', 'avignona': 'Avignon', 'fiorenza': 'Florence',
 'firenze': 'Florence', 'vinegia': 'Venice', 'venezia': 'Venice', 'genova': 'Genoa', 'melano': 'Milan',
 'milano': 'Milan', 'monpolieri': 'Montpellier', 'maiolica': 'Majorca', 'mallorca': 'Majorca',
 'pampalona': 'Pamplona', 'maiorica': 'Majorca',
}
def place(p):
    if not p: return ''
    s = re.sub(r'\[.*?\]', '', str(p)).strip().strip("'’ ")
    return ALIAS.get(s.lower(), s[:1].upper() + s[1:])

def num(x): return x if isinstance(x, (int, float)) else None

def unit_norm(u):
    s = (u or '').lower()
    if re.search(r'quintal|quintar|gintar|quintai', s): return 'quintale'
    if 'cantar' in s or 'cantal' in s: return 'cantaro'
    if re.search(r'libbr|libra|\blb\b', s): return 'libbre sottili' if 'sottil' in s else 'libbre'
    if re.search(r'\bonc|onz|once|oncia|\bony', s): return 'once'
    if 'rotol' in s or 'ruotol' in s: return 'rotoli'
    if 'rove' in s or 'arrob' in s or re.search(r'\brova\b', s): return 'rove'
    if 'canna' in s or 'canne' in s: return 'canne'
    return s.strip()

clean = []
for r in recs:
    r = dict(r)
    r['from_place'] = place(r.get('from_place')); r['to_place'] = place(r.get('to_place'))
    r['left_qty'] = num(r.get('left_qty')); r['right_qty'] = num(r.get('right_qty'))
    r['page'] = re.sub(r'[^0-9]', '', str(r.get('page', '')))[:3] or r.get('page')
    clean.append(r)

POUND = {'libbre', 'libbre sottili'}

# ---- canonical pivot: local weight per 1 Barcelona quintale ----
piv = collections.defaultdict(list)
for r in clean:
    if r['type'] != 'weight' or not r.get('involves_barcelona'): continue
    lq, rq = r['left_qty'], r['right_qty']
    if not lq or not rq: continue
    lu, ru = unit_norm(r['left_unit']), unit_norm(r['right_unit'])
    if r['to_place'] == 'Barcelona' and ru == 'quintale':
        per, cu, cp = lq / rq, lu, r['from_place']
    elif r['from_place'] == 'Barcelona' and lu == 'quintale':
        per, cu, cp = rq / lq, ru, r['to_place']
    else:
        continue
    if cp == 'Barcelona': continue
    piv[(cp, cu)].append({'value': round(per, 2), 'page': r['page'], 'confidence': r.get('confidence'), 'source': r.get('source_text', '')})

bcn_weight = []
for (pl, unit), vals in piv.items():
    nums = [v['value'] for v in vals]
    mean = round(statistics.mean(nums), 2)
    bcn_weight.append({'place': pl, 'unit': unit, 'n': len(vals), 'mean': mean,
                       'min': min(nums), 'max': max(nums),
                       'agree': (max(nums) - min(nums)) <= 0.06 * mean if mean else True,
                       'pound_like': unit in POUND, 'values': vals})
bcn_weight.sort(key=lambda x: (not x['pound_like'], -x['n'], x['place']))

# ---- cross weight-rates via the Barcelona quintale (pound-like only) ----
pivot = {}
for row in bcn_weight:
    if row['pound_like']:
        pivot.setdefault(row['place'], row)
cross = []
ps = sorted(pivot)
for i in range(len(ps)):
    for j in range(i + 1, len(ps)):
        a, b = ps[i], ps[j]
        pa, pb = pivot[a]['mean'], pivot[b]['mean']  # libbre of city per 1 BCN quintale
        # pa libbre(a) == pb libbre(b)  =>  1 libbra(a) = pa/pb libbre(b)
        cross.append({'a': a, 'b': b, 'a_unit': 'libbra', 'b_unit': 'libbre',
                      'a_per_b': round(pa / pb, 3),
                      'note': f"{pa} {a} = {pb} {b} libbre = 1 Barcelona quintale"})
cross.sort(key=lambda c: (c['a'], c['b']))

# ---- self-consistency: ONLY cross-city unit conversions (exclude local prices) ----
groups = collections.defaultdict(list)
for r in clean:
    lq, rq = r['left_qty'], r['right_qty']
    if not lq or not rq: continue
    if r['from_place'] == r['to_place']: continue
    if r['type'] not in ('weight', 'length', 'volume', 'money'): continue
    com = (r.get('commodity') or '').lower().strip()
    key = (r['from_place'], r['to_place'], r['type'], unit_norm(r['left_unit']), unit_norm(r['right_unit']), com)
    groups[key].append(r)
pairs = []
for key, rs in groups.items():
    rel = [r for r in rs if r.get('confidence') in ('high', 'medium')]
    basis = rel if len(rel) >= 2 else rs
    ratios = [r['left_qty'] / r['right_qty'] for r in basis]
    mean = statistics.median(ratios)
    spread = (max(ratios) - min(ratios)) / mean if mean else 0
    same_unit = unit_norm(key[3]) == unit_norm(key[4])
    pairs.append({'from': key[0], 'to': key[1], 'type': key[2], 'left_unit': key[3], 'right_unit': key[4],
                  'commodity': key[5] or None,
                  'n': len(rs), 'reliable_n': len(rel), 'ratio_mean': round(mean, 3), 'spread': round(spread, 3),
                  'typical_100': round(100 / mean, 1) if same_unit and mean else None,
                  'agree': spread <= 0.06, 'multi': len(rs) > 1,
                  'records': [{'page': r['page'], 'left_qty': r['left_qty'], 'left_unit': r.get('left_unit'),
                               'right_qty': r['right_qty'], 'right_unit': r.get('right_unit'),
                               'confidence': r.get('confidence'), 'source': r.get('source_text', ''), 'note': r.get('note', '')} for r in rs]})
pairs.sort(key=lambda p: (-p['n'], p['from']))

# ---- price ranges (local charges/quotes) for context, grouped by city+commodity ----
pricegrp = collections.defaultdict(list)
for r in clean:
    if r['type'] != 'price' or not r['left_qty']: continue
    pricegrp[(r['to_place'], (r.get('commodity') or '').lower(), unit_norm(r['left_unit']), unit_norm(r['right_unit']))].append(r)
prices = []
for (pl, com, lu, ru), rs in pricegrp.items():
    if len(rs) < 2: continue
    v = [r['left_qty'] for r in rs]
    prices.append({'place': pl, 'commodity': com or '—', 'unit': f'{lu}/{ru}', 'n': len(rs),
                   'min': min(v), 'max': max(v), 'mean': round(statistics.mean(v), 2),
                   'pages': sorted({r['page'] for r in rs})})
prices.sort(key=lambda x: -x['n'])

out = {'meta': {'records': len(clean), 'leaves': d.get('result', d).get('leaves'),
                'bcn_weight_places': len(bcn_weight), 'pairs': len(pairs)},
       'records': clean, 'bcn_weight': bcn_weight, 'pairs': pairs, 'cross_weight': cross, 'prices': prices}
here = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
json.dump(out, open(os.path.join(here, 'ragguagli.json'), 'w'), ensure_ascii=False, indent=1)

print(f"records: {len(clean)}  |  pivot rows: {len(bcn_weight)}  |  cross: {len(cross)}  |  price groups: {len(prices)}")
print("\nLOCAL WEIGHT PER 1 BARCELONA QUINTALE:")
for r in bcn_weight:
    print(f"  {'lb ' if r['pound_like'] else '   '}{r['place']:13s} {r['mean']:7.2f} {r['unit']:16s} n={r['n']} {'' if r['agree'] else '(varies %.0f–%.0f)'%(r['min'],r['max'])}")
multi = [p for p in pairs if p['multi']]
print(f"\nCROSS-CITY conversions stated on >1 leaf: {len(multi)} (agree {sum(p['agree'] for p in multi)}, diverge {sum(not p['agree'] for p in multi)}):")
for p in multi:
    print(f"  {'agree ' if p['agree'] else 'DIVERGE'} {p['from']}->{p['to']} {p['type']} {p['left_unit']}/{p['right_unit']} n={p['n']} spread={p['spread']} pages={[r['page'] for r in p['records']]}")

import json,re,sys,glob,collections
ROOT='/Users/luka/Documents/code/spells.holota.family'
ENG_KEYS=('engName','eng_name','nameEng','englishName','name_en','engTitle')
index=collections.defaultdict(set)
def walk(o,src):
    if isinstance(o,dict):
        eng=next((o[k] for k in ENG_KEYS if isinstance(o.get(k),str)),None)
        if eng and isinstance(o.get('name'),str) and o['name']!=eng:
            index[eng.strip().lower()].add((o['name'].strip(),src))
        for v in o.values():walk(v,src)
    elif isinstance(o,list):
        for v in o:walk(v,src)
for f in glob.glob(ROOT+'/src/lib/generated/*.json'):
    if any(x in f for x in('optimization','omni','search-index')):continue
    try:walk(json.load(open(f,encoding='utf-8')),f.split('/')[-1])
    except Exception as e:pass
d=json.load(open(ROOT+'/src/lib/refs/dictionary.json'))
walk(d,'dictionary.json')
def find(term):
    t=term.lower()
    exact=index.get(t,set())
    part=[(k,v) for k,v in index.items() if t in k and k!=t][:6]
    return exact,part
if __name__=='__main__':
    for term in sys.argv[1:]:
        exact,part=find(term)
        print(f'## {term}')
        for n,s in sorted(exact):print('   =',n,'  [',s,']')
        if not exact:
            for k,v in part[:4]:print('   ~',k,'->',sorted(v)[0][0],'[',sorted(v)[0][1],']')

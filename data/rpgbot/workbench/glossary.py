import re,sys,json
sys.path.insert(0,'/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench')
import lookup
ROOT=lookup.ROOT
slug=sys.argv[1]
s=open(f'{ROOT}/data/rpgbot/authoring/{slug}-2014.md',encoding='utf-8').read()
quotes=' \n '.join(re.findall(r'^> ([^\n]*)',s,re.M))
quotes=re.sub(r'\[\[\d+\|([^\]]*)\]\]',r'\1',quotes)
found={}
for eng,vals in lookup.index.items():
    if len(eng)<4 or eng.startswith('('):continue
    vals=[v for v in vals if not re.fullmatch(r'[A-Z0-9_ ]+',v[0])]
    if not vals:continue
    for m in re.finditer(r'(?<![A-Za-z])'+re.escape(eng)+r'(?![A-Za-z])',quotes,re.I):
        word=m.group(0)
        if ' ' not in eng and not word[0].isupper():continue
        found.setdefault(eng,(word,vals))
        break
keys=sorted(found,key=lambda k:-len(k))
kept=[]
for k in keys:
    if any(k in o for o in kept):continue
    kept.append(k)
for k in sorted(kept):
    word,vals=found[k]
    vv=sorted(vals)
    print(f"{word} = {vv[0][0]}   [{vv[0][1].replace('.json','')}]"+(f" | alt: {vv[1][0]}" if len(vv)>1 and vv[1][0]!=vv[0][0] else ''))

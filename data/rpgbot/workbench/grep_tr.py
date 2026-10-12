import re,sys,glob
pat=re.compile(sys.argv[1])
n=int(sys.argv[2]) if len(sys.argv)>2 else 5
c=0
for f in sorted(glob.glob("tr_*.py")):
    t=open(f,encoding="utf-8").read()
    for m in pat.finditer(t):
        s=max(0,m.start()-70);e=min(len(t),m.end()+70)
        print(f[:28],"|",t[s:e].replace("\n"," "))
        c+=1
        if c>=n:sys.exit()

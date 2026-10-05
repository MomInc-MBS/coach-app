import re
def fails(p):
    t=open(p,encoding='utf-8',errors='ignore').read()
    return set(re.sub(r'\s*\([0-9.]+ms\)\s*$','',l[2:]) for l in t.splitlines() if l.startswith('\u2716') and not l.startswith('\u2716 failing') and not l.startswith('\u2716 tests'))
base=fails('.r22/gate-base.txt');solo=fails('.r22/gate-solo2.txt')
new=solo-base;print('solo2 fails',len(solo),'new vs base',len(new))
for n in sorted(new):print(' -',n[:140])

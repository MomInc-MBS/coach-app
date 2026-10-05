import re
log=open('.r22/gate-solo.txt',encoding='utf-8',errors='ignore').read()
unrun=[]
for f in open('.r22/gate-failed-files.txt').read().split():
    src=open(f,encoding='utf-8',errors='ignore').read()
    titles=re.findall(r"""test\(\s*['"`](.{10,60})""",src)
    keys=[t.split('\\')[0][:30] for t in titles]
    if not any(k in log for k in keys): unrun.append(f)
open('.r22/gate-unrun-files.txt','w',newline='\n').write('\n'.join(unrun)+'\n')
print(len(unrun));print(' '.join(unrun))

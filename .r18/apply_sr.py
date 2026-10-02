"""Apply FILE:/SEARCH/REPLACE blocks. Usage: python apply_sr.py reply.txt. Exact unique match, else a line-wise leading-whitespace-tolerant unique match; else exit non-zero."""
import re,sys,pathlib
t=pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
for m in re.finditer(r'FILE:\s*(\S+)\s*\n<<<<<<< SEARCH\n(.*?)\n=======\n(.*?)\n?>>>>>>> REPLACE',t,re.S):
    f,s,r=m.groups();p=pathlib.Path(f);src=p.read_text(encoding='utf-8');n=src.count(s)
    if n==1:p.write_text(src.replace(s,r),encoding='utf-8',newline='');print('applied',f);continue
    lines=src.split('\n');sl=[x.strip() for x in s.split('\n')];hits=[i for i in range(len(lines)-len(sl)+1) if all(lines[i+k].strip()==sl[k] for k in range(len(sl)))]
    if len(hits)!=1:sys.exit(f'{f}: SEARCH found {n} exact / {len(hits)} tolerant times:\n{s[:200]}')
    i=hits[0];lines[i:i+len(sl)]=r.split('\n');p.write_text('\n'.join(lines),encoding='utf-8',newline='');print('applied (ws-tolerant)',f)

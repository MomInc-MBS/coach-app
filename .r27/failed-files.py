import re,sys
t=open(sys.argv[1],encoding='utf-8',errors='ignore').read()
files=sorted(set(m.replace('\\','/') for m in re.findall(r'test at (tests[\\/][^\s:]+\.mjs)',t)))
open(sys.argv[2],'w').write('\n'.join(files)+'\n')
print(len(files));print(' '.join(files))

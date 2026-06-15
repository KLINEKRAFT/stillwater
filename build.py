#!/usr/bin/env python3
# Rebuild index.html by inlining game.js + every PNG in assets/ (base64).
# Run after editing game.js or swapping art:  python3 build.py
import base64, json, os, re
A={}
for f in sorted(os.listdir('assets')):
    if f.endswith('.png'):
        with open('assets/'+f,'rb') as fp:
            A[f[:-4]]='data:image/png;base64,'+base64.b64encode(fp.read()).decode()
META=json.load(open('bundle.json'))['META']
game=open('game.js').read()
html=open('index.html').read()
html=re.sub(r'(<script id="sw-assets">)[\s\S]*?(</script>)',
            lambda m:m.group(1)+'window.ASSETS='+json.dumps(A)+';window.META='+json.dumps(META)+';'+m.group(2),html)
html=re.sub(r'(<script id="sw-engine">)[\s\S]*?(</script>)',
            lambda m:m.group(1)+game+m.group(2),html)
open('index.html','w').write(html)
print('rebuilt index.html',round(os.path.getsize('index.html')/1024/1024,2),'MB,',len(A),'assets')

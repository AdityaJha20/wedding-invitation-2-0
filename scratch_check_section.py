import urllib.request
import re

url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzRlMDA5MDMxMzUwNzc5OWQzOGVhMGQ0OTlkEgsSBxCIqfnuiRIYAZIBIwoKcHJvamVjdF9pZBIVQhM1NTg4NDQ1NDI0NTA1NDQ3MzA4&filename=&opi=89354086'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    content = resp.read().decode('utf-8', errors='ignore')

m = re.search(r'<section[^>]*id=["\']our-story["\'][^>]*>.*?</section>', content, re.DOTALL)
if m:
    print('Found section in 8a0c71c07e044e729156ee9867150a2a (len:', len(m.group(0)), '):')
    print(m.group(0)[:2500])
else:
    print('Searching our-story pattern')
    idx = content.find('our-story')
    print(content[idx:idx+2000])

from pathlib import Path
import re

s = Path('jordan-pwa.js').read_text(encoding='utf-8')

stop_match = re.search(r"const STOP=new Set\(\('([^']*)'\)\.split\(' '\)\);", s)
proper_match = re.search(r"const PROPER=new Set\(\('([^']*)'\)\.split\(' '\)\);", s)
if not stop_match or not proper_match:
    raise SystemExit('STOP/PROPER sets not found')

STOP = set(stop_match.group(1).split())
PROPER = set(proper_match.group(1).split())

def valid(raw, mid=False):
    w = raw.strip()
    l = w.lower()
    if not re.fullmatch(r"[A-Za-z][A-Za-z'-]*", w):
        return False
    if len(l) < 2 or len(l) > 32 or l in STOP or re.sub(r"[-']", '', l) in PROPER:
        return False
    if mid and re.fullmatch(r"[A-Z][a-z]+", w):
        return False
    return True

keep = ['school','classroom','great','happy','beautiful','learn','teacher','difficult','morning','you','have','can']
reject = ['and','with','from','Jordan','Amman','Ahmed','7','A']

bad_keep = [w for w in keep if not valid(w)]
bad_reject = [w for w in reject if valid(w, mid=w[:1].isupper())]
if bad_keep:
    raise SystemExit('Expected valid words rejected: ' + ', '.join(bad_keep))
if bad_reject:
    raise SystemExit('Expected excluded tokens accepted: ' + ', '.join(bad_reject))

if 'pdf.min.mjs' in s:
    raise SystemExit('Legacy module PDF loader still present')
if s.count('pdf.min.js') != 1:
    raise SystemExit(f'Expected one PDF engine script reference, found {s.count("pdf.min.js")}')
if "PDF engine unavailable" not in s:
    raise SystemExit('Explicit PDF engine failure guard missing')

if 'const key=raw.toLowerCase();' not in s:
    raise SystemExit('First-appearance de-duplication key missing')
if 'const list=[...map.values()];' not in s:
    raise SystemExit('First-appearance ordering guarantee missing')

print('PWA v350 functional regression checks passed')

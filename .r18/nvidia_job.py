"""Heavy-reasoning job on NVIDIA NIM. Usage: python nvidia_job.py <card.md> [model]. Reply -> .r18/replies/<stem>.nvidia.txt"""
import json, os, sys, pathlib, urllib.request
card = pathlib.Path(sys.argv[1]); model = sys.argv[2] if len(sys.argv) > 2 else 'moonshotai/kimi-k3'
key = os.environ.get('NVIDIA_API_KEY') or __import__('subprocess').run(
    ['powershell', '-c', "[Environment]::GetEnvironmentVariable('NVIDIA_API_KEY','User')"], capture_output=True, text=True).stdout.strip()
body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': card.read_text(encoding='utf-8')}], 'max_tokens': 16000}).encode()
req = urllib.request.Request('https://integrate.api.nvidia.com/v1/chat/completions', body,
                             {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
msg = json.load(urllib.request.urlopen(req, timeout=1500))['choices'][0]['message']
out = card.parent / 'replies' / f'{card.stem}.nvidia.txt'; out.parent.mkdir(exist_ok=True)
out.write_text(msg.get('content') or '', encoding='utf-8'); print(out, len(msg.get('content') or ''))

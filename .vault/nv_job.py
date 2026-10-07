"""Cheap review/copy job on NVIDIA NIM (GPU is busy: no LM Studio). Never Kimi K3 (daily quota).
Usage: python .vault/nv_job.py <card.md> [model]   -> prints reply, saves .vault/replies/<stem>.<model>.txt
Models: nvidia/nemotron-3-super-120b-a12b (default, fast), z-ai/glm-5.3-flash (2nd opinion), openai/gpt-oss-20b."""
import json, os, sys, pathlib, subprocess, urllib.request
card = pathlib.Path(sys.argv[1]); model = sys.argv[2] if len(sys.argv) > 2 else 'nvidia/nemotron-3-super-120b-a12b'
key = os.environ.get('NVIDIA_API_KEY') or subprocess.run(['powershell', '-c', "[Environment]::GetEnvironmentVariable('NVIDIA_API_KEY','User')"], capture_output=True, text=True).stdout.strip()
body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': card.read_text(encoding='utf-8')}], 'max_tokens': 12000}).encode()
req = urllib.request.Request('https://integrate.api.nvidia.com/v1/chat/completions', body, {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
text = json.load(urllib.request.urlopen(req, timeout=900))['choices'][0]['message'].get('content') or ''
out = pathlib.Path(__file__).parent / 'replies' / f"{card.stem}.{model.split('/')[-1]}.txt"; out.parent.mkdir(exist_ok=True)
out.write_text(text, encoding='utf-8'); sys.stdout.reconfigure(encoding='utf-8'); print(text)

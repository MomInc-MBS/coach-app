#!/usr/bin/env python3
"""R18 local-model job runner (LM Studio).

  python .r18/local_job.py .r18/A2.md            # reply streams to .r18/replies/A2.txt
  python .r18/local_job.py .r18/A2.md --dry      # preflight only (fits ctx? right model loaded?)
  python .r18/local_job.py .r18/A2.md --model openai/gpt-oss-20b

Rules: one model loaded ALONE (16 GB GPU), ctx 32768, streaming so progress is visible,
1500 s wall cap. On timeout/empty reply: trim the card or switch model. NEVER hand-code.
"""
import json, subprocess, sys, time
from pathlib import Path
import requests

BASE = "http://127.0.0.1:1234"
MODEL = "openai/gpt-oss-20b"      # 12 GB fits the 16 GB card alone: 186 tok/s, TTFT 0.2 s (bench 2 Oct)
CTX = 32768
MAX_TOKENS = 8000                 # ~45 s at 186 tok/s; big cards still finish well inside the cap
WALL_S = 1500
CHARS_PER_TOKEN = 3.2             # minified JS/CSS tokenises densely; conservative
REPLIES = Path(__file__).parent / "replies"


def lms(*args):
    return subprocess.run(["lms", *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def loaded_models():
    r = requests.get(BASE + "/api/v0/models", timeout=10).json()
    return {m["id"]: m.get("loaded_context_length") or 0 for m in r["data"] if m.get("state") == "loaded"}


def ensure_model(model, ctx):
    """The requested model must be the ONLY one loaded, at >= ctx. Otherwise reload."""
    have = loaded_models()
    if list(have) == [model] and have[model] >= ctx:
        return
    print(f"preflight: loaded={have} -> reloading {model} alone at ctx {ctx}", flush=True)
    lms("unload", "--all")
    r = lms("load", model, "-c", str(ctx), "--gpu", "max", "-y")
    if r.returncode:
        sys.exit(f"preflight: lms load failed: {r.stderr.strip()[:300]}")
    have = loaded_models()
    if list(have) != [model]:
        sys.exit(f"preflight: expected only {model} loaded, got {have}")


def run_job(card_path, model=MODEL, dry=False):
    card = Path(card_path)
    prompt = card.read_text(encoding="utf-8")
    est = int(len(prompt) / CHARS_PER_TOKEN)
    print(f"card {card.name}: {len(prompt)} chars ~{est} tokens + max_tokens {MAX_TOKENS} vs ctx {CTX}", flush=True)
    if est + MAX_TOKENS > CTX:
        sys.exit(f"preflight: card too big for ctx {CTX}. Trim to <= {int((CTX - MAX_TOKENS) * CHARS_PER_TOKEN)} chars")
    ensure_model(model, CTX)
    if dry:
        print("preflight OK", flush=True)
        return

    REPLIES.mkdir(exist_ok=True)
    out = REPLIES / f"{card.stem}.txt"
    body = {"model": model, "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2, "max_tokens": MAX_TOKENS, "stream": True}
    t0 = time.time(); last = t0; content = reasoning = 0; finish = None
    with open(out, "w", encoding="utf-8") as f, \
         requests.post(BASE + "/v1/chat/completions", json=body, stream=True, timeout=(10, WALL_S)) as resp:
        resp.raise_for_status()
        for line in resp.iter_lines():
            if time.time() - t0 > WALL_S:
                finish = "wall-timeout"; break
            if not line.startswith(b"data: ") or line == b"data: [DONE]":
                continue
            choice = json.loads(line[6:])["choices"][0]
            delta = choice.get("delta", {})
            piece = delta.get("content")
            if piece:
                f.write(piece); f.flush(); content += len(piece)
            else:
                reasoning += len(delta.get("reasoning_content") or delta.get("reasoning") or "")
            finish = choice.get("finish_reason") or finish
            if time.time() - last > 5:
                last = time.time()
                print(f"  {int(last - t0)}s  reply {content} chars  (thinking {reasoning} chars)", flush=True)
    print(f"done in {int(time.time() - t0)}s: {content} chars -> {out}  finish={finish}", flush=True)
    if not content or finish == "wall-timeout":
        sys.exit(f"FAILED: empty reply or timeout (finish={finish}). Trim the card or switch model; do not hand-code.")
    if finish == "length":
        print("WARNING: reply hit max_tokens; it may be cut off", flush=True)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else MODEL
    run_job(args[0], model, dry="--dry" in sys.argv)

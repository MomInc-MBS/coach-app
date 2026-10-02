#!/usr/bin/env python3
"""Load each candidate ALONE at a given ctx and measure TTFT / tokens/s on a tiny JS task.
Usage: python .r18/bench_models.py [ctx] [model ...]
"""
import json, subprocess, sys, time, requests

BASE = "http://127.0.0.1:1234"
CTX = int(sys.argv[1]) if len(sys.argv) > 1 else 32768
CANDS = sys.argv[2:] or [
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-35b-a3b",
    "mistralai/devstral-small-2-2512",
    "qwen/qwen3.8-27b",
]
PROMPT = ("Write a JavaScript function clamp(n,lo,hi) that returns n limited to [lo,hi], "
          "then one line calling it. Reply with code only, no prose, no thinking.")


def lms(*args):
    return subprocess.run(["lms", *args], capture_output=True, text=True)


for m in CANDS:
    lms("unload", "--all")
    t = time.time()
    r = lms("load", m, "-c", str(CTX), "--gpu", "max", "-y")
    load_s = time.time() - t
    if r.returncode:
        print(f"{m}: LOAD FAILED {r.stderr.strip()[:200]}")
        continue
    ps = lms("ps").stdout
    body = {"model": m, "messages": [{"role": "user", "content": PROMPT}],
            "max_tokens": 400, "temperature": 0,
            "chat_template_kwargs": {"enable_thinking": False}}
    t0 = time.time()
    try:
        resp = requests.post(BASE + "/api/v0/chat/completions", json=body, timeout=600).json()
    except Exception as e:
        print(f"{m}: REQUEST FAILED {e}")
        continue
    wall = time.time() - t0
    st = resp.get("stats", {})
    msg = resp["choices"][0]["message"]
    print(json.dumps({
        "model": m, "ctx": CTX, "load_s": round(load_s, 1), "wall_s": round(wall, 1),
        "tok_s": st.get("tokens_per_second"), "ttft_s": st.get("time_to_first_token"),
        "completion_tokens": resp.get("usage", {}).get("completion_tokens"),
        "content_chars": len(msg.get("content") or ""),
        "reasoning_chars": len(msg.get("reasoning_content") or msg.get("reasoning") or ""),
        "content_head": (msg.get("content") or "")[:160],
    }), flush=True)
    print("   lms ps:", " | ".join(l.strip() for l in ps.splitlines()[1:]), flush=True)

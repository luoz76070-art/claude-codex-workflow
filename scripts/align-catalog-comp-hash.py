#!/usr/bin/env python3
"""Give every model in Codex's model catalog the same comp_hash, so switching a thread between channels
never makes Codex call the old model first (it compacts with the previous model when comp_hash differs,
which fails once that channel is out of quota).

CC Switch writes the catalog (config.toml: model_catalog_json, usually ~/.codex/cc-switch-model-catalog.json).
It gives the current provider's unprefixed models "3000" and the prefixed ones "cc-switch". Re-run this after
CC Switch regenerates the file. Takes a timestamped backup before writing; keeps the file's formatting.

usage: align-catalog-comp-hash.py [--check] [--hash cc-switch]
"""
import argparse, json, os, re, shutil, sys, time

parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true", help="only report; exit 1 when hashes differ")
parser.add_argument("--hash", default="cc-switch", help="the comp_hash every model should carry")
args = parser.parse_args()

home = os.environ.get("CODEX_HOME") or os.path.expanduser("~/.codex")
config = open(os.path.join(home, "config.toml"), encoding="utf-8").read()
match = re.search(r'^\s*model_catalog_json\s*=\s*"([^"]+)"', config, re.M)
if not match:
    sys.exit("config.toml has no model_catalog_json; nothing to align")
path = match.group(1) if os.path.isabs(match.group(1)) else os.path.join(home, match.group(1))
raw = open(path, encoding="utf-8").read()
catalog = json.loads(raw)
models = catalog.get("models", [])
odd = [m["slug"] for m in models if m.get("comp_hash") != args.hash]
print(f"{path}: {len(models)} models, comp_hash values {sorted({str(m.get('comp_hash')) for m in models})}")
if not odd:
    print("aligned"); sys.exit(0)
print("differs:", ", ".join(odd))
if args.check:
    sys.exit(1)
backup = f"{path}.bak-{time.strftime('%Y%m%d-%H%M%S')}"
shutil.copy2(path, backup)
for m in models:
    m["comp_hash"] = args.hash
indent = 2 if raw.lstrip().startswith("{\n") else None
with open(path, "w", encoding="utf-8") as out:
    out.write(json.dumps(catalog, ensure_ascii=False, indent=indent) + ("\n" if raw.endswith("\n") else ""))
print(f"aligned {len(odd)} models to {args.hash!r}; backup {backup}")

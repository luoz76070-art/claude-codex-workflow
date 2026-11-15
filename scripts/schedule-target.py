#!/usr/bin/env python3
"""Point a CC Desk scheduled task at another session (or show where it points).

usage: schedule-target.py <task-id> [<session-id>]
Backs up the schedules file next to itself before writing. The client picks up changes within seconds.
"""
import json, os, shutil, sys, time

if len(sys.argv) not in (2, 3):
    sys.exit(__doc__)
path = os.environ.get("CC_DESK_TUNNEL_SCHEDULES")
if not path or not os.path.exists(path):
    sys.exit("CC_DESK_TUNNEL_SCHEDULES is not set or missing")
with open(path, encoding="utf-8") as f:
    data = json.load(f)
task = next((t for t in data.get("tasks", []) if t.get("id") == sys.argv[1]), None)
if task is None:
    sys.exit(f"no task {sys.argv[1]}")
print("now:", json.dumps(task.get("target"), ensure_ascii=False))
if len(sys.argv) == 2:
    sys.exit(0)
backup = f"{path}.bak-{time.strftime('%Y%m%d-%H%M%S')}"
shutil.copy2(path, backup)
task["target"] = {"type": "session", "sessionId": sys.argv[2]}
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
os.replace(tmp, path)
print("set:", json.dumps(task["target"], ensure_ascii=False))
print("backup:", backup)

import importlib.util, json, os, subprocess, sys
S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
name = sys.argv[1]
spec = importlib.util.spec_from_file_location("t", f"{S}/tr_{name}.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
temp = f"{S}/frag_tmp_{name}.json"
json.dump(module.FRAGMENTS, open(temp, "w", encoding="utf-8"), ensure_ascii=False)
try:
    print(subprocess.run(["bun", f"{S}/check_markers.ts", temp], capture_output=True, text=True, cwd="/Users/luka/Documents/code/spells.holota.family").stdout)
finally:
    os.unlink(temp)

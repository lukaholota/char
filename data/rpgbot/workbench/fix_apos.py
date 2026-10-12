# -*- coding: utf-8 -*-
import re
import sys
from pathlib import Path

CYR = "А-Яа-яІіЇїЄєҐґ"
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
fixed, count = re.subn(f"(?<=[{CYR}])['’`´](?=[{CYR}])", "ʼ", text)
path.write_text(fixed, encoding="utf-8")
print("apostrophes fixed:", count)

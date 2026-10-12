import re, sys
CYR = 'А-Яа-яІіЇїЄєҐґ'
for path in sys.argv[1:]:
    text = open(path, encoding='utf-8').read().replace('\\n', ' ')
    text = re.sub(r'\{\{[^}]*\}\}', lambda m: ' ' * len(m.group(0)), text)
    for m in re.finditer(rf'[A-Za-z]*[{CYR}][A-Za-z{CYR}ʼ\']*', text):
        word = m.group(0)
        if re.search('[A-Za-z]', word) and re.search(f'[{CYR}]', word):
            print(path.split('/')[-1], 'MIXED:', word)

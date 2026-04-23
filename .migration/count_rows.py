"""Count rows per table in the MySQL dump, parsing INSERT statements."""
import re

with open('.migration/habbonex_dump.sql', 'r', encoding='utf-8', errors='replace') as f:
    s = f.read()

# Index CREATE TABLE positions
tables = [(m.start(), m.group(1)) for m in re.finditer(r'^CREATE TABLE `([^`]+)`', s, re.M)]
tables.append((len(s), None))

rows = {}
for i in range(len(tables) - 1):
    start, name = tables[i]
    end = tables[i + 1][0]
    section = s[start:end]
    count = 0
    for line in re.finditer(r'^INSERT INTO `' + re.escape(name) + r'` VALUES\s*(.+?);\s*$',
                            section, re.M | re.S):
        body = line.group(1)
        depth = 0
        in_str = False
        esc = False
        for ch in body:
            if esc:
                esc = False
                continue
            if ch == "\\" and in_str:
                esc = True
                continue
            if ch == "'" and not esc:
                in_str = not in_str
                continue
            if in_str:
                continue
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    count += 1
    rows[name] = count

non_directus = sorted([(n, c) for n, c in rows.items() if not n.startswith('directus_')],
                     key=lambda x: -x[1])
print("LEGACY TABLES WITH DATA (sorted by row count):")
for n, c in non_directus:
    if c > 0:
        print(f"  {n:40s} {c:>8}")

zero = [n for n, c in non_directus if c == 0]
print(f"\nLEGACY TABLES EMPTY ({len(zero)}):")
for n in zero:
    print(f"  {n}")

directus = sorted([(n, c) for n, c in rows.items() if n.startswith('directus_')],
                 key=lambda x: -x[1])
print("\nDIRECTUS SYSTEM TABLES (with rows):")
for n, c in directus:
    if c > 0:
        print(f"  {n:40s} {c:>8}")

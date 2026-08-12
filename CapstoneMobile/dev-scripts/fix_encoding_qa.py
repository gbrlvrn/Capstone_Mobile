"""
Fix mojibake (encoding artifacts) in ProfileScreen.jsx and DevotionalScreen.jsx.
The garbled sequences â€" are UTF-8 bytes for the em dash (—) encoded as Latin-1.
"""

import os

files_to_fix = [
    "screens/ProfileScreen.jsx",
    "screens/DevotionalScreen.jsx",
]

# These are the raw UTF-8 bytes of â€" (which is actually —, U+2014 em dash, mis-read as Latin-1)
# em dash U+2014 in UTF-8 is: E2 80 94
EM_DASH_BYTES = b'\xe2\x80\x94'
EM_DASH_UTF8 = '\u2014'.encode('utf-8')  # correct UTF-8 for em dash

# en dash U+2013 in UTF-8 is: E2 80 93
EN_DASH_BYTES = b'\xe2\x80\x93'
EN_DASH_UTF8 = '\u2013'.encode('utf-8')  # correct UTF-8 for en dash

for rel_path in files_to_fix:
    path = os.path.join(os.path.dirname(__file__), rel_path)
    with open(path, 'rb') as f:
        content = f.read()

    original = content

    # The mojibake pattern: file was saved as UTF-8 but read as Latin-1 then re-saved
    # â€" = C3 A2 E2 80 9C (latin-1 misread of UTF-8 em dash sequence)
    # Let's detect and print the actual bytes around the known problem areas
    idx = content.find('â'.encode('utf-8'))
    if idx != -1:
        print(f"Found â at byte {idx} in {rel_path}: {content[idx:idx+8].hex()}")

    # Actual mojibake bytes found by inspection: c3a2 e282ac e2809d
    # â = c3a2, € = e282ac, " (right double quote) = e2809d
    MOJI_EM = b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d'
    print(f"Looking for bytes: {MOJI_EM.hex()} in {rel_path}")

    count = content.count(MOJI_EM)
    print(f"Found {count} occurrences")

    content = content.replace(MOJI_EM, '\u2014'.encode('utf-8'))

    if content != original:
        with open(path, 'wb') as f:
            f.write(content)
        print(f"Fixed {rel_path}")
    else:
        print(f"No changes needed in {rel_path}")

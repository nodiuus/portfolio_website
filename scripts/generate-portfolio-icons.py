from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "psp" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

ICONS = {
    "parent-education": '''
  <path d="M5 21 32 7l27 14-27 14Z" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M14 41v9c9 8 27 8 36 0v-9l-18 9Z" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M55 24v18" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
  <circle cx="55" cy="45" r="3.2" fill="#fff"/>
''',
    "child-education": '''
  <path d="M5 21 32 7l27 14-27 14Z" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M14 41v9c9 8 27 8 36 0v-9l-18 9Z" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M55 24v18" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
  <circle cx="55" cy="45" r="3.2" fill="#fff"/>
''',
    "child-coursework": '''
  <path d="M7 11h22v47l-11-8-11 8Z" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M39 11h22v47l-11-8-11 8Z" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M13 20h10M13 28h10M45 20h10M45 28h10" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
''',
}


def render(name: str, body: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68" role="img" aria-label="{name.replace('-', ' ')}" data-icon-style="flat-bordered-ps3">
{body.strip()}
</svg>
'''


for name, body in ICONS.items():
    (OUT / f"{name}.svg").write_text(render(name, body), encoding="utf-8")

print(f"generated {len(ICONS)} separated flat-bordered PS3 academic icons in {OUT}")

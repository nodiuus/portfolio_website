---
title: "Markdown Renderer Showcase"
published: August 19, 2026
readTime: 4 min read
author: Nisan
category: Meta
tags: meta, markdown, reference
order: 4
summary: A tour of every markdown feature this blog's renderer supports, used as a reference and a test page.
---
This post exists as a working reference for the renderer itself — [marked](https://marked.js.org) with GFM enabled, sanitized through DOMPurify, and syntax-highlighted with highlight.js. If it looks right here, it'll look right anywhere else in the blog.

# Headings

Only H1–H3 get anchor IDs and show up in the "On this page" sidebar; anything deeper still renders, just without a TOC entry.

## A second-level heading

### A third-level heading

#### A fourth-level heading (no TOC entry)

# Inline styles

You can mix **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and `inline code` in the same sentence. A raw autolink also works: https://nisans.dev.

Line breaks matter too — this line ends with two trailing spaces,
and continues on the next line without a new paragraph.

# Lists

Unordered, with nesting:

- Systems programming
  - x86-64 assembly
  - PE/ELF internals
- Web tooling
  - Vite
  - SolidJS

Ordered:

1. Clone the repo
2. Install dependencies
3. Run the dev server
   1. `npm run dev`
   2. Open the printed local URL

Task list (GFM):

- [x] Wire up syntax highlighting
- [x] Sanitize rendered HTML
- [ ] Add footnote support

# Blockquotes

> Simplicity is prerequisite for reliability.
>
> — Edsger W. Dijkstra
>
> > Nested quotes work too, for when someone is quoted quoting someone else.

# Code blocks

Fenced blocks are highlighted per-language. A few of the registered languages:

```typescript
type BlogPost = {
  id: string;
  title: string;
  tags: string[];
};

function readTime(words: number): string {
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
```

```python
def slugify(value: str) -> str:
    return "-".join(value.lower().split())
```

```cpp
#include <cstdio>

int main() {
    std::puts("Hello from a fenced code block.");
    return 0;
}
```

```bash
npm run dev -- --port 5183 --strictPort
```

```json
{ "renderer": "marked", "gfm": true, "sanitize": "dompurify" }
```

An unlabeled block falls back to highlight.js's language auto-detection:

```
SELECT id, title FROM posts WHERE published IS NOT NULL;
```

# Tables

GFM tables, including column alignment:

| Language   | Highlighter | Alias    |
| ---------- | :---------: | -------: |
| TypeScript |    hljs     |    `ts`  |
| C++        |    hljs     |   `cxx`  |
| Shell      |    hljs     |    `sh`  |

# Images and captions

A lone image in its own paragraph, followed by a paragraph containing only italic text, is styled as a figure with a caption:

![Old website photo](/media/blog/old_website.png)

*The previous version of this site, kept around for posterity.*

# Links

[An inline link](https://github.com/nodiuus) and a [reference-style link][repo] both work. External links automatically open in a new tab.

[repo]: https://github.com/nodiuus "nisans's GitHub"

# Raw HTML

Sanitized HTML passes through, so native disclosure widgets work:

<details>
<summary>Click to expand</summary>

Hidden content can include its own markdown, like a `code span` or a **bold** word.

</details>

# Horizontal rule

Everything above the line is one section.

---

Everything below it is another.

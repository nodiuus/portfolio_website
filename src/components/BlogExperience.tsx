import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import glsl from "highlight.js/lib/languages/glsl";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { marked } from "marked";
import { createMemo, For } from "solid-js";
import { getControlLabels } from "../controlHints";
import type { BlogPost, XmbControlScheme } from "../types";

type BlogExperienceProps = {
  posts: BlogPost[];
  activePost: number;
  readerOpen: boolean;
  controlScheme: XmbControlScheme;
  onPostSelect: (index: number) => void;
  onPostActivate: (index: number) => void;
  onReaderClose: () => void;
};

type ArticleHeading = {
  id: string;
  label: string;
  depth: number;
};

const syntaxLanguages = {
  bash,
  cpp,
  csharp,
  css,
  glsl,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  typescript,
  xml,
};

Object.entries(syntaxLanguages).forEach(([name, language]) => hljs.registerLanguage(name, language));

const syntaxAliases: Record<string, string> = {
  "c++": "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  html: "xml",
  svg: "xml",
  sh: "bash",
  shell: "bash",
  py: "python",
  md: "markdown",
  frag: "glsl",
  vert: "glsl",
};

function slugify(value: string) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function compileMarkdown(source: string) {
  const raw = marked.parse(source, { gfm: true }) as string;
  const safe = DOMPurify.sanitize(raw);
  const document = new DOMParser().parseFromString(safe, "text/html");
  const headings: ArticleHeading[] = [];
  const seen = new Map<string, number>();

  document.querySelectorAll("h2, h3").forEach((heading) => {
    const label = heading.textContent?.trim() ?? "Section";
    const base = slugify(label) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    heading.id = id;
    headings.push({ id, label, depth: heading.tagName === "H3" ? 3 : 2 });
  });

  document.querySelectorAll("a").forEach((link) => {
    if (link.origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });

  document.querySelectorAll<HTMLElement>("pre code").forEach((code) => {
    const sourceCode = code.textContent ?? "";
    const languageClass = [...code.classList].find((name) => name.startsWith("language-"));
    const requestedLanguage = languageClass?.slice("language-".length).toLowerCase();
    const language = requestedLanguage ? syntaxAliases[requestedLanguage] ?? requestedLanguage : undefined;

    if (language === "text" || language === "plaintext" || language === "txt") {
      code.classList.add("hljs");
      code.dataset.language = "text";
      return;
    }

    const result = language && hljs.getLanguage(language)
      ? hljs.highlight(sourceCode, { language, ignoreIllegals: true })
      : hljs.highlightAuto(sourceCode);

    code.innerHTML = result.value;
    code.classList.add("hljs");
    code.dataset.language = requestedLanguage ?? result.language ?? "code";
  });

  return { html: DOMPurify.sanitize(document.body.innerHTML), headings };
}

export function BlogExperience(props: BlogExperienceProps) {
  const selected = () => props.posts[props.activePost] ?? props.posts[0];
  const article = createMemo(() => compileMarkdown(selected().markdown));
  const controls = () => getControlLabels(props.controlScheme);

  return (
    <section class="xmb-blog-view" aria-label="Blog" data-reader-open={props.readerOpen}>
      <section class="xmb-items xmb-blog-items" data-child-open={props.readerOpen} aria-label="Blog posts">
        <ul class="xmb-item-list" role="listbox" aria-live="polite">
          <For each={props.posts}>
            {(post, index) => {
              const level = () => index() - props.activePost;
              const active = () => level() === 0;
              return (
                <li
                  class="xmb-item"
                  classList={{ "is-active": active(), "is-above": level() < 0, "is-hidden": level() < -1 || level() > 2 }}
                  role="option"
                  aria-selected={active()}
                  data-item-id={post.id}
                  style={{ "--xmb-item-offset": `calc(${level()} * var(--xmb-item-step))` }}
                  onClick={() => active() ? props.onPostActivate(index()) : props.onPostSelect(index())}
                >
                  <span class="xmb-item-icon-slot" aria-hidden="true">
                    <img class="xmb-item-icon" src="/psp/icons/document.svg" alt="" draggable={false} />
                  </span>
                  <span class="xmb-item-copy">
                    <span class="xmb-item-label">{post.title}</span>
                    <span class="xmb-item-desc">{post.published} · {post.readTime}</span>
                  </span>
                </li>
              );
            }}
          </For>
        </ul>
      </section>

      <article class="xmb-blog-article" data-open={props.readerOpen} aria-hidden={!props.readerOpen}>
        <button type="button" class="xmb-panel-close xmb-blog-article-close" aria-label="Close article" onClick={props.onReaderClose}>
          <span aria-hidden="true">×</span>
        </button>
        <button type="button" class="xmb-blog-article-back" onClick={props.onReaderClose}>
          <img src="/psp/icons/arrow.svg" alt="" aria-hidden="true" />
          <span>Blog</span>
        </button>

        <span class="xmb-blog-article-count" aria-hidden="true">
          {String(props.posts.length - props.activePost).padStart(2, "0")} / {String(props.posts.length).padStart(2, "0")}
        </span>

        <div class="xmb-blog-article-scroll">
          <div class="xmb-blog-article-frame">
            <header class="xmb-blog-article-hero">
              <div class="xmb-blog-article-kicker">
                <img src="/psp/icons/document.svg" alt="" aria-hidden="true" />
                <span class="xmb-blog-article-category">Blog / {selected().category}</span>
              </div>
              <h1>{selected().title}</h1>
              <p>{selected().summary}</p>
              <div class="xmb-blog-byline">
                <span class="xmb-blog-author-avatar" aria-hidden="true">
                  <img src="/psp/icons/ps3/user.png" alt="" />
                </span>
                <span>
                  <strong>{selected().author}</strong>
                  <small>{selected().published} — {selected().readTime}</small>
                </span>
              </div>
            </header>

            <div class="xmb-blog-article-layout">
              <aside class="xmb-blog-toc" aria-label="Table of contents">
                <strong>On this page</strong>
                <nav>
                  <For each={article().headings}>
                    {(heading) => (
                      <a href={`#${heading.id}`} data-depth={heading.depth}>{heading.label}</a>
                    )}
                  </For>
                </nav>
              </aside>

              <main class="xmb-markdown" innerHTML={article().html} />
            </div>
          </div>
        </div>

        <span class="xmb-blog-article-hint" aria-hidden="true">
          <span><kbd>{controls().back}</kbd> Back</span>
          <span>
            {props.controlScheme === "keyboard"
              ? <><kbd>↑</kbd><kbd>↓</kbd></>
              : <kbd>{controls().move}</kbd>}
            {" "}Scroll
          </span>
        </span>
      </article>
    </section>
  );
}

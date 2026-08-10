import type { BlogPost } from "../types";

const markdownFiles = import.meta.glob("../content/blog/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

type FrontMatter = Record<string, string>;

function parsePost(path: string, source: string): BlogPost & { order: number } {
  const normalized = source.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Blog post ${path} is missing front matter.`);

  const metadata = match[1].split("\n").reduce<FrontMatter>((result, line) => {
    const separator = line.indexOf(":");
    if (separator < 0) return result;
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    return result;
  }, {});
  const id = path.split("/").pop()!.replace(/\.md$/i, "");

  return {
    id,
    title: metadata.title ?? id,
    summary: metadata.summary ?? "",
    published: metadata.published ?? "Draft",
    readTime: metadata.readTime ?? "1 min read",
    category: metadata.category ?? "Notes",
    author: metadata.author ?? "Nisan",
    tags: (metadata.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    markdown: match[2].trim(),
    order: Number(metadata.order ?? 999),
  };
}

export const blogPosts: BlogPost[] = Object.entries(markdownFiles)
  .map(([path, source]) => parsePost(path, source))
  .sort((left, right) => left.order - right.order)
  .map(({ order: _order, ...post }) => post);

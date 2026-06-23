import { Fragment, type ReactNode } from "react";

type ContentBlock = { type: "h2" | "h3" | "paragraph" | "quote" | "list"; content: string | string[] };

function parseContent(content: string): ContentBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", content: paragraph.join(" ") }); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push({ type: "list", content: list }); list = []; };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    if (line.startsWith("### ")) { flushParagraph(); flushList(); blocks.push({ type: "h3", content: line.slice(4) }); }
    else if (line.startsWith("## ") || line.startsWith("# ")) { flushParagraph(); flushList(); blocks.push({ type: "h2", content: line.replace(/^#{1,2}\s+/, "") }); }
    else if (line.startsWith("- ")) { flushParagraph(); list.push(line.slice(2)); }
    else if (line.startsWith("> ")) { flushParagraph(); flushList(); blocks.push({ type: "quote", content: line.slice(2) }); }
    else paragraph.push(line);
  }
  flushParagraph(); flushList();
  return blocks;
}

function renderBlock(block: ContentBlock, index: number): ReactNode {
  if (block.type === "h2") return <h2 key={index} className="mt-12 font-display text-3xl leading-tight text-pearl md:text-4xl">{block.content}</h2>;
  if (block.type === "h3") return <h3 key={index} className="mt-9 font-display text-2xl text-pearl md:text-3xl">{block.content}</h3>;
  if (block.type === "quote") return <blockquote key={index} className="my-8 border-l-2 border-gold bg-gold/[0.04] px-6 py-5 font-display text-2xl leading-9 text-champagne">{block.content}</blockquote>;
  if (block.type === "list") return <ul key={index} className="my-6 space-y-3">{(block.content as string[]).map((item) => <li key={item} className="flex gap-3 text-base leading-8 text-white/65"><span className="mt-3 size-1.5 shrink-0 rounded-full bg-gold" />{item}</li>)}</ul>;
  return <p key={index} className="mt-6 text-base leading-8 text-white/65 md:text-[1.05rem] md:leading-9">{block.content}</p>;
}

export function BlogContent({ content, middleCta }: { content: string; middleCta: ReactNode }) {
  const blocks = parseContent(content);
  const insertion = Math.min(Math.max(2, Math.ceil(blocks.length / 3)), blocks.length);
  return <>{blocks.map((block, index) => <Fragment key={index}>{renderBlock(block, index)}{index + 1 === insertion ? middleCta : null}</Fragment>)}</>;
}

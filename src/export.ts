import { jsPDF } from "jspdf";
import type { Block, Comment } from "./store";

/** Build a plain Markdown representation of the current document. */
export function buildMarkdown(blocks: Block[], comments: Comment[]): string {
  const lines: string[] = [];

  blocks.forEach((block, i) => {
    if (i === 0) {
      lines.push(`# ${block.text}`);
    } else {
      lines.push(block.text);
    }
    lines.push("");
  });

  const openComments = comments.filter((c) => !c.resolved);
  if (openComments.length > 0) {
    lines.push("---", "", "## Open comments", "");
    openComments.forEach((c) => {
      const block = blocks.find((b) => b.id === c.blockId);
      const who = c.createdBy === "agent" ? "Agent" : c.author?.name ?? "Someone";
      const on = (block?.text ?? "").slice(0, 40);
      lines.push(`- **${who}** on "${on}${on.length === 40 ? "…" : ""}": ${c.text}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function triggerDownload(filename: string, content: string | Blob, mime?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime ?? "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export the current document as a downloadable Markdown (.md) file. */
export function exportMarkdown(blocks: Block[], comments: Comment[]) {
  const md = buildMarkdown(blocks, comments);
  const title = (blocks[0]?.text || "document").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";
  triggerDownload(`${title}.md`, md, "text/markdown");
}

/** Export the current document as a downloadable PDF, generated fully client-side. */
export function exportPdf(blocks: Block[], comments: Comment[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addSpace = (amount: number) => {
    y += amount;
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  blocks.forEach((block, i) => {
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    }
    const lines: string[] = doc.splitTextToSize(block.text, maxWidth);
    lines.forEach((line: string) => {
      doc.text(line, margin, y);
      addSpace(i === 0 ? 26 : 16);
    });
    addSpace(i === 0 ? 10 : 4);
  });

  const openComments = comments.filter((c) => !c.resolved);
  if (openComments.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Open comments", margin, y);
    addSpace(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    openComments.forEach((c) => {
      const who = c.createdBy === "agent" ? "Agent" : c.author?.name ?? "Someone";
      const lines: string[] = doc.splitTextToSize(`${who}: ${c.text}`, maxWidth);
      lines.forEach((line: string) => {
        doc.text(line, margin, y);
        addSpace(14);
      });
      addSpace(4);
    });
  }

  const title = (blocks[0]?.text || "document").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";
  doc.save(`${title}.pdf`);
}

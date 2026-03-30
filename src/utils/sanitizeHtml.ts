import DOMPurify from "dompurify";

/** AI javobi (cheklangan markdown HTML) — skript / iframe yo‘q */
export function sanitizeAiMessageHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "code", "div", "br", "span"],
    ALLOWED_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
  });
}

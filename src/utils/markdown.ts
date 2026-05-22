// Lightweight markdown-strip / cleanup for AI assistant text.
// Preserves line breaks, removes ** _ ` # > markers, keeps bullet dashes.
export function cleanMarkdown(input: string): string {
  if (!input) return "";
  let s = input.replace(/\r\n/g, "\n");
  // Code fences
  s = s.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  // Bold / italic markers
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");
  s = s.replace(/__(.*?)__/g, "$1");
  s = s.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1$2");
  s = s.replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, "$1$2");
  // Inline code
  s = s.replace(/`([^`]+)`/g, "$1");
  // Headings
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Blockquotes
  s = s.replace(/^\s{0,3}>\s?/gm, "");
  // Bullets normalize: * item -> • item
  s = s.replace(/^\s*[-*+]\s+/gm, "• ");
  // Collapse 3+ newlines
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ProductWithStatus } from "@/types/inventory";
import { sendChatMessage } from "@/services/aiChat";
import { cleanMarkdown } from "@/utils/markdown";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onAssistantMessage: (text: string) => void;
  products: ProductWithStatus[];
  onDeleteProduct: (sku: string) => Promise<{ ok: boolean; error?: string }>;
  connectionState: "connected" | "syncing" | "error" | "idle";
}

const QUICK_ACTIONS = [
  "Out of stock?",
  "Need reorder?",
  "Total value?",
  "Summary",
  "Top brand?",
];

const WELCOME = `Hello! I'm your Inventory AI assistant connected to your Google Sheets via n8n.

I can:
• Check stock levels and alerts
• Update product quantities
• Add or remove products
• Give inventory summaries

What would you like to know?`;

interface PendingDelete {
  sku: string;
  name: string;
}

// Detect "remove/delete X" intent and resolve to a real product
function detectDeleteRequest(text: string, products: ProductWithStatus[]): PendingDelete | null {
  const lower = text.toLowerCase().trim();
  if (!/^(remove|delete|drop)\b/.test(lower) && !/\b(remove|delete)\s+(product|item|sku)\b/.test(lower)) {
    return null;
  }
  // Direct SKU match wins
  const skuMatch = text.match(/PT-\d{3,}/i);
  if (skuMatch) {
    const sku = skuMatch[0].toUpperCase();
    const p = products.find((x) => x.sku.toUpperCase() === sku);
    if (p) return { sku: p.sku, name: p.name };
  }
  // Otherwise match by product name
  const query = lower
    .replace(/^(please\s+)?(can you\s+)?(remove|delete|drop)\s+/, "")
    .replace(/\b(product|item|sku|the)\b/g, "")
    .replace(/[?.!]/g, "")
    .trim();
  if (!query) return null;
  const exact = products.find((p) => p.name.toLowerCase() === query);
  if (exact) return { sku: exact.sku, name: exact.name };
  const partial = products.filter((p) => p.name.toLowerCase().includes(query));
  if (partial.length === 1) return { sku: partial[0].sku, name: partial[0].name };
  return null;
}

export function ChatPanel({ open, onClose, onAssistantMessage, products, onDeleteProduct, connectionState }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const pushAssistant = (content: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content, timestamp: Date.now() }]);
  };

  const send = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // Confirmation handling
    if (pendingDelete) {
      if (/^(y|yes|confirm|ok|sure|delete|proceed)/i.test(text)) {
        const target = pendingDelete;
        setPendingDelete(null);
        setLoading(true);
        const res = await onDeleteProduct(target.sku);
        setLoading(false);
        if (res.ok) {
          pushAssistant(`Removed ${target.name} (${target.sku}) from inventory.`);
        } else {
          pushAssistant(`Couldn't remove ${target.sku}: ${res.error ?? "unknown error"}`);
        }
        return;
      }
      if (/^(n|no|cancel|stop|abort)/i.test(text)) {
        setPendingDelete(null);
        pushAssistant("Okay, cancelled. No changes made.");
        return;
      }
      // Otherwise fall through and treat as new message (clear pending)
      setPendingDelete(null);
    }

    // Delete intent detection (local, never auto-deletes)
    const del = detectDeleteRequest(text, products);
    if (del) {
      setPendingDelete(del);
      pushAssistant(`Are you sure you want to remove **${del.name}** (${del.sku})? Reply "yes" to confirm or "no" to cancel.`);
      return;
    }

    setLoading(true);
    const result = await sendChatMessage(text);
    setLoading(false);
    if (result.ok) {
      const cleaned = cleanMarkdown(result.text);
      pushAssistant(cleaned);
      onAssistantMessage(cleaned);
    } else {
      pushAssistant(result.error);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const statusPill =
    connectionState === "syncing" ? { label: "Syncing", cls: "bg-primary/10 text-primary border-primary/30", dot: "bg-primary animate-pulse" }
    : connectionState === "connected" ? { label: "Connected", cls: "bg-success/10 text-success border-success/30", dot: "bg-success animate-pulse" }
    : connectionState === "error" ? { label: "Connection issue", cls: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" }
    : { label: "Idle", cls: "bg-muted/30 text-muted-foreground border-border", dot: "bg-muted-foreground" };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="sm:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
          />
          <motion.aside
            key="chat"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            style={{
              background: "color-mix(in oklab, hsl(var(--background, 222 47% 6%)) 70%, transparent)",
            }}
            className="fixed z-50 flex flex-col overflow-hidden border border-border/60 shadow-2xl backdrop-blur-2xl
              inset-x-0 bottom-0 h-[85dvh] rounded-t-3xl
              sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[70dvh] sm:max-h-[760px] sm:rounded-3xl"
          >
            <header className="px-5 py-4 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow-primary">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold leading-tight">Inventory AI</div>
                  <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 flex-wrap">
                    <Sparkles className="h-3 w-3" />
                    <span>Powered by RK</span>
                    <span className={cn("ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border", statusPill.cls)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusPill.dot)} />
                      {statusPill.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="h-9 w-9 shrink-0 rounded-lg hover:bg-surface-2 grid place-items-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 py-5 space-y-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {loading && <TypingIndicator />}
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2/60 hover:bg-surface-2 hover:border-primary/40 transition disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="p-3 sm:p-4 border-t border-border/60 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0 bg-surface-2/60 border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/40 transition">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder={pendingDelete ? `Confirm delete ${pendingDelete.sku}? (yes/no)` : "Ask about inventory, update stock, get report…"}
                    className="w-full bg-transparent resize-none outline-none text-sm py-2.5 px-3 max-h-32 placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-40 hover:bg-primary-glow transition"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-surface-2/80 text-foreground rounded-bl-sm border border-border/60"
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface-2/80 border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

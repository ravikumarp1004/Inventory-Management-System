import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export function ChatFab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 h-14 px-5 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold inline-flex items-center gap-2 glow-primary shadow-2xl"
    >
      <MessageCircle className="h-5 w-5" />
      Inventory AI
    </motion.button>
  );
}

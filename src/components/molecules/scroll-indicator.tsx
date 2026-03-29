"use client";

import { motion } from "motion/react";

export function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
    >
      <motion.div
        className="w-px h-8 bg-[#c6c6c6]"
        animate={{ scaleY: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ originY: 0 }}
      />
    </motion.div>
  );
}

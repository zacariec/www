"use client";

import { motion } from "motion/react";

export const ScrollIndicator = () => (
  <motion.div
    animate={{ opacity: 1 }}
    className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
    initial={{ opacity: 0 }}
    transition={{ delay: 1.2 }}
  >
    <motion.div
      animate={{ scaleY: [1, 0.5, 1] }}
      className="w-px h-8 bg-[#c6c6c6]"
      style={{ originY: 0 }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

"use client";

import { AnimatePresence, motion } from "motion/react";

interface PageShellProps {
  children: React.ReactNode;
  pathname?: string;
}

export const PageShell = ({ children, pathname: pathnameProp }: PageShellProps) => {
  const pathname = pathnameProp || (typeof window !== "undefined" ? window.location.pathname : "/");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

"use client";

import { motion } from "motion/react";

export const HorizontalLine = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="h-px bg-[rgba(0,0,0,0.08)] w-full"
    initial={{ scaleX: 0, originX: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
    viewport={{ once: true }}
    whileInView={{ scaleX: 1 }}
  />
);

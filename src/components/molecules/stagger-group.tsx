"use client";

import { motion } from "motion/react";

export const StaggerChildren = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial="hidden"
    viewport={{ once: true, margin: "-30px" }}
    whileInView="visible"
    variants={{
      visible: { transition: { staggerChildren: 0.08 } },
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
      },
    }}
  >
    {children}
  </motion.div>
);

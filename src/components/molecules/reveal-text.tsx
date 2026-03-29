"use client";

import { motion } from "motion/react";

interface RevealTextProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  style?: React.CSSProperties;
}

export function RevealText({
  children,
  className = "",
  delay = 0,
  as = "div",
  style,
}: RevealTextProps) {
  const Tag = motion[as] as React.ComponentType<Record<string, unknown>>;
  return (
    <div className="overflow-hidden">
      <Tag
        className={className}
        style={style}
        initial={{ y: "100%", opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
          duration: 0.7,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {children}
      </Tag>
    </div>
  );
}

export function FadeIn({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

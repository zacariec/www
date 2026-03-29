"use client";

import { motion } from "motion/react";

interface RevealTextProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  style?: React.CSSProperties;
}

export const RevealText = ({
  children,
  className = "",
  delay = 0,
  as = "div",
  style,
}: RevealTextProps) => {
  const Tag = motion[as] as React.ComponentType<Record<string, unknown>>;
  return (
    <div className="overflow-hidden">
      <Tag
        className={className}
        initial={{ y: "100%", opacity: 0 }}
        style={style}
        viewport={{ once: true, margin: "-50px" }}
        whileInView={{ y: 0, opacity: 1 }}
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
};

export const FadeIn = ({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    style={style}
    transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
    viewport={{ once: true, margin: "-30px" }}
    whileInView={{ opacity: 1, y: 0 }}
  >
    {children}
  </motion.div>
);

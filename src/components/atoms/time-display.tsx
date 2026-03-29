"use client";

import { useState, useEffect } from "react";
import { siteConfig } from "@/lib/constants";

export function TimeDisplay({ className = "" }: { className?: string }) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: siteConfig.timezone,
        })
      );
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`text-[10px] tracking-[2px] text-[#c6c6c6] tabular-nums ${className}`}>
      {currentTime} AEST
    </span>
  );
}

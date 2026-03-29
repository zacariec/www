"use client";

import { useState, useEffect } from "react";
import type { NowPlayingData } from "@/lib/spotify";

function SpotifyIcon({ size = 14, color = "#777777" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 123 123"
      fill="none"
      className="animate-[spin_4s_linear_infinite] shrink-0"
    >
      <path
        d="M63.6092 0.0491893C29.8442 -1.29281 1.38618 24.9892 0.049177 58.7542C-1.29282 92.5192 24.9962 120.971 58.7552 122.313C92.5192 123.655 120.972 97.3732 122.314 63.6082C123.65 29.8432 97.3682 1.38519 63.6092 0.0491893ZM89.4332 89.6782C88.6722 91.0202 87.1902 91.6912 85.7472 91.4902C85.3062 91.4282 84.8642 91.2832 84.4502 91.0482C76.3642 86.4462 67.5512 83.4492 58.2572 82.1402C48.9632 80.8312 39.6632 81.2842 30.6212 83.4822C28.6582 83.9572 26.6842 82.7552 26.2092 80.7922C25.7342 78.8302 26.9362 76.8562 28.8992 76.3802C38.8412 73.9642 49.0642 73.4672 59.2752 74.9042C69.4862 76.3412 79.1712 79.6352 88.0682 84.6962C89.8182 85.6972 90.4342 87.9222 89.4382 89.6782H89.4332ZM97.4742 73.6182C96.2272 75.9222 93.3412 76.7832 91.0372 75.5362C81.5762 70.4192 71.3312 67.0582 60.5892 65.5482C49.8472 64.0392 39.0762 64.4472 28.5692 66.7562C27.9982 66.8792 27.4342 66.9022 26.8862 66.8232C24.9792 66.5552 23.3462 65.1352 22.9102 63.1382C22.3452 60.5772 23.9672 58.0442 26.5282 57.4792C38.1422 54.9242 50.0482 54.4712 61.9142 56.1372C73.7752 57.8032 85.0992 61.5172 95.5562 67.1762C97.8652 68.4232 98.7212 71.3032 97.4742 73.6122V73.6182ZM106.388 55.5112C105.213 57.7702 102.77 58.9392 100.387 58.6032C99.7442 58.5142 99.1122 58.3122 98.5032 57.9992C87.4872 52.2672 75.6202 48.4822 63.2342 46.7422C50.8482 45.0032 38.3942 45.3722 26.2262 47.8442C23.0612 48.4872 19.9792 46.4402 19.3362 43.2812C18.6932 40.1162 20.7402 37.0352 23.9002 36.3922C37.3762 33.6572 51.1552 33.2492 64.8612 35.1732C78.5672 37.0962 91.6972 41.2902 103.899 47.6372C106.762 49.1252 107.875 52.6532 106.388 55.5162V55.5112Z"
        fill={color}
      />
    </svg>
  );
}

function ScrollingText({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden max-w-[160px]">
      <div className="inline-flex whitespace-nowrap animate-[scrollText_12s_linear_infinite]">
        <span className="pr-8">{children}</span>
        <span className="pr-8">{children}</span>
      </div>
    </div>
  );
}

interface NowPlayingProps {
  variant?: "header" | "footer";
}

export function NowPlaying({ variant = "footer" }: NowPlayingProps) {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/spotify");
        if (res.ok && mounted) setData(await res.json());
      } catch { /* silent */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!data?.title) return null;

  const isHeader = variant === "header";
  const iconColor = isHeader ? "#777777" : "#555";
  const textColor = isHeader ? "text-[#c6c6c6]" : "text-[#777777]";
  const hoverColor = isHeader ? "hover:text-[#000000]" : "hover:text-[#c6c6c6]";
  const artistColor = isHeader ? "text-[#c6c6c6]/60" : "text-[#555]";

  return (
    <div
      className="flex items-center gap-2 transition-all duration-500"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      tabIndex={0}
    >
      <SpotifyIcon size={14} color={iconColor} />

      <div
        className={`flex items-center gap-2 overflow-hidden transition-all duration-500 ${
          expanded ? "max-w-[220px] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        {data.albumArt && (
          <img
            src={data.albumArt}
            alt=""
            className="w-3.5 h-3.5 rounded-sm opacity-60 shrink-0"
          />
        )}
        <ScrollingText>
          {data.songUrl ? (
            <a
              href={data.songUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[9px] tracking-[1px] ${textColor} ${hoverColor} no-underline transition-colors duration-300 font-[family-name:var(--font-space-grotesk)]`}
            >
              {data.title}
            </a>
          ) : (
            <span className={`text-[9px] tracking-[1px] ${textColor} font-[family-name:var(--font-space-grotesk)]`}>
              {data.title}
            </span>
          )}
          <span className={`text-[8px] ${artistColor} font-[family-name:var(--font-inter)] ml-1`}>
            — {data.artist}
          </span>
        </ScrollingText>
      </div>
    </div>
  );
}

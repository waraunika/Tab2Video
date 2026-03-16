"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const lightTheme = {
  tabColor: "#000000",
  twoColor: "#808080",
  recColor: "#000000",
  recFill: "#1B1B18",
  playColor: "#000000",
  playFill: "#2b2b27",
};

const darkTheme = {
  tabColor: "#ffffff",
  twoColor: "#808080",
  recColor: "#ffffff",
  recFill: "#e4e4e7",
  playColor: "#ffffff",
  playFill: "#d4d4d8",
};

export default function Logo() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<typeof lightTheme>(lightTheme)

  useEffect(() => {
    const getThemeColors = () => {
      return resolvedTheme === 'dark' ? darkTheme : lightTheme;
    };

    const updateTheme = () => {
      setColors(getThemeColors());
    }

    updateTheme();
  }, [resolvedTheme]);

  return (
    <div className="">
      <svg
        width="180"
        height="100"
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized "Tab" with play button */}
        <text
          x="0"
          y="55"
          fill={colors.tabColor}
          fontSize="48"
          fontWeight="bold"
          fontFamily="monospace"
        >
          TAB
        </text>

        <text
          x='90'
          y='55'
          fill={colors.twoColor}
          fontSize={48}
          fontFamily="monospace"
          fontWeight={"bold"}
        >
          2
        </text>

        {/* Video element */}
        <rect
          x="125"
          y="20"
          width="50"
          height="35"
          rx="5"
          stroke={colors.recColor}
          fill={colors.recFill}
          fillOpacity="0.05"
          strokeWidth="1.6"
        />

        <polygon
          points="142,29 142,45 158,37 142,29"
          stroke={colors.playColor}
          fill={colors.playFill}
          fillOpacity={0.2}
          strokeWidth={1.5}
        />

        {/* Subtext */}
        <text x="20" y="80" fill="#6B7280" fontSize="14">
          Guitar Tabs to Video
        </text>
      </svg>
    </div>
  );
}

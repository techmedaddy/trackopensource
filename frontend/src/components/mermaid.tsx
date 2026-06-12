"use client";

import React, { useEffect, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    darkMode: true,
    background: "transparent",
    primaryColor: "#262626", // neutral-800
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#404040", // neutral-700
    lineColor: "#a3a3a3", // neutral-400
    secondaryColor: "#171717", // neutral-900
    tertiaryColor: "#0a0a0a", // neutral-950
    noteBkgColor: "#10b981", // emerald-500
    noteTextColor: "#ffffff",
  },
  fontFamily: "Inter, sans-serif",
});

export function Mermaid({ chart, id }: { chart: string; id: string }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    // Generate the SVG asynchronously
    mermaid.render(id, chart).then((result) => {
      setSvg(result.svg);
    });
  }, [chart, id]);

  return (
    <div 
      className="flex justify-start md:justify-center my-8 p-6 bg-neutral-900 rounded-xl border border-neutral-800 overflow-x-auto w-full hide-scrollbar"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}

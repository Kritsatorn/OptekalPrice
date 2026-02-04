import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--page-bg)",
        panel: "var(--panel-bg)",
        card: "var(--card-bg)",
        "muted-surface": "var(--muted-surface)",
        "t-strong": "var(--text-strong)",
        "t-body": "var(--text-body)",
        "t-muted": "var(--text-muted)",
        divider: "var(--divider)",
        "accent-success": "var(--accent-success)",
        "accent-danger": "var(--accent-danger)",
        "accent-info": "var(--accent-info)",
        "input-bg": "var(--input-bg)",
        "input-border": "var(--input-border)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        button: "var(--shadow-button)",
      },
      borderRadius: {
        panel: "10px",
        card: "12px",
      },
      spacing: {
        "card-p": "18px",
        "grid-gap": "20px",
      },
      fontSize: {
        kicker: ["12px", { lineHeight: "1.35" }],
        label: ["12px", { lineHeight: "1.35" }],
        "title-sm": ["14px", { lineHeight: "1.35" }],
        "title-md": ["15px", { lineHeight: "1.35" }],
        metric: ["24px", { lineHeight: "1.15" }],
        "metric-sm": ["22px", { lineHeight: "1.15" }],
      },
    },
  },
  plugins: [],
};
export default config;

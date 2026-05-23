import { useTheme } from "../lib/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--text)",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}
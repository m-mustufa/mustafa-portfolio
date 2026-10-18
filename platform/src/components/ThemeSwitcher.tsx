"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const choices: Array<{ value: ThemeChoice; label: string; icon: string }> = [
  { value: "system", label: "System theme", icon: "◐" },
  { value: "light", label: "Light theme", icon: "☀" },
  { value: "dark", label: "Dark theme", icon: "☾" },
];

const resolveTheme = (choice: ThemeChoice) => {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (choice: ThemeChoice) => {
  document.documentElement.dataset.theme = resolveTheme(choice);
  document.documentElement.dataset.themeChoice = choice;
};

export function ThemeSwitcher() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem("mustafa-theme");
    const initialChoice: ThemeChoice =
      saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if ((window.localStorage.getItem("mustafa-theme") || "system") === "system") {
        applyTheme("system");
      }
    };

    setChoice(initialChoice);
    applyTheme(initialChoice);
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  const selectTheme = (nextChoice: ThemeChoice) => {
    setChoice(nextChoice);
    window.localStorage.setItem("mustafa-theme", nextChoice);
    applyTheme(nextChoice);
  };

  return (
    <div className="theme-switcher" role="group" aria-label="Choose color theme">
      {choices.map((item) => (
        <button
          aria-label={item.label}
          aria-pressed={choice === item.value}
          className={choice === item.value ? "is-active" : ""}
          key={item.value}
          onClick={() => selectTheme(item.value)}
          title={item.label}
          type="button"
        >
          <span aria-hidden="true">{item.icon}</span>
        </button>
      ))}
    </div>
  );
}

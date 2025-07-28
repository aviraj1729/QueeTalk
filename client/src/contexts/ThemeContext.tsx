import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("theme") as Theme;
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    // Fall back to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Update theme based on system preference
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
    };

    // Add event listener
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Set CSS custom properties for toast styling
    const style = root.style;
    if (theme === "dark") {
      style.setProperty("--toast-bg", "#374151");
      style.setProperty("--toast-color", "#f9fafb");
      style.setProperty("--toast-border", "#4b5563");
    } else {
      style.setProperty("--toast-bg", "#ffffff");
      style.setProperty("--toast-color", "#111827");
      style.setProperty("--toast-border", "#e5e7eb");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

import { useEffect } from "react"
import { useUIStore, type Theme } from "@/stores/ui"

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute("content", theme === "dark" ? "#0C1A26" : "#E8F3FB")
  }
}

export function useTheme() {
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const setTheme = useUIStore((state) => state.setTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return { theme, toggleTheme, setTheme }
}

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "light" | "dark"

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  lightboxOpen: boolean
  selectedImageKey: string | null
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileNavOpen: (open: boolean) => void
  openLightbox: (key: string) => void
  closeLightbox: () => void
  setSelectedImageKey: (key: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "light",
      sidebarCollapsed: false,
      mobileNavOpen: false,
      lightboxOpen: false,
      selectedImageKey: null,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openLightbox: (key) =>
        set({
          selectedImageKey: key,
          lightboxOpen: true,
        }),
      closeLightbox: () =>
        set({
          lightboxOpen: false,
          selectedImageKey: null,
        }),
      setSelectedImageKey: (selectedImageKey) => set({ selectedImageKey }),
    }),
    {
      name: "nangua-gallery-ui",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
)

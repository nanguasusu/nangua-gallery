import { create } from "zustand"
import { persist } from "zustand/middleware"

interface CopyState {
  htmlIncludeTitle: boolean
  setHtmlIncludeTitle: (value: boolean) => void
}

export const useCopyStore = create<CopyState>()(
  persist(
    (set) => ({
      htmlIncludeTitle: false,
      setHtmlIncludeTitle: (htmlIncludeTitle) => set({ htmlIncludeTitle }),
    }),
    {
      name: "nangua-gallery-copy",
      partialize: (state) => ({
        htmlIncludeTitle: state.htmlIncludeTitle,
      }),
      merge: (persisted, current) => {
        const stored = persisted as { htmlIncludeTitle?: unknown } | undefined
        return {
          ...current,
          htmlIncludeTitle: stored?.htmlIncludeTitle === true,
        }
      },
    },
  ),
)

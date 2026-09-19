import { useEffect } from "react"
import { filesFromClipboard } from "@/lib/file-validation"
import { useUploadImages } from "@/hooks/useUploadImages"

export function useClipboardUpload(enabled: boolean) {
  const { queueFiles } = useUploadImages()

  useEffect(() => {
    if (!enabled) {
      return
    }

    const onPaste = (event: ClipboardEvent) => {
      const files = filesFromClipboard(event.clipboardData)
      if (files.length === 0) {
        return
      }

      event.preventDefault()
      void queueFiles(files)
    }

    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [enabled, queueFiles])
}

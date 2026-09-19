import { useEffect, useState } from "react"
import { filesFromDataTransfer } from "@/lib/file-validation"
import { useUploadImages } from "@/hooks/useUploadImages"

export function useDropUpload(enabled: boolean) {
  const [dragging, setDragging] = useState(false)
  const { queueFiles } = useUploadImages()

  useEffect(() => {
    if (!enabled) {
      return
    }

    let depth = 0

    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) {
        return
      }
      event.preventDefault()
      depth += 1
      setDragging(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    }

    const onDragLeave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) {
        return
      }
      event.preventDefault()
      depth = Math.max(0, depth - 1)
      if (depth === 0) {
        setDragging(false)
      }
    }

    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      depth = 0
      setDragging(false)
      const files = filesFromDataTransfer(event.dataTransfer)
      void queueFiles(files)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)

    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
    }
  }, [enabled, queueFiles])

  return { dragging }
}

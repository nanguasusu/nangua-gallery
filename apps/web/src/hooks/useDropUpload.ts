import { useEffect, useRef, useState } from "react"
import { filesFromDataTransfer, isFileDrag } from "@/lib/file-validation"
import { useUploadImages } from "@/hooks/useUploadImages"

export function useDropUpload(enabled: boolean) {
  const [dragging, setDragging] = useState(false)
  const { queueFiles } = useUploadImages()
  const queueFilesRef = useRef(queueFiles)
  queueFilesRef.current = queueFiles

  useEffect(() => {
    if (!enabled) {
      return
    }

    const reset = () => {
      setDragging(false)
    }

    const onDragEnter = (event: DragEvent) => {
      if (!isFileDrag(event.dataTransfer)) {
        return
      }
      event.preventDefault()
      setDragging(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!isFileDrag(event.dataTransfer)) {
        return
      }
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy"
      }
      setDragging(true)
    }

    const onDragLeave = (event: DragEvent) => {
      if (!isFileDrag(event.dataTransfer)) {
        return
      }
      const next = event.relatedTarget
      if (next instanceof Node && document.documentElement.contains(next)) {
        return
      }
      reset()
    }

    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      reset()
      if ((event.target as HTMLElement | null)?.closest?.("[data-upload-dropzone]")) {
        return
      }
      const files = filesFromDataTransfer(event.dataTransfer)
      void queueFilesRef.current(files)
    }

    const onDragEnd = () => {
      reset()
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)
    window.addEventListener("dragend", onDragEnd)

    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("dragend", onDragEnd)
    }
  }, [enabled])

  return { dragging }
}

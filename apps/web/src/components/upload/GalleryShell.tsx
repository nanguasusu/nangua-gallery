import { useEffect, type ReactNode } from "react"
import { useClipboardUpload } from "@/hooks/useClipboardUpload"
import { useDropUpload } from "@/hooks/useDropUpload"
import { useConfig } from "@/hooks/useConfig"
import { UploadDialog } from "@/components/upload/UploadDialog"
import { UploadQueue } from "@/components/upload/UploadQueue"
import { useUploadStore } from "@/stores/uploadStore"

interface GalleryShellProps {
  children: ReactNode
}

export function GalleryShell({ children }: GalleryShellProps) {
  const { dragging } = useDropUpload(true)
  useClipboardUpload(true)
  const config = useConfig()

  useEffect(() => {
    if (config.data?.uploadConcurrency) {
      useUploadStore.getState().setConcurrency(config.data.uploadConcurrency)
    }
  }, [config.data?.uploadConcurrency])

  return (
    <>
      {children}
      {dragging ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-[24px] bg-card px-10 py-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-[20px] font-semibold">松开即可上传</p>
          </div>
        </div>
      ) : null}
      <UploadDialog />
      <UploadQueue />
    </>
  )
}

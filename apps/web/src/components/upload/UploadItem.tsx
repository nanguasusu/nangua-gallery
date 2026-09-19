import { LoaderCircle, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UploadQueueItem } from "@/stores/uploadStore"

interface UploadItemProps {
  item: UploadQueueItem
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

function statusLabel(item: UploadQueueItem) {
  if (item.status === "queued") {
    return "等待中"
  }
  if (item.status === "uploading") {
    if (item.progress == null) {
      return "上传中…"
    }
    return `上传中… ${Math.round(item.progress * 100)}%`
  }
  if (item.status === "success") {
    return "已上传"
  }
  return item.error ?? "失败"
}

export function UploadItem({ item, onRetry, onRemove }: UploadItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name || "未命名图片"}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{statusLabel(item)}</p>
        {item.status === "uploading" ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-accent">
            {item.progress == null ? (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/40" />
            ) : (
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.max(4, Math.round(item.progress * 100))}%` }}
              />
            )}
          </div>
        ) : null}
      </div>
      {item.status === "uploading" ? (
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
      ) : null}
      {item.status === "error" ? (
        <Button type="button" variant="ghost" size="icon" aria-label="重试" onClick={() => onRetry(item.id)}>
          <RotateCcw />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={item.status === "uploading" || item.status === "queued" ? "取消" : "移除"}
        onClick={() => onRemove(item.id)}
      >
        <X />
      </Button>
    </div>
  )
}

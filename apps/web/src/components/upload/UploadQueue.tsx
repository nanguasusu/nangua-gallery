import { useUploadStore } from "@/stores/uploadStore"
import { UploadItem } from "@/components/upload/UploadItem"

export function UploadQueue() {
  const items = useUploadStore((state) => state.items)
  const retry = useUploadStore((state) => state.retry)
  const remove = useUploadStore((state) => state.remove)
  const clearFinished = useUploadStore((state) => state.clearFinished)

  if (items.length === 0) {
    return null
  }

  const finished = items.filter((item) => item.status === "success" || item.status === "error").length

  return (
    <div className="fixed right-3 bottom-[5.5rem] z-40 w-[min(100%-24px,320px)] rounded-[20px] bg-card/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl md:bottom-6 md:right-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">上传队列</p>
        {finished > 0 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={clearFinished}
          >
            清除
          </button>
        ) : null}
      </div>
      <div className="max-h-64 overflow-auto">
        {items.map((item) => (
          <UploadItem
            key={item.id}
            item={item}
            onRetry={retry}
            onRemove={remove}
          />
        ))}
      </div>
    </div>
  )
}

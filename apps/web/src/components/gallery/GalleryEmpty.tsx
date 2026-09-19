import { Images, Upload, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GalleryEmptyProps {
  title?: string
  description?: string
  actionLabel?: string
  icon?: LucideIcon
  onAction?: () => void
}

export function GalleryEmpty({
  title = "还没有照片",
  description = "可以上传图片、拖到这里，或粘贴截图。",
  actionLabel = "上传图片",
  icon: Icon = Images,
  onAction,
}: GalleryEmptyProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-base font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onAction ? (
        <Button type="button" onClick={onAction}>
          <Upload />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

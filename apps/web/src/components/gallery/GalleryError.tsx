import { Button } from "@/components/ui/button"

interface GalleryErrorProps {
  message: string
  onRetry?: () => void
}

export function GalleryError({ message, onRetry }: GalleryErrorProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div>
        <p className="text-base font-medium">加载失败</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          重试
        </Button>
      ) : null}
    </div>
  )
}

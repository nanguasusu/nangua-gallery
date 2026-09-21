import { useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pendingLabel?: string
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel = "处理中…",
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open || pending) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCancel()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, pending, onCancel])

  if (!open || typeof document === "undefined") {
    return null
  }

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center p-4 md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="取消"
        onClick={pending ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-[400px] rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <h2 id="confirm-title" className="text-[17px] font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

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
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="取消"
        onClick={onCancel}
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
    </div>
  )
}

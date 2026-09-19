import { useState } from "react"
import { Button } from "@/components/ui/button"

interface CreateAlbumDialogProps {
  open: boolean
  pending?: boolean
  onClose: () => void
  onCreate: (input: { name: string; description?: string }) => void
}

export function CreateAlbumDialog({
  open,
  pending = false,
  onClose,
  onCreate,
}: CreateAlbumDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 md:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="取消" onClick={onClose} />
      <form
        className="relative w-full max-w-[400px] rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) {
            return
          }
          onCreate({
            name: trimmed,
            description: description.trim() || undefined,
          })
          setName("")
          setDescription("")
        }}
      >
        <h2 className="text-[17px] font-semibold">新建相册</h2>
        <label className="mt-4 block text-sm">
          名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl bg-accent px-3 outline-none ring-ring/30 focus:ring-2"
            maxLength={80}
            autoFocus
          />
        </label>
        <label className="mt-3 block text-sm">
          描述（可选）
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 min-h-20 w-full rounded-xl bg-accent px-3 py-2 outline-none ring-ring/30 focus:ring-2"
            maxLength={400}
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button type="submit" disabled={pending || name.trim().length === 0}>
            {pending ? "创建中…" : "创建"}
          </Button>
        </div>
      </form>
    </div>
  )
}

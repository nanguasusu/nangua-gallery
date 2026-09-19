import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { syncR2Metadata } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { SyncResult } from "@/types/image"

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSync = async () => {
    setPending(true)
    setError(null)
    let cursor: string | undefined
    const totals: SyncResult = {
      scanned: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      hasMore: false,
    }

    try {
      do {
        const page = await syncR2Metadata(cursor)
        totals.scanned += page.scanned
        totals.inserted += page.inserted
        totals.skipped += page.skipped
        totals.failed += page.failed
        totals.hasMore = page.hasMore
        totals.cursor = page.cursor
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)

      setResult(totals)
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "同步失败")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-[17px] font-semibold">设置</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        D1 只保存图片 metadata。同步会扫描现有 R2 对象并补齐缺失记录，不会迁移、重命名或覆盖任何 object key。
      </p>
      <div className="mt-6 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-medium">同步已有 R2 图片</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          把 Cloudflare R2 中已有图片写入 metadata 数据库。可重复执行，已存在的 object_key 会被跳过。
        </p>
        <Button type="button" className="mt-4" disabled={pending} onClick={() => void runSync()}>
          {pending ? "同步中…" : "同步 R2"}
        </Button>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {result ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Scanned</dt>
              <dd className="mt-1 font-medium">{result.scanned}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inserted</dt>
              <dd className="mt-1 font-medium">{result.inserted}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Skipped</dt>
              <dd className="mt-1 font-medium">{result.skipped}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Failed</dt>
              <dd className="mt-1 font-medium">{result.failed}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  )
}

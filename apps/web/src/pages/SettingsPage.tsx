import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  UPLOAD_CONCURRENCY_OPTIONS,
  UPLOAD_SIZE_MB_OPTIONS,
  bytesFromMb,
  mbFromBytes,
  previewObjectKey,
  type UploadConcurrency,
  type UploadSizeMb,
} from "@nangua/shared"
import { Button } from "@/components/ui/button"
import { OptionPills } from "@/components/shared/OptionPills"
import { syncR2Metadata, updateConfig } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useConfig } from "@/hooks/useConfig"
import type { SyncResult } from "@/types/image"

export function SettingsPage() {
  const queryClient = useQueryClient()
  const config = useConfig()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadRoot, setUploadRoot] = useState("uploads")
  const [monthlyFolders, setMonthlyFolders] = useState(true)
  const [maxMb, setMaxMb] = useState<UploadSizeMb>(20)
  const [concurrency, setConcurrency] = useState<UploadConcurrency>(3)

  useEffect(() => {
    if (!config.data) {
      return
    }
    setUploadRoot(config.data.uploadRoot)
    setMonthlyFolders(config.data.monthlyFolders)
    const mb = mbFromBytes(config.data.maxImageBytes)
    if (mb === 10 || mb === 20 || mb === 50) {
      setMaxMb(mb)
    }
    setConcurrency(config.data.uploadConcurrency)
  }, [config.data])

  const saveUpload = useMutation({
    mutationFn: () =>
      updateConfig({
        uploadRoot,
        monthlyFolders,
        maxImageBytes: bytesFromMb(maxMb),
        uploadConcurrency: concurrency,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.config, next)
    },
  })

  const runSync = async () => {
    setPending(true)
    setError(null)
    let cursor: string | undefined
    const totals: SyncResult = {
      scanned: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      sized: 0,
      hasMore: false,
    }

    try {
      do {
        const page = await syncR2Metadata(cursor)
        totals.scanned += page.scanned
        totals.inserted += page.inserted
        totals.skipped += page.skipped
        totals.failed += page.failed
        totals.sized += page.sized ?? 0
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
        <h3 className="font-medium">上传</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          这些选项对之后的新上传生效。已有 R2 对象不会被改动。
        </p>
        <label className="mt-4 block text-sm font-medium">
          根目录
          <input
            value={uploadRoot}
            onChange={(event) => setUploadRoot(event.target.value)}
            className="mt-2 h-10 w-full rounded-full bg-accent px-4 text-sm outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          预览：{previewObjectKey(uploadRoot || "uploads", monthlyFolders)}
        </p>
        <p className="mt-4 text-sm font-medium">按月分目录</p>
        <OptionPills
          value={monthlyFolders ? "on" : "off"}
          options={["on", "off"]}
          labels={{ on: "开启", off: "关闭" }}
          onChange={(value) => setMonthlyFolders(value === "on")}
          ariaLabel="按月分目录"
        />
        <p className="mt-4 text-sm font-medium">单张上限</p>
        <OptionPills
          value={maxMb}
          options={UPLOAD_SIZE_MB_OPTIONS}
          labels={{ 10: "10 MB", 20: "20 MB", 50: "50 MB" }}
          onChange={setMaxMb}
          ariaLabel="单张上限"
        />
        <p className="mt-4 text-sm font-medium">同时上传</p>
        <OptionPills
          value={concurrency}
          options={UPLOAD_CONCURRENCY_OPTIONS}
          onChange={setConcurrency}
          ariaLabel="同时上传数量"
        />
        <Button
          type="button"
          className="mt-5"
          disabled={saveUpload.isPending || config.isPending}
          onClick={() => saveUpload.mutate()}
        >
          {saveUpload.isPending ? "保存中…" : "保存上传设置"}
        </Button>
        {saveUpload.isSuccess ? <p className="mt-3 text-sm text-muted-foreground">已保存</p> : null}
        {saveUpload.isError ? (
          <p className="mt-3 text-sm text-destructive">
            {saveUpload.error instanceof Error ? saveUpload.error.message : "无法保存设置"}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-medium">短链接</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          新上传会生成短链接，格式为当前相册域名下的 <code className="text-foreground">/s/xxxx</code>，跳转到
          {" "}{config.data ? "公开图床原图" : "img.nnann.cc"}。旧图在第一次复制短链或同步时补齐。不会改 object key。
        </p>
      </div>

      <div className="mt-6 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-medium">同步已有 R2 图片</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          把 Cloudflare R2 中已有图片写入 metadata 数据库。可重复执行，已存在的 object_key 会被跳过。缺少宽高或短链的记录会补齐，不会改 object key。
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
            <div>
              <dt className="text-muted-foreground">尺寸补齐</dt>
              <dd className="mt-1 font-medium">{result.sized}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  )
}

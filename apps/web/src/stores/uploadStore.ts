import { create } from "zustand"
import { persist } from "zustand/middleware"
import { toast } from "sonner"
import {
  DEFAULT_UPLOAD_CONCURRENCY,
  DEFAULT_WEBP_QUALITY,
  parseWebpQuality,
  type ImageItem,
  type WebpQuality,
} from "@nangua/shared"
import { ApiError, addImagesToAlbum, prependUploadedImage, uploadImage } from "@/lib/api"
import { queryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"

export type UploadStatus = "queued" | "uploading" | "success" | "error"

export interface UploadQueueItem {
  id: string
  file: File
  progress: number | null
  status: UploadStatus
  error?: string
  result?: ImageItem
  albumId?: string
}

interface UploadState {
  items: UploadQueueItem[]
  concurrency: number
  convertWebp: boolean
  webpQuality: WebpQuality
  setConcurrency: (value: number) => void
  setConvertWebp: (value: boolean) => void
  setWebpQuality: (value: WebpQuality) => void
  enqueue: (files: File[], albumId?: string) => void
  retry: (id: string) => void
  remove: (id: string) => void
  clearFinished: () => void
}

function newId() {
  return crypto.randomUUID()
}

const inflight = new Map<string, AbortController>()

async function runUpload(id: string) {
  const current = useUploadStore.getState().items.find((item) => item.id === id)
  if (!current || current.status !== "queued") {
    return
  }

  const { convertWebp, webpQuality } = useUploadStore.getState()
  const controller = new AbortController()
  inflight.set(id, controller)

  useUploadStore.setState((state) => ({
    items: state.items.map((item) =>
      item.id === id
        ? { ...item, status: "uploading", progress: null, error: undefined }
        : item,
    ),
  }))

  try {
    const response = await uploadImage(
      current.file,
      (progress) => {
        useUploadStore.setState((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, progress } : item,
          ),
        }))
      },
          { convertWebp, quality: webpQuality, signal: controller.signal },
    )

    prependUploadedImage(response.item)
    if (current.albumId) {
      try {
        await addImagesToAlbum(current.albumId, [response.item.id])
        prependUploadedImage(response.item, { albumId: current.albumId })
        void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
        void queryClient.invalidateQueries({ queryKey: queryKeys.album(current.albumId) })
      } catch (caught) {
        toast.error(`${current.file.name || "Image"}: 已上传到资料库，但没能加入当前相册`)
      }
    }
    useUploadStore.setState((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "success",
              progress: 1,
              result: response.item,
            }
          : item,
      ),
    }))
  } catch (caught) {
    if (!useUploadStore.getState().items.some((item) => item.id === id)) {
      return
    }
    if (caught instanceof ApiError && caught.code === "UPLOAD_CANCELLED") {
      useUploadStore.setState((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }))
      return
    }
    const message =
      caught instanceof ApiError ? caught.message : "上传失败"
    useUploadStore.setState((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status: "error", error: message }
          : item,
      ),
    }))
  } finally {
    inflight.delete(id)
    pumpUploads()
  }
}

function pumpUploads() {
  const { items, concurrency } = useUploadStore.getState()
  const uploading = items.filter((item) => item.status === "uploading").length
  const available = concurrency - uploading
  if (available <= 0) {
    return
  }

  const queued = items.filter((item) => item.status === "queued").slice(0, available)
  for (const item of queued) {
    void runUpload(item.id)
  }
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set) => ({
  items: [],
  concurrency: DEFAULT_UPLOAD_CONCURRENCY,
  convertWebp: false,
  webpQuality: DEFAULT_WEBP_QUALITY,
  setConcurrency: (concurrency) => set({ concurrency }),
  setConvertWebp: (convertWebp) => set({ convertWebp }),
  setWebpQuality: (webpQuality) => set({ webpQuality }),
  enqueue: (files, albumId) => {
    if (files.length === 0) {
      return
    }

    set((state) => ({
      items: [
        ...state.items,
        ...files.map((file) => ({
          id: newId(),
          file,
          progress: null,
          status: "queued" as const,
          albumId,
        })),
      ],
    }))

    pumpUploads()
  },
  retry: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status: "queued", progress: null, error: undefined }
          : item,
      ),
    }))
    pumpUploads()
  },
  remove: (id) => {
    inflight.get(id)?.abort()
    inflight.delete(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },
  clearFinished: () => {
    set((state) => ({
      items: state.items.filter((item) => item.status === "queued" || item.status === "uploading"),
    }))
  },
    }),
    {
      name: "nangua-gallery-upload",
      partialize: (state) => ({
        convertWebp: state.convertWebp,
        webpQuality: state.webpQuality,
      }),
      merge: (persisted, current) => {
        const stored = persisted as { convertWebp?: unknown; webpQuality?: unknown } | undefined
        return {
          ...current,
          convertWebp: stored?.convertWebp === true,
          webpQuality: parseWebpQuality(stored?.webpQuality),
        }
      },
    },
  ),
)

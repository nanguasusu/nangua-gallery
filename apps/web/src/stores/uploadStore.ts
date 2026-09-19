import { create } from "zustand"
import { UPLOAD_CONCURRENCY, type ImageItem } from "@nangua/shared"
import { ApiError, prependUploadedImage, uploadImage } from "@/lib/api"

export type UploadStatus = "queued" | "uploading" | "success" | "error"

export interface UploadQueueItem {
  id: string
  file: File
  progress: number | null
  status: UploadStatus
  error?: string
  result?: ImageItem
}

interface UploadState {
  items: UploadQueueItem[]
  enqueue: (files: File[]) => void
  retry: (id: string) => void
  remove: (id: string) => void
  clearFinished: () => void
}

function newId() {
  return crypto.randomUUID()
}

async function runUpload(id: string) {
  const current = useUploadStore.getState().items.find((item) => item.id === id)
  if (!current || current.status !== "queued") {
    return
  }

  useUploadStore.setState((state) => ({
    items: state.items.map((item) =>
      item.id === id
        ? { ...item, status: "uploading", progress: null, error: undefined }
        : item,
    ),
  }))

  try {
    const response = await uploadImage(current.file, (progress) => {
      useUploadStore.setState((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, progress } : item,
        ),
      }))
    })

    prependUploadedImage(response.item)
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
    pumpUploads()
  }
}

function pumpUploads() {
  const { items } = useUploadStore.getState()
  const uploading = items.filter((item) => item.status === "uploading").length
  const available = UPLOAD_CONCURRENCY - uploading
  if (available <= 0) {
    return
  }

  const queued = items.filter((item) => item.status === "queued").slice(0, available)
  for (const item of queued) {
    void runUpload(item.id)
  }
}

export const useUploadStore = create<UploadState>((set) => ({
  items: [],
  enqueue: (files) => {
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
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },
  clearFinished: () => {
    set((state) => ({
      items: state.items.filter((item) => item.status === "queued" || item.status === "uploading"),
    }))
  },
}))

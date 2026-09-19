import type { InfiniteData } from "@tanstack/react-query"
import type {
  Album,
  ApiErrorBody,
  GalleryConfig,
  ImageItem,
  ImageListResponse,
  ImageUploadResponse,
  SyncResult,
} from "@/types/image"
import { queryClient } from "@/lib/query-client"
import { queryKeys, type ImageListFilter } from "@/lib/query-keys"

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

interface SessionResponse {
  authenticated: boolean
}

interface FetchImagesParams extends ImageListFilter {
  cursor?: string
  limit?: number
  signal?: AbortSignal
}

async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<ApiError> {
  let code = "REQUEST_FAILED"
  let message = fallbackMessage

  try {
    const body = (await response.json()) as ApiErrorBody
    if (body.error?.code) {
      code = body.error.code
    }
    if (body.error?.message) {
      message = body.error.message
    }
  } catch {
    // Keep the generic message when the body is not JSON.
  }

  return new ApiError(code, message, response.status)
}

function markSignedOutIfUnauthorized(status: number) {
  if (status === 401) {
    queryClient.setQueryData(queryKeys.session, { authenticated: false })
  }
}

async function apiJson<T>(
  input: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
  })

  if (!response.ok) {
    markSignedOutIfUnauthorized(response.status)
    throw await readApiError(response, fallbackMessage)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function fetchSession(
  signal?: AbortSignal,
): Promise<SessionResponse> {
  return apiJson("/api/session", { method: "GET", signal }, "无法检查登录状态")
}

export async function fetchConfig(signal?: AbortSignal): Promise<GalleryConfig> {
  return apiJson("/api/config", { method: "GET", signal }, "无法加载配置")
}

export async function login(username: string, password: string): Promise<void> {
  await apiJson("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }, "登录失败")
}

export async function logout(): Promise<void> {
  await apiJson("/api/logout", { method: "POST" }, "退出失败")
}

export async function fetchImages(
  params: FetchImagesParams = {},
): Promise<ImageListResponse> {
  const search = new URLSearchParams()
  search.set("limit", String(params.limit ?? 50))
  if (params.cursor) {
    search.set("cursor", params.cursor)
  }
  if (params.search) {
    search.set("search", params.search)
  }
  if (params.favorite) {
    search.set("favorite", "true")
  }
  if (params.deleted) {
    search.set("deleted", "true")
  }
  if (params.albumId) {
    search.set("album", params.albumId)
  }

  return apiJson(`/api/images?${search.toString()}`, {
    method: "GET",
    signal: params.signal,
  }, "照片加载失败")
}

export function uploadImage(
  file: File,
  onProgress?: (ratio: number | null) => void,
): Promise<ImageUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/images")
    xhr.withCredentials = true

    xhr.upload.onprogress = (event) => {
      if (!onProgress) {
        return
      }
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total)
      } else {
        onProgress(null)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ImageUploadResponse)
        } catch {
          reject(new ApiError("UPLOAD_FAILED", "上传响应无效", xhr.status))
        }
        return
      }

      markSignedOutIfUnauthorized(xhr.status)
      try {
        const body = JSON.parse(xhr.responseText) as ApiErrorBody
        reject(
          new ApiError(
            body.error?.code ?? "UPLOAD_FAILED",
            body.error?.message ?? "上传失败",
            xhr.status,
          ),
        )
      } catch {
        reject(new ApiError("UPLOAD_FAILED", "上传失败", xhr.status))
      }
    }

    xhr.onerror = () => {
      reject(new ApiError("UPLOAD_FAILED", "上传失败", 0))
    }

    xhr.onabort = () => {
      reject(new ApiError("UPLOAD_FAILED", "已取消上传", 0))
    }

    const form = new FormData()
    form.append("file", file)
    xhr.send(form)
  })
}

export async function patchImageFavorite(id: string, favorite: boolean): Promise<ImageItem> {
  const body = await apiJson<{ item: ImageItem }>(`/api/images/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite }),
  }, "无法更新收藏")
  return body.item
}

export async function setImagesFavorite(imageIds: string[], favorite: boolean): Promise<string[]> {
  const body = await apiJson<{ updated: string[] }>("/api/images/favorite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds, favorite }),
  }, "无法更新收藏")
  return body.updated
}

export async function trashImages(imageIds: string[]): Promise<string[]> {
  const body = await apiJson<{ deleted: string[] }>("/api/images/trash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds }),
  }, "无法移入回收站")
  return body.deleted
}

export async function restoreImages(imageIds: string[]): Promise<string[]> {
  const body = await apiJson<{ restored: string[] }>("/api/images/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds }),
  }, "无法恢复图片")
  return body.restored
}

export async function permanentlyDeleteImages(imageIds: string[]): Promise<string[]> {
  const body = await apiJson<{ deleted: string[] }>("/api/images/permanent-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds }),
  }, "永久删除失败")
  return body.deleted
}

export async function fetchAlbums(signal?: AbortSignal): Promise<Album[]> {
  const body = await apiJson<{ data: Album[] }>("/api/albums", {
    method: "GET",
    signal,
  }, "无法加载相册")
  return body.data
}

export async function fetchAlbum(id: string, signal?: AbortSignal): Promise<Album> {
  const body = await apiJson<{ data: Album }>(`/api/albums/${encodeURIComponent(id)}`, {
    method: "GET",
    signal,
  }, "无法加载相册")
  return body.data
}

export async function createAlbum(input: { name: string; description?: string }): Promise<Album> {
  const body = await apiJson<{ data: Album }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, "无法创建相册")
  return body.data
}

export async function updateAlbum(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<Album> {
  const body = await apiJson<{ data: Album }>(`/api/albums/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, "无法更新相册")
  return body.data
}

export async function deleteAlbum(id: string): Promise<void> {
  await apiJson(`/api/albums/${encodeURIComponent(id)}`, { method: "DELETE" }, "无法删除相册")
}

export async function addImagesToAlbum(albumId: string, imageIds: string[]): Promise<string[]> {
  const body = await apiJson<{ added: string[] }>(`/api/albums/${encodeURIComponent(albumId)}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds }),
  }, "无法加入相册")
  return body.added
}

export async function removeImagesFromAlbum(albumId: string, imageIds: string[]): Promise<string[]> {
  const body = await apiJson<{ removed: string[] }>(`/api/albums/${encodeURIComponent(albumId)}/images`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds }),
  }, "无法从相册移除")
  return body.removed
}

export async function syncR2Metadata(cursor?: string): Promise<SyncResult> {
  return apiJson("/api/admin/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cursor ? { cursor } : {}),
  }, "同步失败")
}

export function prependUploadedImage(item: ImageItem) {
  const matches = queryClient.getQueriesData<InfiniteData<ImageListResponse, string | undefined>>({
    queryKey: ["images"],
  })

  for (const [key, current] of matches) {
    const filter = (key[1] ?? {}) as ImageListFilter
    if (filter.deleted || filter.favorite || filter.albumId) {
      continue
    }
    if (filter.search && !matchesSearch(item, filter.search)) {
      continue
    }
    queryClient.setQueryData<InfiniteData<ImageListResponse, string | undefined>>(key, prependItem(current, item))
  }
}

export function patchImagesInCache(imageIds: string[], patch: Partial<ImageItem>) {
  const idSet = new Set(imageIds)
  mapImageCaches((item) => (idSet.has(item.id) ? { ...item, ...patch } : item))
}

export function removeImagesFromCache(imageIds: string[]) {
  const idSet = new Set(imageIds)
  mapImageCaches((item) => item, (item) => !idSet.has(item.id))
}

function mapImageCaches(
  mapItem: (item: ImageItem) => ImageItem,
  predicate: (item: ImageItem) => boolean = () => true,
) {
  const matches = queryClient.getQueriesData<InfiniteData<ImageListResponse, string | undefined>>({
    queryKey: ["images"],
  })

  for (const [key, current] of matches) {
    if (!current) {
      continue
    }

    queryClient.setQueryData<InfiniteData<ImageListResponse, string | undefined>>(key, {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map(mapItem).filter(predicate),
      })),
    })
  }
}

function prependItem(
  current: InfiniteData<ImageListResponse, string | undefined> | undefined,
  item: ImageItem,
): InfiniteData<ImageListResponse, string | undefined> {
  if (!current) {
    return {
      pages: [{ items: [item], hasMore: false }],
      pageParams: [undefined],
    }
  }

  if (current.pages.some((page) => page.items.some((existing) => existing.id === item.id || existing.key === item.key))) {
    return current
  }

  const [first, ...rest] = current.pages
  if (!first) {
    return {
      ...current,
      pages: [{ items: [item], hasMore: false }],
    }
  }

  return {
    ...current,
    pages: [{ ...first, items: [item, ...first.items] }, ...rest],
  }
}

function matchesSearch(item: ImageItem, search: string): boolean {
  const needle = search.toLowerCase()
  return (
    item.originalName?.toLowerCase().includes(needle) ||
    item.key.toLowerCase().includes(needle) ||
    item.filename.toLowerCase().includes(needle)
  )
}

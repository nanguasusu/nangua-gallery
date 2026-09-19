import { create } from "zustand"

interface GalleryState {
  selectionMode: boolean
  selectedKeys: string[]
  lastClickedKey: string | null
  uploadDialogOpen: boolean
  pendingDeleteKeys: string[] | null
  pendingPermanentKeys: string[] | null
  addToAlbumOpen: boolean
  enterSelectionMode: () => void
  exitSelectionMode: () => void
  toggleSelected: (key: string) => void
  selectRange: (keys: string[]) => void
  setLastClickedKey: (key: string | null) => void
  openUploadDialog: () => void
  closeUploadDialog: () => void
  requestDelete: (keys: string[]) => void
  clearPendingDelete: () => void
  requestPermanentDelete: (keys: string[]) => void
  clearPendingPermanentDelete: () => void
  openAddToAlbum: () => void
  closeAddToAlbum: () => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  selectionMode: false,
  selectedKeys: [],
  lastClickedKey: null,
  uploadDialogOpen: false,
  pendingDeleteKeys: null,
  pendingPermanentKeys: null,
  addToAlbumOpen: false,
  enterSelectionMode: () =>
    set({
      selectionMode: true,
    }),
  exitSelectionMode: () =>
    set({
      selectionMode: false,
      selectedKeys: [],
      lastClickedKey: null,
      addToAlbumOpen: false,
    }),
  toggleSelected: (key) =>
    set((state) => ({
      selectedKeys: state.selectedKeys.includes(key)
        ? state.selectedKeys.filter((item) => item !== key)
        : [...state.selectedKeys, key],
      lastClickedKey: key,
    })),
  selectRange: (keys) =>
    set({
      selectedKeys: [...new Set(keys)],
    }),
  setLastClickedKey: (lastClickedKey) => set({ lastClickedKey }),
  openUploadDialog: () => set({ uploadDialogOpen: true }),
  closeUploadDialog: () => set({ uploadDialogOpen: false }),
  requestDelete: (keys) =>
    set({
      pendingDeleteKeys: keys,
    }),
  clearPendingDelete: () => set({ pendingDeleteKeys: null }),
  requestPermanentDelete: (keys) =>
    set({
      pendingPermanentKeys: keys,
    }),
  clearPendingPermanentDelete: () => set({ pendingPermanentKeys: null }),
  openAddToAlbum: () => set({ addToAlbumOpen: true }),
  closeAddToAlbum: () => set({ addToAlbumOpen: false }),
}))

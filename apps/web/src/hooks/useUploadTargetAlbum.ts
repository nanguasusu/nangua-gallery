import { useMatch } from "react-router-dom"
import { useAlbum } from "@/hooks/useAlbums"

export function useUploadTargetAlbum() {
  const match = useMatch("/albums/:albumId")
  const albumId = match?.params.albumId
  const album = useAlbum(albumId)

  return { albumId, albumName: album.data?.name }
}

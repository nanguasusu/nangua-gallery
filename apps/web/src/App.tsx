import { QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { PhotosPage } from "@/pages/PhotosPage"
import { FavoritesPage } from "@/pages/FavoritesPage"
import { AlbumsPage } from "@/pages/AlbumsPage"
import { AlbumDetailPage } from "@/pages/AlbumDetailPage"
import { TrashPage } from "@/pages/TrashPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { LoginPage } from "@/pages/LoginPage"
import { useTheme } from "@/hooks/useTheme"
import { useSession } from "@/hooks/useSession"
import { queryClient } from "@/lib/query-client"

function ThemedApp() {
  useTheme()
  const session = useSession()

  if (session.isPending) {
    return <div className="min-h-dvh bg-background" />
  }

  if (!session.data?.authenticated) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<PhotosPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ThemedApp />
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { GalleryShell } from "@/components/upload/GalleryShell"
import { useGalleryStore } from "@/stores/galleryStore"

export function AppLayout() {
  const location = useLocation()

  useEffect(() => {
    useGalleryStore.getState().exitSelectionMode()
  }, [location.pathname])

  return (
    <GalleryShell>
      <div className="min-h-dvh bg-background text-foreground">
        <div className="fixed inset-y-0 left-0 z-30 hidden w-[220px] bg-sidebar/80 backdrop-blur-xl md:block">
          <AppSidebar />
        </div>
        <div className="md:pl-[220px]">
          <AppHeader />
          <main className="px-3 pb-24 pt-2 md:px-8 md:pb-10 md:pt-2">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </GalleryShell>
  )
}

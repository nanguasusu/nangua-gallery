import { Check, LogOut, Menu, Moon, Sun, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SearchInput } from "@/components/search/SearchInput"
import { useTheme } from "@/hooks/useTheme"
import { useUIStore } from "@/stores/ui"
import { useGalleryStore } from "@/stores/galleryStore"
import { logout } from "@/lib/api"
import { queryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"

export function AppHeader() {
  const { theme, toggleTheme } = useTheme()
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen)
  const selectionMode = useGalleryStore((state) => state.selectionMode)
  const enterSelectionMode = useGalleryStore((state) => state.enterSelectionMode)
  const exitSelectionMode = useGalleryStore((state) => state.exitSelectionMode)
  const openUploadDialog = useGalleryStore((state) => state.openUploadDialog)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-background/80 px-4 backdrop-blur-xl md:h-16 md:px-8">
      <h1 className="truncate text-[17px] font-semibold tracking-tight md:text-[21px]">
        南瓜相册
      </h1>
      <div className="flex items-center gap-1.5">
        <SearchInput />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (selectionMode) {
              exitSelectionMode()
            } else {
              enterSelectionMode()
            }
          }}
        >
          {selectionMode ? <X /> : <Check />}
          <span className="hidden sm:inline">{selectionMode ? "取消" : "选择"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="退出登录"
          onClick={() => {
            void logout().finally(() => {
              queryClient.setQueryData(queryKeys.session, { authenticated: false })
              void queryClient.removeQueries({ queryKey: ["images"] })
              void queryClient.removeQueries({ queryKey: queryKeys.albums })
              exitSelectionMode()
            })
          }}
        >
          <LogOut />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="上传图片"
          className="md:hidden"
          onClick={openUploadDialog}
        >
          <Upload />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex"
          onClick={openUploadDialog}
        >
          <Upload />
          上传
        </Button>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="打开菜单"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="md:hidden">
            <div className="px-6 pt-6">
              <SheetTitle>南瓜相册</SheetTitle>
            </div>
            <AppSidebar
              className="bg-transparent"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

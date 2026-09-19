import { NavLink, useLocation } from "react-router-dom"
import { NAV_ITEMS } from "@/components/layout/nav"
import { cn } from "@/lib/utils"
import { useAlbums } from "@/hooks/useAlbums"

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const location = useLocation()
  const albums = useAlbums()
  const albumItems = albums.data ?? []

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const albumActive = item.id === "albums" && location.pathname.startsWith("/albums/")
        return (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-200",
                isActive || albumActive
                  ? "bg-accent font-medium text-foreground"
                  : "text-foreground/80 hover:bg-accent/70",
              )
            }
          >
            <Icon className="size-[18px]" />
            {item.label}
          </NavLink>
        )
      })}
      {albumItems.length > 0 ? (
        <div className="mt-4">
          <p className="px-3 pb-2 text-[12px] font-medium tracking-wide text-muted-foreground">
            相册
          </p>
          {albumItems.slice(0, 12).map((album) => (
            <NavLink
              key={album.id}
              to={`/albums/${album.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex h-9 w-full items-center truncate rounded-xl px-3 text-[13px] transition-colors duration-200",
                  isActive ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                )
              }
            >
              {album.name}
            </NavLink>
          ))}
        </div>
      ) : null}
    </nav>
  )
}

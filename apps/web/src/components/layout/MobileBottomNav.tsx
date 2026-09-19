import { NavLink } from "react-router-dom"
import { NAV_ITEMS } from "@/components/layout/nav"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )
                }
              >
                <Icon className="size-[20px]" />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

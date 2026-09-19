import { Link } from "react-router-dom"
import { Settings } from "lucide-react"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  className?: string
  onNavigate?: () => void
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col px-4 py-6",
        className,
      )}
    >
      <div className="px-3 pb-8">
        <p className="text-[13px] font-medium tracking-wide text-muted-foreground">
          资料库
        </p>
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <Link
        to="/settings"
        onClick={onNavigate}
        className="mt-4 flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      >
        <Settings className="size-[18px]" />
        设置
      </Link>
    </aside>
  )
}

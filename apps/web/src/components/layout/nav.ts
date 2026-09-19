import {
  Folder,
  Heart,
  Images,
  Trash2,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  id: "photos" | "favorites" | "albums" | "trash"
  label: string
  icon: LucideIcon
  to: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: "photos", label: "照片", icon: Images, to: "/" },
  { id: "favorites", label: "收藏", icon: Heart, to: "/favorites" },
  { id: "albums", label: "相册", icon: Folder, to: "/albums" },
  { id: "trash", label: "最近删除", icon: Trash2, to: "/trash" },
]

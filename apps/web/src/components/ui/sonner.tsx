import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useUIStore } from "@/stores/ui"

function Toaster(props: ToasterProps) {
  const theme = useUIStore((state) => state.theme)

  return (
    <Sonner
      theme={theme}
      className="toaster group !z-[80]"
      position="top-center"
      duration={1800}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-2xl border-0 bg-card text-card-foreground shadow-[var(--shadow-card)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SearchInput() {
  const [params, setParams] = useSearchParams()
  const query = params.get("q") ?? ""
  const [value, setValue] = useState(query)
  const [expanded, setExpanded] = useState(query.length > 0)

  useEffect(() => {
    setValue(query)
  }, [query])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = value.trim()
      const current = params.get("q") ?? ""
      if (next === current) {
        return
      }
      const nextParams = new URLSearchParams(params)
      if (next) {
        nextParams.set("q", next)
      } else {
        nextParams.delete("q")
      }
      setParams(nextParams, { replace: true })
    }, 300)

    return () => window.clearTimeout(handle)
  }, [value, params, setParams])

  return (
    <div className="flex items-center">
      <div
        className={cn(
          "flex items-center overflow-hidden rounded-full bg-accent transition-[width] duration-200",
          expanded ? "w-[min(100vw-8rem,16rem)] sm:w-56" : "w-9 sm:w-56",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="搜索"
          className="shrink-0"
          onClick={() => setExpanded(true)}
        >
          <Search />
        </Button>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="搜索文件名、相册或日期"
          className={cn(
            "h-9 w-full bg-transparent pr-2 text-sm outline-none",
            expanded ? "opacity-100" : "pointer-events-none opacity-0 sm:pointer-events-auto sm:opacity-100",
          )}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="清除搜索"
            className="shrink-0"
            onClick={() => {
              setValue("")
              setExpanded(false)
            }}
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

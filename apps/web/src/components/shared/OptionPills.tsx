import { cn } from "@/lib/utils"

interface OptionPillsProps<T extends string | number> {
  value: T
  options: readonly T[]
  labels?: Record<string, string>
  onChange: (value: T) => void
  ariaLabel?: string
}

export function OptionPills<T extends string | number>({
  value,
  options,
  labels,
  onChange,
  ariaLabel,
}: OptionPillsProps<T>) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option === value
        return (
          <button
            key={String(option)}
            type="button"
            className={cn(
              "h-8 rounded-full px-3 text-xs font-medium transition-colors",
              selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:opacity-90",
            )}
            aria-pressed={selected}
            onClick={() => onChange(option)}
          >
            {labels?.[String(option)] ?? String(option)}
          </button>
        )
      })}
    </div>
  )
}

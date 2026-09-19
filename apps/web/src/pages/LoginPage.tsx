import { useState, type FormEvent } from "react"
import { login } from "@/lib/api"
import { queryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { useTheme } from "@/hooks/useTheme"
import { Moon, Sun } from "lucide-react"

export function LoginPage() {
  const { theme, toggleTheme } = useTheme()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(username, password)
      queryClient.setQueryData(queryKeys.session, { authenticated: true })
      await queryClient.invalidateQueries({ queryKey: queryKeys.session })
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "登录失败"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="absolute right-4 top-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-[360px] rounded-[20px] bg-card px-7 py-8 shadow-[var(--shadow-card)]"
      >
        <p className="text-center text-[13px] font-medium tracking-wide text-muted-foreground">
          私人相册
        </p>
        <h1 className="mt-2 text-center text-[22px] font-semibold tracking-tight">
          南瓜相册
        </h1>
        <label className="mt-8 block text-[13px] text-muted-foreground">
          用户名
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            className="mt-1.5 h-11 w-full rounded-xl bg-accent px-3 text-[15px] text-foreground outline-none transition-shadow duration-200 focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <label className="mt-4 block text-[13px] text-muted-foreground">
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-1.5 h-11 w-full rounded-xl bg-accent px-3 text-[15px] text-foreground outline-none transition-shadow duration-200 focus:ring-2 focus:ring-ring/20"
          />
        </label>
        {error ? (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        ) : null}
        <Button
          type="submit"
          className="mt-6 h-11 w-full"
          disabled={submitting}
        >
          {submitting ? "登录中…" : "登录"}
        </Button>
      </form>
    </div>
  )
}

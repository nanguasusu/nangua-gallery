import { useRef, useState, type DragEvent } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void
}

export function UploadDropzone({ onFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setOver(false)
    onFiles([...event.dataTransfer.files])
  }

  return (
    <div
      data-upload-dropzone
      onDragEnter={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
        setOver(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setOver(false)
      }}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-[20px] bg-accent/70 px-6 text-center transition-colors duration-200",
        over && "bg-accent",
      )}
    >
      <Upload className="size-6 text-muted-foreground" />
      <p className="mt-3 text-[15px] font-medium">把图片拖到这里</p>
      <p className="mt-1 text-sm text-muted-foreground">或</p>
      <Button
        type="button"
        className="mt-4"
        onClick={() => inputRef.current?.click()}
      >
        选择文件
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,image/bmp,image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])])
          event.target.value = ""
        }}
      />
    </div>
  )
}

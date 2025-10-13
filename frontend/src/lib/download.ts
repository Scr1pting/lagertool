export async function downloadFile(
  url: string,
  filename: string,
  init?: RequestInit
) {
  if (typeof window === "undefined") {
    throw new Error("Download is only available in the browser.")
  }

  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Download failed (HTTP ${response.status})`)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = "noopener"

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.URL.revokeObjectURL(objectUrl)
}

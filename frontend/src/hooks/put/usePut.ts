import { useCallback } from "react"
import type { ShelfColumn } from "@/types/shelf"
import usePost from "../post/usePost"
import { makeId } from "@/lib/ids"
import useOrgs from "@/store/useOrgs"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface PostShelfPayload {
  id: string
  name: string
  columns: ShelfColumn[]
}

function usePostShelf() {
  const { status, data, error, send } = usePost<unknown, PostShelfPayload>()
  const selectedOrg = useOrgs(s => s.selectedOrg)

  const sendShelf = useCallback((
    columns: ShelfColumn[],
    name: string,
    buildingId: number,
    roomId: number
  ) => {
    if (!selectedOrg) {
      console.error("Missing organization context for creating shelf")
      return
    }

    const shelf = {
      id: makeId(),
      name: name,
      columns: columns
    }

    const url = `${API_BASE_URL}/organisations/${selectedOrg.name}/buildings/${buildingId}/rooms/${roomId}/shelves`
    send(url, shelf)
  }, [selectedOrg, send])

  return { status, data, error, send: sendShelf }
}

export default usePostShelf

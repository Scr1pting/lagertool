import type { ShelfColumn } from "@/types/shelf"
import usePost from "./usePost"
import { makeId } from "@/lib/ids"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''


interface PostShelfPayload {
  id: string
  name: string
  roomId: number
  columns: ShelfColumn[]
}

function usePostShelf() {
  const { status, data, error, send } = usePost<ResponseType, PostShelfPayload>()

  const sendShelf = (
    columns: ShelfColumn[],
    name: string,
    roomId: number
  ) => {
    const shelf = {
      id: makeId(),
      name: name,
      roomId: roomId,
      columns: columns
    }

    send(`${API_BASE_URL}/create_shelf`, shelf)
  }

  return { status, data, error, send: sendShelf }
}

export default usePostShelf

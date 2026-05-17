export const ONLINE_APP_ID = 'crown-lane-duel-link'
export const ONLINE_CLIENT_STORAGE_KEY = 'crown-lane-client-id'
export const ONLINE_ROOM_QUERY_KEY = 'room'
export const ONLINE_OWNER_QUERY_KEY = 'owner'

export function getOrCreateOnlineClientId() {
  const existing =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(ONLINE_CLIENT_STORAGE_KEY)
      : null

  if (existing) {
    return existing
  }

  const created = createCompactId(14)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ONLINE_CLIENT_STORAGE_KEY, created)
  }

  return created
}

export function createOnlineRoomId() {
  return createCompactId(10)
}

export function getOnlineRoomParams() {
  if (typeof window === 'undefined') {
    return {
      roomId: null,
      ownerId: null,
    }
  }

  const url = new URL(window.location.href)
  const roomId = sanitizeToken(url.searchParams.get(ONLINE_ROOM_QUERY_KEY))
  const ownerId = sanitizeToken(url.searchParams.get(ONLINE_OWNER_QUERY_KEY))

  return {
    roomId,
    ownerId,
  }
}

export function buildOnlineRoomUrl(roomId: string, ownerId: string) {
  const url = new URL(window.location.href)
  url.searchParams.set(ONLINE_ROOM_QUERY_KEY, roomId)
  url.searchParams.set(ONLINE_OWNER_QUERY_KEY, ownerId)

  return url.toString()
}

export function replaceOnlineRoomUrl(roomId: string | null, ownerId: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)

  if (roomId && ownerId) {
    url.searchParams.set(ONLINE_ROOM_QUERY_KEY, roomId)
    url.searchParams.set(ONLINE_OWNER_QUERY_KEY, ownerId)
  } else {
    url.searchParams.delete(ONLINE_ROOM_QUERY_KEY)
    url.searchParams.delete(ONLINE_OWNER_QUERY_KEY)
  }

  window.history.replaceState(null, '', url)
}

function sanitizeToken(value: string | null) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

  return normalized.length > 0 ? normalized : null
}

function createCompactId(length: number) {
  const source = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => source[value % source.length]).join('')
}

export type Player = 'ember' | 'ivory'

export interface Piece {
  id: string
  player: Player
  king: boolean
}

export type BoardCell = Piece | null
export type Board = BoardCell[][]

export interface Position {
  row: number
  col: number
}

export interface MoveOption {
  from: Position
  to: Position
  captures: Position[]
  pieceId: string
}

export interface MoveCatalog {
  movesByPiece: Record<string, MoveOption[]>
  captureOnly: boolean
}

export interface MoveRecord {
  id: string
  player: Player
  label: string
  capture: boolean
  crowned: boolean
  turn: number
}

export type WishMode = 'house' | 'mixed' | 'custom'
export type WishSource = 'house' | 'custom'

export interface MatchState {
  board: Board
  currentPlayer: Player
  selectedPieceId: string | null
  forcedPieceId: string | null
  winner: Player | null
  ceremonyId: string | null
  ceremonyOpen: boolean
  wishMode: WishMode
  customWishes: string[]
  selectedWish: string | null
  selectedWishSource: WishSource | null
  history: MoveRecord[]
  themeId: string
}

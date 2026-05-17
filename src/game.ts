import type {
  Board,
  MatchState,
  MoveCatalog,
  MoveOption,
  Piece,
  Player,
  Position,
} from './types'

export const BOARD_SIZE = 8
export const STARTING_PIECES = 12
export const DEFAULT_SERIES_TARGET_WINS = 2
export const MIN_SERIES_TARGET_WINS = 1
export const MAX_SERIES_TARGET_WINS = 7

const SIMPLE_DIRECTIONS: Record<Player, Array<[number, number]>> = {
  ember: [
    [-1, -1],
    [-1, 1],
  ],
  ivory: [
    [1, -1],
    [1, 1],
  ],
}

const DIAGONALS: Array<[number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

export function createInitialBoard(): Board {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  ) as Board

  let emberCount = 1
  let ivoryCount = 1

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isDarkSquare(row, col)) {
        continue
      }

      if (row < 3) {
        board[row][col] = {
          id: `ivory-${ivoryCount}`,
          player: 'ivory',
          king: false,
        }
        ivoryCount += 1
      }

      if (row > 4) {
        board[row][col] = {
          id: `ember-${emberCount}`,
          player: 'ember',
          king: false,
        }
        emberCount += 1
      }
    }
  }

  return board
}

export function createInitialState(themeId: string): MatchState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'ember',
    selectedPieceId: null,
    forcedPieceId: null,
    roundWinner: null,
    winner: null,
    seriesTargetWins: DEFAULT_SERIES_TARGET_WINS,
    seriesWins: {
      ember: 0,
      ivory: 0,
    },
    ceremonyId: null,
    ceremonyOpen: false,
    wishMode: 'mixed',
    customWishes: [],
    selectedWish: null,
    selectedWishSource: null,
    history: [],
    themeId,
  }
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1
}

export function getOpponent(player: Player): Player {
  return player === 'ember' ? 'ivory' : 'ember'
}

export function findPiecePosition(board: Board, pieceId: string): Position | null {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col]?.id === pieceId) {
        return { row, col }
      }
    }
  }

  return null
}

export function getPieceCounts(board: Board): Record<Player, number> {
  const counts: Record<Player, number> = {
    ember: 0,
    ivory: 0,
  }

  for (const row of board) {
    for (const cell of row) {
      if (cell) {
        counts[cell.player] += 1
      }
    }
  }

  return counts
}

export function getKingCounts(board: Board): Record<Player, number> {
  const counts: Record<Player, number> = {
    ember: 0,
    ivory: 0,
  }

  for (const row of board) {
    for (const cell of row) {
      if (cell?.king) {
        counts[cell.player] += 1
      }
    }
  }

  return counts
}

export function countMoves(catalog: MoveCatalog): number {
  return Object.values(catalog.movesByPiece).reduce(
    (total, moves) => total + moves.length,
    0,
  )
}

export function getAvailableMoves(
  board: Board,
  player: Player,
  forcedPieceId?: string | null,
): MoveCatalog {
  const captureMoves: Record<string, MoveOption[]> = {}

  forEachPlayerPiece(board, player, (piece, position) => {
    const moves = getCaptureMoves(board, position)
    if (moves.length > 0) {
      captureMoves[piece.id] = moves
    }
  })

  if (Object.keys(captureMoves).length > 0) {
    if (forcedPieceId) {
      return {
        movesByPiece: captureMoves[forcedPieceId]
          ? { [forcedPieceId]: captureMoves[forcedPieceId] }
          : {},
        captureOnly: true,
      }
    }

    return {
      movesByPiece: captureMoves,
      captureOnly: true,
    }
  }

  if (forcedPieceId) {
    return {
      movesByPiece: {},
      captureOnly: false,
    }
  }

  const simpleMoves: Record<string, MoveOption[]> = {}

  forEachPlayerPiece(board, player, (piece, position) => {
    const moves = getSimpleMoves(board, position)
    if (moves.length > 0) {
      simpleMoves[piece.id] = moves
    }
  })

  return {
    movesByPiece: simpleMoves,
    captureOnly: false,
  }
}

export function getWinner(board: Board, nextPlayer: Player): Player | null {
  const counts = getPieceCounts(board)

  if (counts.ember === 0) {
    return 'ivory'
  }

  if (counts.ivory === 0) {
    return 'ember'
  }

  const nextMoves = getAvailableMoves(board, nextPlayer)

  if (countMoves(nextMoves) === 0) {
    return getOpponent(nextPlayer)
  }

  return null
}

export function applyMove(board: Board, move: MoveOption) {
  const nextBoard = cloneBoard(board)
  const movingPiece = nextBoard[move.from.row][move.from.col]

  if (!movingPiece) {
    throw new Error('Cannot move a missing piece.')
  }

  nextBoard[move.from.row][move.from.col] = null

  for (const captured of move.captures) {
    nextBoard[captured.row][captured.col] = null
  }

  const crowned = shouldCrown(movingPiece, move.to.row)
  nextBoard[move.to.row][move.to.col] = {
    ...movingPiece,
    king: movingPiece.king || crowned,
  }

  return {
    board: nextBoard,
    crowned,
    piece: nextBoard[move.to.row][move.to.col] as Piece,
  }
}

export function formatMoveLabel(move: MoveOption): string {
  const separator = move.captures.length > 0 ? 'x' : '-'
  return `${formatPosition(move.from)}${separator}${formatPosition(move.to)}`
}

export function formatPosition(position: Position): string {
  return `${String.fromCharCode(65 + position.col)}${BOARD_SIZE - position.row}`
}

function getSimpleMoves(board: Board, position: Position): MoveOption[] {
  const piece = board[position.row][position.col]

  if (!piece) {
    return []
  }

  const directions = piece.king ? DIAGONALS : SIMPLE_DIRECTIONS[piece.player]
  const moves: MoveOption[] = []

  for (const [rowOffset, colOffset] of directions) {
    const targetRow = position.row + rowOffset
    const targetCol = position.col + colOffset

    if (!isInsideBoard(targetRow, targetCol) || board[targetRow][targetCol]) {
      continue
    }

    moves.push({
      from: position,
      to: { row: targetRow, col: targetCol },
      captures: [],
      pieceId: piece.id,
    })
  }

  return moves
}

function getCaptureMoves(board: Board, position: Position): MoveOption[] {
  const piece = board[position.row][position.col]

  if (!piece) {
    return []
  }

  const moves: MoveOption[] = []

  for (const [rowOffset, colOffset] of DIAGONALS) {
    const enemyRow = position.row + rowOffset
    const enemyCol = position.col + colOffset
    const targetRow = position.row + rowOffset * 2
    const targetCol = position.col + colOffset * 2

    if (!isInsideBoard(enemyRow, enemyCol) || !isInsideBoard(targetRow, targetCol)) {
      continue
    }

    const middlePiece = board[enemyRow][enemyCol]
    const targetCell = board[targetRow][targetCol]

    if (!middlePiece || middlePiece.player === piece.player || targetCell) {
      continue
    }

    moves.push({
      from: position,
      to: { row: targetRow, col: targetCol },
      captures: [{ row: enemyRow, col: enemyCol }],
      pieceId: piece.id,
    })
  }

  return moves
}

function shouldCrown(piece: Piece, targetRow: number): boolean {
  if (piece.king) {
    return false
  }

  return piece.player === 'ember' ? targetRow === 0 : targetRow === BOARD_SIZE - 1
}

function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

function forEachPlayerPiece(
  board: Board,
  player: Player,
  callback: (piece: Piece, position: Position) => void,
) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col]

      if (piece?.player === player) {
        callback(piece, { row, col })
      }
    }
  }
}

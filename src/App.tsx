import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  BOARD_SIZE,
  STARTING_PIECES,
  applyMove,
  countMoves,
  createInitialState,
  formatMoveLabel,
  getAvailableMoves,
  getKingCounts,
  getOpponent,
  getPieceCounts,
  getWinner,
  isDarkSquare,
} from './game'
import type { MatchState, MoveOption, Player } from './types'

const STORAGE_KEY = 'crown-lane-checkers'

const PLAYER_META: Record<
  Player,
  {
    badge: string
    name: string
    tone: string
  }
> = {
  ember: {
    badge: 'E',
    name: 'Ember Side',
    tone: 'Warm pressure, sharp tempo.',
  },
  ivory: {
    badge: 'I',
    name: 'Ivory Side',
    tone: 'Cool patience, calm counterplay.',
  },
}

const THEMES = [
  {
    id: 'sunset',
    label: 'Sunset Club',
    note: 'Warm wood, bright pieces, evening duel energy.',
  },
  {
    id: 'mint',
    label: 'Mint Studio',
    note: 'Soft contrast for a cleaner, focused board.',
  },
  {
    id: 'midnight',
    label: 'Midnight Signal',
    note: 'Dark editorial mode for dramatic matches.',
  },
] as const

function App() {
  const [state, setState] = useState<MatchState>(() => loadMatchState())

  const theme = THEMES.find((entry) => entry.id === state.themeId) ?? THEMES[0]
  const availableMoves = useMemo(
    () => getAvailableMoves(state.board, state.currentPlayer, state.forcedPieceId),
    [state.board, state.currentPlayer, state.forcedPieceId],
  )

  const selectedMoves = state.selectedPieceId
    ? availableMoves.movesByPiece[state.selectedPieceId] ?? []
    : []

  const selectablePieceIds = Object.keys(availableMoves.movesByPiece)
  const selectablePieceSet = new Set(selectablePieceIds)
  const forcedPieceSet = new Set(
    availableMoves.captureOnly ? selectablePieceIds : [],
  )
  const destinationSet = new Set(
    selectedMoves.map((move) => `${move.to.row}-${move.to.col}`),
  )

  const pieceCounts = useMemo(() => getPieceCounts(state.board), [state.board])
  const kingCounts = useMemo(() => getKingCounts(state.board), [state.board])
  const emberMoves = useMemo(
    () => countMoves(getAvailableMoves(state.board, 'ember')),
    [state.board],
  )
  const ivoryMoves = useMemo(
    () => countMoves(getAvailableMoves(state.board, 'ivory')),
    [state.board],
  )

  const totalPieces = pieceCounts.ember + pieceCounts.ivory
  const phaseLabel =
    totalPieces > 16
      ? 'Opening ritual'
      : totalPieces > 8
        ? 'Midgame pressure'
        : 'Endgame nerves'

  const pressureLabel = describePressure(emberMoves, ivoryMoves)
  const storyText = describeStory({
    ...state,
    pieceCounts,
    kingCounts,
    emberMoves,
    ivoryMoves,
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function handleSquareClick(row: number, col: number) {
    if (state.winner) {
      return
    }

    const piece = state.board[row][col]

    if (piece && piece.player === state.currentPlayer) {
      const canMove = selectablePieceSet.has(piece.id)

      if (!canMove) {
        return
      }

      setState((previous) => ({
        ...previous,
        selectedPieceId:
          previous.selectedPieceId === piece.id && !previous.forcedPieceId
            ? null
            : piece.id,
      }))
      return
    }

    if (!state.selectedPieceId) {
      return
    }

    const chosenMove = selectedMoves.find(
      (move) => move.to.row === row && move.to.col === col,
    )

    if (chosenMove) {
      executeMove(chosenMove)
      return
    }

    if (!state.forcedPieceId) {
      setState((previous) => ({
        ...previous,
        selectedPieceId: null,
      }))
    }
  }

  function executeMove(move: MoveOption) {
    setState((previous) => {
      const { board, crowned, piece } = applyMove(previous.board, move)
      const followUpMoves = getAvailableMoves(board, previous.currentPlayer, piece.id)
      const comboContinues =
        move.captures.length > 0 && countMoves(followUpMoves) > 0
      const nextPlayer = comboContinues
        ? previous.currentPlayer
        : getOpponent(previous.currentPlayer)
      const winner = comboContinues ? null : getWinner(board, nextPlayer)

      return {
        ...previous,
        board,
        currentPlayer: nextPlayer,
        selectedPieceId: comboContinues ? piece.id : null,
        forcedPieceId: comboContinues ? piece.id : null,
        winner,
        history: [
          ...previous.history,
          {
            id: `${move.pieceId}-${previous.history.length + 1}`,
            player: previous.currentPlayer,
            label: formatMoveLabel(move),
            capture: move.captures.length > 0,
            crowned,
            turn: previous.history.length + 1,
          },
        ],
      }
    })
  }

  function resetMatch() {
    setState((previous) => createInitialState(previous.themeId))
  }

  function cycleTheme() {
    setState((previous) => {
      const currentIndex = THEMES.findIndex((entry) => entry.id === previous.themeId)
      const nextTheme = THEMES[(currentIndex + 1) % THEMES.length] ?? THEMES[0]

      return {
        ...previous,
        themeId: nextTheme.id,
      }
    })
  }

  function selectTheme(themeId: string) {
    setState((previous) => ({
      ...previous,
      themeId,
    }))
  }

  function clearSelection() {
    if (state.forcedPieceId) {
      return
    }

    setState((previous) => ({
      ...previous,
      selectedPieceId: null,
    }))
  }

  const winnerMeta = state.winner ? PLAYER_META[state.winner] : null
  const activeMeta = PLAYER_META[state.currentPlayer]

  return (
    <div className="app-shell" data-theme={theme.id}>
      <div className="ambient ambient--one" aria-hidden="true"></div>
      <div className="ambient ambient--two" aria-hidden="true"></div>

      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Checkers, but treated like a real product</p>
          <h1>Crown Lane</h1>
          <p className="hero-text">
            Локальная шашечная дуэль для двух игроков на одном экране: с полными
            базовыми правилами, автосохранением и подачей, которая ощущается не
            как учебный проект, а как стильный digital-продукт.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Current phase</span>
            <strong>{phaseLabel}</strong>
            <p>{pressureLabel}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Live rule</span>
            <strong>{availableMoves.captureOnly ? 'Capture is mandatory' : 'Free diagonal move'}</strong>
            <p>Auto-save is active in LocalStorage.</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Creative angle</span>
            <strong>Fast ritual for friends</strong>
            <p>Three visual moods turn the same match into different vibes.</p>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--players">
          <div className="panel-heading">
            <p className="panel-label">Sides</p>
            <h2>Match pulse</h2>
          </div>

          {(['ember', 'ivory'] as Player[]).map((player) => {
            const meta = PLAYER_META[player]
            const isActive = state.currentPlayer === player && !state.winner
            const hasWon = state.winner === player
            const captured = STARTING_PIECES - pieceCounts[player]

            return (
              <article
                key={player}
                className={`player-card ${isActive ? 'player-card--active' : ''} ${
                  hasWon ? 'player-card--winner' : ''
                }`}
              >
                <div className="player-card__top">
                  <span className={`player-chip player-chip--${player}`}>{meta.badge}</span>
                  <div>
                    <h3>{meta.name}</h3>
                    <p>{meta.tone}</p>
                  </div>
                </div>

                <div className="player-card__stats">
                  <div>
                    <span>Pieces left</span>
                    <strong>{pieceCounts[player]}</strong>
                  </div>
                  <div>
                    <span>Kings</span>
                    <strong>{kingCounts[player]}</strong>
                  </div>
                  <div>
                    <span>Captured</span>
                    <strong>{captured}</strong>
                  </div>
                </div>
              </article>
            )
          })}

          <article className="insight-card">
            <p className="panel-label">Storyline</p>
            <h3>{state.winner ? `${winnerMeta?.name} takes the set` : `${activeMeta.name} to move`}</h3>
            <p>{storyText}</p>
          </article>

          <article className="insight-card">
            <p className="panel-label">Room rules</p>
            <ul className="rule-list">
              <li>Ход обычной шашки только по диагонали вперед.</li>
              <li>Взятие обязательно, серия взятий продолжается той же фигурой.</li>
              <li>Дамка ходит на 1 клетку по диагонали в любую сторону.</li>
            </ul>
          </article>
        </section>

        <section className="board-section">
          <div className="board-toolbar">
            <div>
              <p className="panel-label">Board status</p>
              <h2>
                {state.winner
                  ? `${winnerMeta?.name} wins`
                  : `${activeMeta.name} controls the next move`}
              </h2>
              <p className="board-toolbar__text">
                {getStatusText(state, selectedMoves.length, availableMoves.captureOnly)}
              </p>
            </div>

            <div className="toolbar-actions">
              <button type="button" className="ghost-button" onClick={cycleTheme}>
                Rotate palette
              </button>
              <button type="button" className="ghost-button" onClick={clearSelection}>
                Clear focus
              </button>
              <button type="button" className="solid-button" onClick={resetMatch}>
                New match
              </button>
            </div>
          </div>

          <div className="board-frame">
            <div className="board-grid" role="grid" aria-label="Checkers board">
              {Array.from({ length: BOARD_SIZE }, (_, row) =>
                Array.from({ length: BOARD_SIZE }, (_, col) => {
                  const piece = state.board[row][col]
                  const squareKey = `${row}-${col}`
                  const isSelected = piece?.id === state.selectedPieceId
                  const isTarget = destinationSet.has(squareKey)
                  const isPlayable = piece ? selectablePieceSet.has(piece.id) : false
                  const isForcedSource = piece ? forcedPieceSet.has(piece.id) : false

                  return (
                    <button
                      key={squareKey}
                      type="button"
                      role="gridcell"
                      aria-label={`Square ${String.fromCharCode(65 + col)}${BOARD_SIZE - row}`}
                      className={`square ${isDarkSquare(row, col) ? 'square--dark' : 'square--light'} ${
                        isSelected ? 'square--selected' : ''
                      } ${isTarget ? 'square--target' : ''} ${
                        isForcedSource ? 'square--forced' : ''
                      }`}
                      onClick={() => handleSquareClick(row, col)}
                    >
                      {col === 0 ? <span className="square-rank">{BOARD_SIZE - row}</span> : null}
                      {row === BOARD_SIZE - 1 ? (
                        <span className="square-file">{String.fromCharCode(65 + col)}</span>
                      ) : null}

                      {isTarget ? <span className="move-dot" aria-hidden="true"></span> : null}

                      {piece ? (
                        <span
                          className={`piece piece--${piece.player} ${
                            piece.king ? 'piece--king' : ''
                          } ${isPlayable ? 'piece--playable' : ''}`}
                        >
                          {piece.king ? <span className="piece-crown">K</span> : null}
                        </span>
                      ) : null}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        </section>

        <section className="panel panel--right">
          <div className="panel-heading">
            <p className="panel-label">Polish</p>
            <h2>Product layer</h2>
          </div>

          <article className="insight-card">
            <p className="panel-label">Visual moods</p>
            <div className="theme-list">
              {THEMES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`theme-button ${state.themeId === entry.id ? 'theme-button--active' : ''}`}
                  onClick={() => selectTheme(entry.id)}
                >
                  <strong>{entry.label}</strong>
                  <span>{entry.note}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="insight-card">
            <p className="panel-label">Move feed</p>
            <div className="history-list">
              {state.history.length === 0 ? (
                <p className="empty-state">
                  Матч только начался. Выберите фигуру с подсветкой и сделайте первый ход.
                </p>
              ) : (
                [...state.history].reverse().map((entry) => (
                  <div key={entry.id} className="history-row">
                    <span className={`history-chip history-chip--${entry.player}`}>
                      {PLAYER_META[entry.player].badge}
                    </span>
                    <div>
                      <strong>{entry.label}</strong>
                      <p>
                        Move {entry.turn}
                        {entry.capture ? ' • capture' : ' • slide'}
                        {entry.crowned ? ' • crowned' : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="insight-card">
            <p className="panel-label">Why it feels bigger</p>
            <ul className="rule-list">
              <li>Сохранение партии после перезагрузки страницы.</li>
              <li>Подсветка легальных ходов и обязательных взятий.</li>
              <li>Небанальная визуальная подача вместо обычной “доски на белом фоне”.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  )
}

function loadMatchState(): MatchState {
  const fallback = createInitialState(THEMES[0].id)

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return fallback
    }

    const parsed = JSON.parse(saved) as Partial<MatchState>

    if (!parsed.board || !parsed.currentPlayer || !parsed.themeId) {
      return fallback
    }

    return {
      board: parsed.board,
      currentPlayer: parsed.currentPlayer,
      selectedPieceId: parsed.forcedPieceId ?? parsed.selectedPieceId ?? null,
      forcedPieceId: parsed.forcedPieceId ?? null,
      winner: parsed.winner ?? null,
      history: parsed.history ?? [],
      themeId: parsed.themeId,
    }
  } catch {
    return fallback
  }
}

function getStatusText(
  state: MatchState,
  selectedMovesCount: number,
  captureOnly: boolean,
): string {
  if (state.winner) {
    return 'Нажмите New match, чтобы быстро начать новую партию.'
  }

  if (state.forcedPieceId) {
    return 'Серия взятий продолжается: нужно продолжить ход той же фигурой.'
  }

  if (captureOnly) {
    return 'На поле есть обязательное взятие. Подсвеченные фигуры могут атаковать.'
  }

  if (selectedMovesCount > 0) {
    return 'Фигура выбрана. Целевые клетки отмечены мягким свечением.'
  }

  return 'Выберите любую подсвеченную фигуру, чтобы увидеть доступные ходы.'
}

function describePressure(emberMoves: number, ivoryMoves: number): string {
  if (emberMoves === ivoryMoves) {
    return 'Both sides have the same number of legal options.'
  }

  const leader = emberMoves > ivoryMoves ? 'Ember' : 'Ivory'
  const gap = Math.abs(emberMoves - ivoryMoves)
  return `${leader} has ${gap} extra route${gap > 1 ? 's' : ''} right now.`
}

function describeStory(context: {
  currentPlayer: Player
  winner: Player | null
  forcedPieceId: string | null
  pieceCounts: Record<Player, number>
  kingCounts: Record<Player, number>
  emberMoves: number
  ivoryMoves: number
}) {
  if (context.winner) {
    return `${PLAYER_META[context.winner].name} closes the board with cleaner tempo and better structure.`
  }

  if (context.forcedPieceId) {
    return 'Комбо уже началось: закончить серию взятий важнее, чем искать новый красивый ход.'
  }

  if (context.kingCounts.ember !== context.kingCounts.ivory) {
    const leader =
      context.kingCounts.ember > context.kingCounts.ivory ? 'Ember Side' : 'Ivory Side'
    return `${leader} already owns the crown advantage, so the board is tilting around mobility.`
  }

  if (context.pieceCounts.ember !== context.pieceCounts.ivory) {
    const leader =
      context.pieceCounts.ember > context.pieceCounts.ivory ? 'Ember Side' : 'Ivory Side'
    return `${leader} leads on material, but one forced capture could swing the rhythm back.`
  }

  if (Math.abs(context.emberMoves - context.ivoryMoves) >= 2) {
    return 'Space control is becoming the main story: one side can breathe more freely than the other.'
  }

  return 'The duel is balanced for now, so positioning and patience matter more than speed.'
}

export default App

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
import type {
  MatchState,
  MoveOption,
  Player,
  WishMode,
  WishSource,
} from './types'

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

const HOUSE_WISHES = [
  'Сними 10-секундную сторис как будто ты супер-уверенный motivational speaker.',
  'Запиши voice-сообщение другу в стиле спортивного комментатора.',
  'Скажи три пафосных фразы как будто проиграл финал чемпионата мира.',
  'Сними мини-обзор на ближайший предмет так, будто это luxury product.',
  'Сделай 15-секундный pitch своей самой странной бизнес-идеи.',
  'Отправь другу один максимально драматичный комплимент.',
  'Сними короткое видео “мой comeback arc начнется завтра”.',
  'Изобрази победную речь, хотя именно ты проиграл.',
  'Придумай слоган для своей игры в шашки и произнеси его вслух.',
  'Сделай селфи с лицом “я точно все контролировал”.',
  'Запиши 5 секунд, где ты смотришь в камеру и говоришь “the board remembers”.',
  'Объясни свое поражение так, будто это был гениальный стратегический план.',
] as const

const WISH_MODE_META: Record<
  WishMode,
  {
    label: string
    description: string
  }
> = {
  house: {
    label: 'House',
    description: 'Только встроенные кринжовые и прикольные задания.',
  },
  mixed: {
    label: 'Mixed',
    description: 'Смешиваем фирменные задания проекта и ваши личные.',
  },
  custom: {
    label: 'Custom',
    description: 'Только ваши собственные желания из challenge vault.',
  },
}

interface CeremonyScene {
  id: string
  eyebrow: string
  stamp: string
  title: string
  subtitle: string
  verdict: string
  ribbons: string[]
  stickers: string[]
}

const CEREMONY_SCENES: CeremonyScene[] = [
  {
    id: 'royal-roast',
    eyebrow: 'Royal roast ceremony',
    stamp: 'CROWN REVOKED',
    title: 'The throne has moved on.',
    subtitle:
      'Tonight the room witnessed a luxurious tactical collapse with premium dramatic timing.',
    verdict: 'the royal roast committee has collected enough evidence.',
    ribbons: ['too much confidence', 'not enough defense', 'audience saw everything'],
    stickers: ['BROKEN CROWN', 'ELITE FUMBLE', 'OOPS'],
  },
  {
    id: 'skill-issue',
    eyebrow: 'Emergency broadcast',
    stamp: 'SKILL ISSUE CONFIRMED',
    title: 'Pride level critically low.',
    subtitle:
      'Sensors detected severe diagonal confusion and an immediate shortage of comeback energy.',
    verdict: 'the tactical support line cannot save this performance anymore.',
    ribbons: ['critical collapse', 'confidence offline', 'defense unavailable'],
    stickers: ['404 PRIDE', 'TACTICAL PANIC', 'NO EXCUSES'],
  },
  {
    id: 'award-night',
    eyebrow: 'Totally serious award show',
    stamp: 'BEST SUPPORTING LOSER',
    title: 'A standing ovation for the downfall.',
    subtitle:
      'The academy applauds the courage it took to lose this elegantly in front of the whole board.',
    verdict: 'your acceptance speech has been replaced with respectful silence.',
    ribbons: ['cinematic defeat', 'dramatic ending', 'memorable downfall'],
    stickers: ['RED CARPET L', 'OVERSERVED EGO', 'TRY AGAIN STAR'],
  },
  {
    id: 'public-verdict',
    eyebrow: 'Public verdict protocol',
    stamp: 'THE BOARD HAS SPOKEN',
    title: 'Your excuses were denied.',
    subtitle:
      'A unanimous panel of invisible spectators agrees: that ending belonged in the group chat.',
    verdict: 'the court of vibes has delivered its final judgement.',
    ribbons: ['group chat material', 'caught in 4k', 'comeback denied'],
    stickers: ['VERDICT FINAL', 'MIC DROP', 'PUBLIC LORE'],
  },
]

interface WishChoice {
  source: WishSource
  text: string
}

function App() {
  const [state, setState] = useState<MatchState>(() => loadMatchState())
  const [customWishDraft, setCustomWishDraft] = useState('')

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

  const winnerMeta = state.winner ? PLAYER_META[state.winner] : null
  const losingPlayer = state.winner ? getOpponent(state.winner) : null
  const loserMeta = losingPlayer ? PLAYER_META[losingPlayer] : null
  const wishModeMeta = WISH_MODE_META[state.wishMode]
  const vaultPreview = getVaultPreview(state)
  const winnerCeremony = state.ceremonyId
    ? CEREMONY_SCENES.find((scene) => scene.id === state.ceremonyId) ?? null
    : null
  const ceremonyIsOpen = Boolean(
    state.ceremonyOpen && state.winner && winnerMeta && loserMeta && winnerCeremony,
  )

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
      const ceremonyId = winner ? pickCeremonySceneId() : null
      const wishChoice = winner ? pickRandomWishChoice(previous) : null

      return {
        ...previous,
        board,
        currentPlayer: nextPlayer,
        selectedPieceId: comboContinues ? piece.id : null,
        forcedPieceId: comboContinues ? piece.id : null,
        winner,
        ceremonyId,
        ceremonyOpen: Boolean(ceremonyId),
        selectedWish: wishChoice?.text ?? null,
        selectedWishSource: wishChoice?.source ?? null,
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
    setState((previous) => ({
      ...createInitialState(previous.themeId),
      wishMode: previous.wishMode,
      customWishes: previous.customWishes,
    }))
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

  function dismissCeremony() {
    setState((previous) => ({
      ...previous,
      ceremonyOpen: false,
    }))
  }

  function rerollWish() {
    setState((previous) => {
      if (!previous.winner) {
        return previous
      }

      const wishChoice = pickRandomWishChoice(previous)

      return {
        ...previous,
        selectedWish: wishChoice.text,
        selectedWishSource: wishChoice.source,
      }
    })
  }

  function setWishMode(mode: WishMode) {
    setState((previous) => ({
      ...previous,
      wishMode: mode,
    }))
  }

  function addCustomWish() {
    const sanitized = sanitizeWish(customWishDraft)

    if (!sanitized) {
      return
    }

    setState((previous) => ({
      ...previous,
      customWishes: [...previous.customWishes, sanitized],
    }))
    setCustomWishDraft('')
  }

  function removeCustomWish(indexToRemove: number) {
    setState((previous) => ({
      ...previous,
      customWishes: previous.customWishes.filter((_, index) => index !== indexToRemove),
    }))
  }

  const activeMeta = PLAYER_META[state.currentPlayer]
  const winnerPieces = state.winner ? pieceCounts[state.winner] : 0
  const loserPieces = losingPlayer ? pieceCounts[losingPlayer] : 0
  const winnerKings = state.winner ? kingCounts[state.winner] : 0
  const loserKings = losingPlayer ? kingCounts[losingPlayer] : 0
  const selectedWishLabel = state.selectedWishSource
    ? getWishSourceLabel(state.selectedWishSource)
    : null

  return (
    <div
      className={`app-shell ${ceremonyIsOpen ? 'app-shell--ceremony-open' : ''}`}
      data-theme={theme.id}
    >
      <div className="ambient ambient--one" aria-hidden="true"></div>
      <div className="ambient ambient--two" aria-hidden="true"></div>

      {ceremonyIsOpen && winnerCeremony && winnerMeta && loserMeta && losingPlayer ? (
        <section
          className={`ceremony-overlay ceremony-overlay--${winnerCeremony.id}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ceremony-title"
        >
          <div className="ceremony-haze" aria-hidden="true"></div>
          <div className="ceremony-spotlight ceremony-spotlight--left" aria-hidden="true"></div>
          <div className="ceremony-spotlight ceremony-spotlight--right" aria-hidden="true"></div>

          <div className="ceremony-sticker-cloud" aria-hidden="true">
            {winnerCeremony.stickers.map((sticker) => (
              <span
                key={`${winnerCeremony.id}-${sticker}`}
                className="ceremony-sticker"
              >
                {sticker}
              </span>
            ))}
          </div>

          <div className="ceremony-card">
            <p className="ceremony-eyebrow">{winnerCeremony.eyebrow}</p>
            <div className="ceremony-stamp">{winnerCeremony.stamp}</div>
            <h2 id="ceremony-title">{winnerCeremony.title}</h2>
            <p className="ceremony-subtitle">{winnerCeremony.subtitle}</p>

            <div className="ceremony-verdict">
              <span className={`player-chip player-chip--${losingPlayer} ceremony-chip`}>
                {loserMeta.badge}
              </span>
              <div>
                <strong>{`${loserMeta.name}, ${winnerCeremony.verdict}`}</strong>
                <p>
                  {`${winnerMeta.name} keeps the crown while the room quietly upgrades your loss into a memorable social event.`}
                </p>
              </div>
            </div>

            {state.selectedWish ? (
              <div className="wish-reveal">
                <span className="wish-reveal__label">
                  Tonight&apos;s dare{selectedWishLabel ? ` · ${selectedWishLabel}` : ''}
                </span>
                <strong>{state.selectedWish}</strong>
                <p>
                  Проигравший не просто получает roast, а ещё и конкретный challenge
                  на этот матч.
                </p>
              </div>
            ) : null}

            <div className="ceremony-stats">
              <div>
                <span>Winner pieces</span>
                <strong>{winnerPieces}</strong>
              </div>
              <div>
                <span>Loser pieces</span>
                <strong>{loserPieces}</strong>
              </div>
              <div>
                <span>Kings flex</span>
                <strong>{`${winnerKings}:${loserKings}`}</strong>
              </div>
            </div>

            <div className="ceremony-ribbons">
              {winnerCeremony.ribbons.map((ribbon) => (
                <span key={`${winnerCeremony.id}-${ribbon}`} className="ceremony-ribbon">
                  {ribbon}
                </span>
              ))}
            </div>

            <div className="ceremony-actions">
              <button type="button" className="ghost-button" onClick={rerollWish}>
                Reroll dare
              </button>
              <button type="button" className="ghost-button" onClick={dismissCeremony}>
                Let me breathe
              </button>
              <button type="button" className="solid-button" onClick={resetMatch}>
                Run it back
              </button>
            </div>
          </div>

          <div className="ceremony-marquee" aria-hidden="true">
            {[...winnerCeremony.ribbons, winnerCeremony.stamp, loserMeta.name, 'group chat gold']
              .concat([...winnerCeremony.ribbons, winnerCeremony.stamp])
              .map((item, index) => (
                <span key={`${winnerCeremony.id}-marquee-${index}`}>{item}</span>
              ))}
          </div>
        </section>
      ) : null}

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
            <p className="panel-label">Dare vault</p>
            <h3>Loser gets a challenge</h3>
            <p>{wishModeMeta.description}</p>

            <div className="wish-mode-list">
              {(['house', 'mixed', 'custom'] as WishMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`wish-mode-button ${
                    state.wishMode === mode ? 'wish-mode-button--active' : ''
                  }`}
                  onClick={() => setWishMode(mode)}
                >
                  {WISH_MODE_META[mode].label}
                </button>
              ))}
            </div>

            <div className="wish-pool-stats">
              <div>
                <span>House dares</span>
                <strong>{HOUSE_WISHES.length}</strong>
              </div>
              <div>
                <span>Your dares</span>
                <strong>{state.customWishes.length}</strong>
              </div>
            </div>

            <div className="wish-preview-list">
              {vaultPreview.map((wish) => (
                <div key={wish} className="wish-preview-item">
                  {wish}
                </div>
              ))}
            </div>

            <div className="wish-compose">
              <textarea
                className="wish-textarea"
                rows={3}
                value={customWishDraft}
                onChange={(event) => setCustomWishDraft(event.target.value)}
                placeholder="Например: сними 10-секундную сторис как будто у тебя был masterplan."
              />
              <button type="button" className="ghost-button wish-add-button" onClick={addCustomWish}>
                Add custom dare
              </button>
            </div>

            <div className="wish-custom-list">
              {state.customWishes.length === 0 ? (
                <p className="empty-state">
                  Пока здесь пусто. Добавь свои желания, и они смогут выпасть проигравшему.
                </p>
              ) : (
                state.customWishes.map((wish, index) => (
                  <div key={`${wish}-${index}`} className="wish-custom-item">
                    <span>{wish}</span>
                    <button
                      type="button"
                      className="wish-remove-button"
                      onClick={() => removeCustomWish(index)}
                      aria-label={`Remove custom dare ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
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
  if (import.meta.env.DEV) {
    const demoState = createCeremonyDemoState()

    if (demoState) {
      return demoState
    }
  }

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

    const customWishes = Array.isArray(parsed.customWishes)
      ? parsed.customWishes
          .map((wish) => (typeof wish === 'string' ? sanitizeWish(wish) : ''))
          .filter(Boolean)
      : []
    const wishMode = isWishMode(parsed.wishMode) ? parsed.wishMode : fallback.wishMode
    const fallbackWishChoice = parsed.winner
      ? pickRandomWishChoice({ wishMode, customWishes })
      : null
    const selectedWish =
      typeof parsed.selectedWish === 'string' && parsed.selectedWish.trim()
        ? parsed.selectedWish.trim()
        : fallbackWishChoice?.text ?? null
    const selectedWishSource = isWishSource(parsed.selectedWishSource)
      ? parsed.selectedWishSource
      : fallbackWishChoice?.source ?? null

    return {
      board: parsed.board,
      currentPlayer: parsed.currentPlayer,
      selectedPieceId: parsed.forcedPieceId ?? parsed.selectedPieceId ?? null,
      forcedPieceId: parsed.forcedPieceId ?? null,
      winner: parsed.winner ?? null,
      ceremonyId:
        parsed.ceremonyId ?? (parsed.winner ? pickCeremonySceneId() : null),
      ceremonyOpen: parsed.ceremonyOpen ?? Boolean(parsed.winner),
      wishMode,
      customWishes,
      selectedWish,
      selectedWishSource,
      history: parsed.history ?? [],
      themeId: parsed.themeId,
    }
  } catch {
    return fallback
  }
}

function createCeremonyDemoState(): MatchState | null {
  const params = new URLSearchParams(window.location.search)
  const ceremonyId = params.get('ceremony-demo')

  if (!ceremonyId || !CEREMONY_SCENES.some((scene) => scene.id === ceremonyId)) {
    return null
  }

  return {
    board: [
      [null, { id: 'ivory-1', player: 'ivory', king: false }, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [
        { id: 'ember-1', player: 'ember', king: true },
        null,
        { id: 'ember-2', player: 'ember', king: false },
        null,
        null,
        null,
        null,
        null,
      ],
      [null, null, null, null, null, null, null, null],
    ],
    currentPlayer: 'ember',
    selectedPieceId: null,
    forcedPieceId: null,
    winner: 'ember',
    ceremonyId,
    ceremonyOpen: true,
    wishMode: 'mixed',
    customWishes: ['Запиши эпичную сторис о своем поражении за 10 секунд.'],
    selectedWish:
      'Запиши 10-секундную сторис как будто это поражение было частью гениального плана.',
    selectedWishSource: 'house',
    history: [
      {
        id: 'ember-demo-1',
        player: 'ember',
        label: 'C3-D4',
        capture: false,
        crowned: false,
        turn: 1,
      },
      {
        id: 'ember-demo-2',
        player: 'ember',
        label: 'D4xF6',
        capture: true,
        crowned: true,
        turn: 2,
      },
    ],
    themeId: 'sunset',
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

function pickCeremonySceneId() {
  const randomIndex = Math.floor(Math.random() * CEREMONY_SCENES.length)
  return CEREMONY_SCENES[randomIndex]?.id ?? CEREMONY_SCENES[0].id
}

function pickRandomWishChoice(config: Pick<MatchState, 'wishMode' | 'customWishes'>): WishChoice {
  const customPool = config.customWishes
    .map((wish) => sanitizeWish(wish))
    .filter(Boolean)
    .map((text) => ({ source: 'custom' as const, text }))
  const housePool = HOUSE_WISHES.map((text) => ({
    source: 'house' as const,
    text,
  }))

  const pool =
    config.wishMode === 'house'
      ? housePool
      : config.wishMode === 'custom'
        ? (customPool.length > 0 ? customPool : housePool)
        : [...housePool, ...customPool]

  const safePool = pool.length > 0 ? pool : housePool
  const randomIndex = Math.floor(Math.random() * safePool.length)
  return safePool[randomIndex] ?? housePool[0]
}

function getWishSourceLabel(source: WishSource) {
  return source === 'custom' ? 'Custom vault' : 'House vault'
}

function getVaultPreview(state: Pick<MatchState, 'customWishes' | 'wishMode'>) {
  if (state.wishMode === 'custom' && state.customWishes.length > 0) {
    return state.customWishes.slice(0, 3)
  }

  if (state.wishMode === 'mixed' && state.customWishes.length > 0) {
    return [HOUSE_WISHES[0], state.customWishes[0], HOUSE_WISHES[1]].filter(Boolean)
  }

  return HOUSE_WISHES.slice(0, 3)
}

function sanitizeWish(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function isWishMode(value: unknown): value is WishMode {
  return value === 'house' || value === 'mixed' || value === 'custom'
}

function isWishSource(value: unknown): value is WishSource {
  return value === 'house' || value === 'custom'
}

export default App

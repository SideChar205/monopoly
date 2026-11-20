import { SPACES, GROUPS, groupMembers, STATIONS, UTILITIES } from '../game/board.js'
import { netWorth, propertiesOf, rentFor, ownsGroup } from '../game/rules.js'
import { Token } from './Board.jsx'
import { Train, Bulb, Tap, Question, Chest } from './Art.jsx'

const money = (n) => `$${n.toLocaleString('en-US')}`

// the property sets in board order: 8 color groups, then stations, then utilities
const SETS = [
  ...Object.keys(GROUPS).map((g) => ({ key: g, name: GROUPS[g].name, color: GROUPS[g].color, members: groupMembers(g) })),
  { key: 'station', name: 'Stations', color: '#111827', members: STATIONS },
  { key: 'utility', name: 'Utilities', color: '#64748b', members: UTILITIES },
]

function DeedIcon({ space }) {
  if (space.type === 'station') return <Train />
  if (space.type === 'utility') return space.name === 'Power Company' ? <Bulb /> : <Tap />
  return null
}

// buildings on a deed: little houses, or a hotel
function Buildings({ count }) {
  if (!count) return null
  if (count === 5) return <span className="deed-hotel" title="Hotel">HOTEL</span>
  return (
    <span className="deed-houses" title={`${count} house${count > 1 ? 's' : ''}`}>
      {Array.from({ length: count }, (_, k) => <span key={k} className="deed-house" />)}
    </span>
  )
}

// a title deed card, small (side panel) or large (player window)
export function MiniDeed({ game, index, size = 'small', onOpen, ghost }) {
  const space = SPACES[index]
  const color = space.group ? GROUPS[space.group].color : space.type === 'station' ? '#111827' : '#64748b'
  if (ghost) {
    return (
      <div className={`mini-deed ${size} ghost`} title={`${space.name}: not yours yet`} style={{ '--c': color }}>
        <span className="md-head" />
        {size === 'large' && <span className="md-name">{space.name}</span>}
      </div>
    )
  }
  const mortgaged = game.mortgaged[index]
  return (
    <button
      className={`mini-deed ${size}${mortgaged ? ' mortgaged' : ''}`}
      style={{ '--c': color }}
      onClick={() => onOpen(index)}
      title={`${space.name}${mortgaged ? ' (mortgaged)' : ''}`}
    >
      <span className="md-head">{size === 'large' && space.type !== 'street' && <DeedIcon space={space} />}</span>
      {size === 'large' ? (
        <>
          <span className="md-name">{space.name}</span>
          <Buildings count={game.houses[index]} />
          <span className="md-rent">{space.type === 'utility' ? (UTILITIES.every((j) => game.owners[j] === game.owners[index]) ? '10× dice' : '4× dice') : `Rent ${money(rentFor(game, index, 7))}`}</span>
        </>
      ) : (
        <Buildings count={game.houses[index]} />
      )}
      {mortgaged && <span className="md-stamp">MORTGAGED</span>}
    </button>
  )
}

// the side panel version: deeds grouped by set, with how much of each set they own
export function HoldingsStrip({ game, player, onOpen }) {
  const sets = SETS.map((set) => ({ ...set, mine: set.members.filter((i) => game.owners[i] === player) })).filter((s) => s.mine.length)
  if (!sets.length) return <p className="no-props">No properties yet</p>
  return (
    <div className="holdings2">
      {sets.map((set) => {
        const full = set.mine.length === set.members.length
        return (
          <div key={set.key} className={`set${full ? ' full' : ''}`} style={{ '--c': set.color }} title={`${set.name}: ${set.mine.length} of ${set.members.length}${full ? ' (complete!)' : ''}`}>
            <div className="set-cards">
              {set.mine.map((i) => (
                <MiniDeed key={i} game={game} index={i} onOpen={onOpen} />
              ))}
            </div>
            <span className="set-count">{set.mine.length}/{set.members.length}</span>
          </div>
        )
      })}
    </div>
  )
}

// The full view of one player: money, worth, and every set they've started, deed by deed
export function PlayerSheet({ game, index, onOpen, onClose }) {
  const p = game.players[index]
  const props = propertiesOf(game, index)
  const sets = SETS.map((set) => ({ ...set, mine: set.members.filter((i) => game.owners[i] === index) })).filter((s) => s.mine.length)
  const mortgaged = props.filter((i) => game.mortgaged[i]).length
  const houses = props.reduce((t, i) => t + (game.houses[i] < 5 ? game.houses[i] : 0), 0)
  const hotels = props.filter((i) => game.houses[i] === 5).length

  return (
    <div className="overlay" onClick={onClose}>
      <div className="player-sheet" style={{ '--c': p.color }} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <Token player={p} index={index} />
          <div className="sheet-title">
            <h2>{p.name}</h2>
            <small>{p.out ? 'Bankrupt' : p.inJail ? 'In jail' : p.isBot ? 'Bot' : 'Human'} · on {SPACES[p.pos].name}</small>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="sheet-stats">
          <div><span>Cash</span><b>{money(p.cash)}</b></div>
          <div><span>Net worth</span><b>{money(p.out ? 0 : netWorth(game, index))}</b></div>
          <div><span>Properties</span><b>{props.length}</b></div>
          <div><span>Houses / hotels</span><b>{houses} / {hotels}</b></div>
          <div><span>Mortgaged</span><b>{mortgaged}</b></div>
        </div>

        {sets.length === 0 ? (
          <p className="sheet-empty">No properties yet.</p>
        ) : (
          <div className="sheet-sets">
            {sets.map((set) => {
              const full = set.key !== 'station' && set.key !== 'utility' && ownsGroup(game, index, set.key)
              return (
                <section key={set.key} className={`sheet-set${full ? ' full' : ''}`} style={{ '--c': set.color }}>
                  <h3>
                    {set.name}
                    <span className="set-progress">
                      {set.mine.length} of {set.members.length}
                      {full && ' · complete: can build!'}
                    </span>
                  </h3>
                  <div className="sheet-deeds">
                    {set.members.map((i) =>
                      game.owners[i] === index ? (
                        <MiniDeed key={i} game={game} index={i} size="large" onOpen={onOpen} />
                      ) : (
                        <MiniDeed key={i} game={game} index={i} size="large" ghost />
                      ),
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {p.jailCards.length > 0 && (
          <div className="sheet-jailcards">
            {p.jailCards.map((c, k) => (
              <div key={k} className={`jail-free ${c.deck}`}>
                <span className="jf-pic">{c.deck === 'fortune' ? <Question /> : <Chest />}</span>
                <span>Get Out of Jail Free</span>
              </div>
            ))}
          </div>
        )}
        <p className="sheet-hint">Click a deed to see its rents{!p.isBot && !p.out ? ', build houses or mortgage it' : ''}.</p>
      </div>
    </div>
  )
}

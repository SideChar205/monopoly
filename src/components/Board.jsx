import { SPACES, GROUPS, gridSpot } from '../game/board.js'

const money = (n) => `$${n}`

// one space on the board
function Space({ index, game, positions, onOpen }) {
  const space = SPACES[index]
  const spot = gridSpot(index)
  const owner = game.owners[index]
  const houses = game.houses[index]
  const here = positions.map((pos, p) => (pos === index && !game.players[p].out ? p : -1)).filter((p) => p >= 0)
  const corner = index % 10 === 0
  const ownable = space.price !== undefined
  const color = space.group ? GROUPS[space.group].color : null

  return (
    <div
      className={`space ${spot.side}${corner ? ' corner' : ''} t-${space.type}${game.mortgaged[index] ? ' mortgaged' : ''}${ownable ? ' clickable' : ''}${here.length && index !== 10 ? ' occupied' : ''}`}
      style={{ gridRow: spot.row, gridColumn: spot.col, '--band': color ?? 'transparent', '--owner': owner !== null ? game.players[owner].color : 'transparent' }}
      onClick={ownable ? () => onOpen(index) : undefined}
      title={ownable ? `${space.name}: click for details` : space.name}
    >
      {color && (
        <div className="band">
          {houses > 0 && houses < 5 && Array.from({ length: houses }, (_, k) => <span key={k} className="house" />)}
          {houses === 5 && <span className="hotel" />}
        </div>
      )}
      <div className="space-body">
        <SpaceIcon space={space} />
        <span className="space-name">{space.name}</span>
        {ownable && <span className="space-price">{game.mortgaged[index] ? 'Mortgaged' : money(space.price)}</span>}
        {space.type === 'tax' && <span className="space-price">Pay {money(space.amount)}</span>}
      </div>
      {owner !== null && <span className="owner-flag" title={`Owned by ${game.players[owner].name}`} />}
      {index === 10 ? (
        <>
          {/* in jail: inside the cell; just visiting: outside it */}
          <div className="tokens jail-tokens">
            {here.filter((p) => game.players[p].inJail).map((p) => (
              <Token key={p} player={game.players[p]} index={p} jailed current={p === game.current} />
            ))}
          </div>
          <div className="visit-tokens">
            {here.filter((p) => !game.players[p].inJail).map((p) => (
              <Token key={p} player={game.players[p]} index={p} current={p === game.current} />
            ))}
          </div>
        </>
      ) : (
        here.length > 0 && (
          <div className="tokens">
            {here.map((p) => (
              <Token key={p} player={game.players[p]} index={p} current={p === game.current} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function SpaceIcon({ space }) {
  switch (space.type) {
    case 'start':
      return <span className="icon big">➜</span>
    case 'jail':
      return <span className="icon big">▦</span>
    case 'rest':
      return <span className="icon big">⛲</span>
    case 'gotojail':
      return <span className="icon big">👮</span>
    case 'station':
      return <span className="icon">🚂</span>
    case 'utility':
      return <span className="icon">{space.icon}</span>
    case 'fortune':
      return <span className="icon fortune">?</span>
    case 'fund':
      return <span className="icon">💰</span>
    case 'tax':
      return <span className="icon">🧾</span>
    default:
      return null
  }
}

export function Token({ player, index, jailed, current }) {
  return (
    <span className={`token${jailed ? ' jailed' : ''}${current ? ' current' : ''}`} style={{ '--c': player.color }} title={player.name}>
      {player.name.slice(0, 1).toUpperCase()}
      <span className="token-num">{index + 1}</span>
    </span>
  )
}

export default function Board({ game, positions, onOpen, children }) {
  return (
    <div className="board">
      {SPACES.map((_, i) => (
        <Space key={i} index={i} game={game} positions={positions} onOpen={onOpen} />
      ))}
      <div className="board-center">{children}</div>
    </div>
  )
}

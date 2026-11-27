import { useRef } from 'react'
import { SPACES, GROUPS, gridSpot } from '../game/board.js'
import { PieceIcon, Piece3D } from './Pieces.jsx'
import { SPACE_ART, UTILITY_ART, TAX_ART, StartArrow, Bars, Chest, Question, HouseModel, HotelModel, Extruded, OwnedModel } from './Art.jsx'

const money = (n) => `$${n}`

// the four corners have their own layouts
function Corner({ index }) {
  const space = SPACES[index]
  if (space.type === 'jail') {
    return (
      <>
        <div className="jail-cell">
          <Bars />
          <span className="jail-label">IN JAIL</span>
        </div>
        <span className="just">JUST</span>
        <span className="visiting">VISITING</span>
      </>
    )
  }
  const Art = SPACE_ART[space.type]
  return (
    <>
      <div className="corner-art">
        {space.type === 'start' ? (
          <>
            <small>Collect $200 salary as you pass</small>
            <b className="start-word">START</b>
            <StartArrow />
          </>
        ) : (
          <>
            {space.type === 'gotojail' && <b>GO TO</b>}
            {Art && <Art />}
            <b>{space.type === 'gotojail' ? 'JAIL' : space.name.toUpperCase()}</b>
            {space.type === 'rest' && <small>Take a rest</small>}
          </>
        )}
      </div>
    </>
  )
}

function SpaceArt({ space }) {
  const Art = space.type === 'utility' ? UTILITY_ART[space.name] : space.type === 'tax' ? TAX_ART[space.name] : SPACE_ART[space.type]
  return Art ? <Art /> : null
}

// one space on the board
function Space({ index, game, onOpen }) {
  const space = SPACES[index]
  const spot = gridSpot(index)
  const owner = game.owners[index]
  const houses = game.houses[index]
  const corner = index % 10 === 0
  const ownable = space.price !== undefined
  const color = space.group ? GROUPS[space.group].color : null

  return (
    <div
      data-space={index}
      className={`space ${corner ? `${spot.side} corner` : `bottom face-${spot.side}`} t-${space.type}${game.mortgaged[index] ? ' mortgaged' : ''}${ownable ? ' clickable' : ''}`}
      style={{ gridRow: spot.row, gridColumn: spot.col, '--band': color ?? 'transparent', '--owner': owner !== null ? game.players[owner].color : 'transparent' }}
      onClick={ownable ? () => onOpen(index) : undefined}
      title={ownable ? `${space.name}: click for details` : space.name}
    >
      {corner ? (
        <Corner index={index} />
      ) : (
        // every space is laid out like one on the bottom row, then turned to face outwards (like a real board)
        <div className="space-face">
          {color && (
            <div className="band">
              {houses > 0 && houses < 5 && Array.from({ length: houses }, (_, k) => <span key={k} className="house" />)}
              {houses === 5 && <span className="hotel" />}
            </div>
          )}
          <div className="space-body">
            <span className="space-name">{space.name}</span>
            <SpaceArt space={space} />
            {ownable && <span className="space-price">{game.mortgaged[index] ? 'MORTGAGED' : money(space.price)}</span>}
            {space.type === 'tax' && <span className="space-price">Pay {space.choice ? '$200 or 10%' : money(space.amount)}</span>}
          </div>
          {owner !== null && <span className="owner-flag" title={`Owned by ${game.players[owner].name}`} />}
        </div>
      )}
    </div>
  )
}

// a piece on its colored base, for the side panel and prompts (flat)
export function Token({ player, index, current }) {
  return (
    <span className={`token${current ? ' current' : ''}`} title={`${player.name}${index !== undefined ? ` (player ${index + 1})` : ''}`}>
      <PieceIcon id={player.piece} color={player.color} />
    </span>
  )
}

// several pieces on one space stand in a little cluster (back row first, so the front ones overlap them)
function clusterSpot(k, n) {
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const col = k % cols
  const row = Math.floor(k / cols)
  return { '--dx': `${(col - (cols - 1) / 2) * 2.3}em`, '--dy': `${(row - (rows - 1) / 2) * 2.6}em` }
}

// where the middle of a space is on the board, in % (the corners are 1.6 times as big as the other spaces)
const CELL = (k) => (k === 1 ? 0 : 1.6 + (k - 2)) // where row/column k starts
const SIZE = (k) => (k === 1 || k === 11 ? 1.6 : 1)
function spaceCenter(i, jail) {
  const spot = gridSpot(i)
  let fx = 0.5
  let fy = 0.5
  if (jail === 'in') [fx, fy] = [0.66, 0.38] // behind the bars
  if (jail === 'visit') [fx, fy] = [0.3, 0.78] // just visiting: on the edge of the jail space
  return { x: ((CELL(spot.col) + SIZE(spot.col) * fx) / 12.6) * 100, y: ((CELL(spot.row) + SIZE(spot.row) * fy) / 12.6) * 100, side: spot.side }
}

// The pieces stand up on the board and hop from space to space: each step, the piece glides to the next space
// while it jumps up in an arc and lands. (They live in their own layer so they can rise out of the board in 3D.)
function TokenLayer({ game, positions, stepMs }) {
  // count every step a piece takes, so its hop plays again each time
  const last = useRef(positions)
  const hops = useRef(positions.map(() => 0))
  positions.forEach((pos, p) => {
    if (pos !== last.current[p]) hops.current[p] += 1
  })
  last.current = positions

  const groups = {}
  positions.forEach((pos, p) => {
    if (game.players[p].out) return
    const key = pos === 10 ? (game.players[p].inJail ? 'jail-in' : 'jail-visit') : String(pos)
    ;(groups[key] ??= []).push(p)
  })
  return (
    <div className="token-layer walkers" aria-hidden="true" style={{ '--step': `${stepMs}ms` }}>
      {Object.entries(groups).flatMap(([key, players]) =>
        players.map((p, k) => {
          const player = game.players[p]
          const at = spaceCenter(positions[p], key === 'jail-in' ? 'in' : key === 'jail-visit' ? 'visit' : null)
          return (
            <div
              key={p}
              className={`piece3d walker side-${at.side}${p === game.current ? ' current' : ''}${player.inJail ? ' jailed' : ''}`}
              style={{ '--c': player.color, left: `${at.x}%`, top: `${at.y}%`, ...clusterSpot(k, players.length) }}
            >
              <span key={`b${hops.current[p]}`} className="piece-base" />
              <span key={`f${hops.current[p]}`} className="piece-figure">
                <Piece3D id={player.piece} color={player.color} />
              </span>
            </div>
          )
        }),
      )}
    </div>
  )
}

// Who owns what, as models standing on the board:
//  - owned, nothing built: a little building in the owner's color
//  - built: the classic green houses or red hotel, on a base in the owner's color
// Properties nobody owns stay empty.
function BuildingLayer({ game }) {
  return (
    <div className="token-layer building-layer" aria-hidden="true">
      {game.owners.map((owner, i) => {
        if (owner === null) return null
        const spot = gridSpot(i)
        const h = game.houses[i]
        const color = game.players[owner].color
        const street = SPACES[i].type === 'street'
        return (
          <div
            key={i}
            className={`lot ${spot.side}${street ? '' : ' centered'}${game.mortgaged[i] ? ' mortgaged' : ''}`}
            style={{ gridRow: spot.row, gridColumn: spot.col, '--owner': color }}
          >
            {h === 0 && (
              <span className="model-stand owned" title={game.players[owner].name}>
                <Extruded layers={5}><OwnedModel color={color} /></Extruded>
              </span>
            )}
            {h === 5 && (
              <span className="model-stand hotel built">
                <Extruded layers={5}><HotelModel /></Extruded>
              </span>
            )}
            {h > 0 && h < 5 && (
              <span className="built-row">
                {Array.from({ length: h }, (_, k) => (
                  <span className="model-stand built" key={k}>
                    <Extruded layers={5}><HouseModel /></Extruded>
                  </span>
                ))}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// a drawn card: it lifts off its pile, flips over and comes up to face you. Click to put it back.
function DrawnCard({ card, game, onClose }) {
  const fortune = card.deck === 'fortune'
  return (
    <div className={`card3d-wrap ${card.deck}`}>
      <button className="card3d" onClick={onClose} title="Click to close">
        <span className="card3d-back">
          {fortune ? <Question /> : <Chest />}
        </span>
        <span className="card3d-front">
          <span className="card-title">{fortune ? 'FORTUNE' : 'TOWN FUND'}</span>
          <span className="card-pic">{fortune ? <Question /> : <Chest />}</span>
          <span className="card-text">{card.text}</span>
          <span className="card-who">{game.players[card.player].name}</span>
        </span>
      </button>
    </div>
  )
}

// a stack of face-down cards on a pile spot
function CardStack({ deck }) {
  return (
    <span className="card-stack" aria-hidden="true">
      {Array.from({ length: 7 }, (_, k) => (
        <span key={k} className={`stack-card ${deck}`} style={{ '--k': k }}>
          {k === 6 && (deck === 'fortune' ? <Question /> : <Chest />)}
        </span>
      ))}
    </span>
  )
}

export default function Board({ game, positions, onOpen, card, onCardClose, stepMs = 480 }) {
  return (
    <div className="board">
      {SPACES.map((_, i) => (
        <Space key={i} index={i} game={game} onOpen={onOpen} />
      ))}
      <div className="board-center">
        {/* the two card piles and the name, printed on the board */}
        <div className="deck-spot fortune">
          <span className="spot-label">FORTUNE</span>
          <CardStack deck="fortune" />
        </div>
        <div className="deck-spot fund">
          <span className="spot-label">TOWN FUND</span>
          <CardStack deck="fund" />
        </div>
        <div className="board-title" aria-hidden="true">
          <span className="logo-house" />
          LANDLORD
        </div>
        {/* invisible marks at the corners of the open middle: the dice measure them to know where they may land */}
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className={`dice-zone-mark m${k}`} data-k={k} aria-hidden="true" />
        ))}
        {card && <DrawnCard key={card.id} card={card} game={game} onClose={onCardClose} />}
      </div>
      <BuildingLayer game={game} />
      <TokenLayer game={game} positions={positions} stepMs={stepMs} />
    </div>
  )
}

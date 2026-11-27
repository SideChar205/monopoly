import { SPACES, GROUPS, groupMembers, mortgageValue, unmortgageCost } from '../game/board.js'
import { canBuild, canSell, canMortgage, canUnmortgage, canManage, ownsGroup, houseCost, rentFor } from '../game/rules.js'

const money = (n) => `$${n.toLocaleString('en-US')}`

// The title card for a property: its rents, who owns it, and (for the owner, on their turn) what they can do with it
export default function Deed({ index, game, dispatch, onClose, seat = null }) {
  const space = SPACES[index]
  const owner = game.owners[index]
  const color = space.group ? GROUPS[space.group].color : '#334155'
  // the owner can build, sell and mortgage at any time (rulebook), as long as they're a person (bots manage themselves)
  const viewer = owner
  // online, only your own properties (seat = your seat)
  const mine = owner !== null && !game.players[owner].isBot && canManage(game, owner) && (seat === null || seat === owner)
  const owes = game.phase === 'debt' && game.debt?.player === owner // can raise money, not spend it
  const h = game.houses[index]

  const act = (type) => dispatch({ type, space: index, player: owner })

  // why a button is disabled (shown on hover)
  const buildWhy = () => {
    if (!ownsGroup(game, viewer, space.group)) return 'Own every street of this color first'
    if (groupMembers(space.group).some((j) => game.mortgaged[j])) return 'Pay off the mortgages in this group first'
    if (h >= 5) return 'Already has a hotel'
    if (owes) return "You can't build while you owe money"
    if (game.players[viewer].cash < houseCost(index)) return 'Not enough money'
    return 'Build evenly: the other streets in this group need a house first'
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="deed" onClick={(e) => e.stopPropagation()}>
        <div className={`deed-head${space.type !== 'street' ? ' plain' : ''}`} style={{ '--c': color }}>
          {space.type === 'station' && <span className="deed-icon">🚂</span>}
          {space.type === 'utility' && <span className="deed-icon">{space.icon}</span>}
          <small>{space.type === 'street' ? 'Title deed' : space.type === 'station' ? 'Station' : 'Utility'}</small>
          <h3>{space.name}</h3>
        </div>

        <div className="deed-body">
          {space.type === 'street' && (
            <table className="rent-table">
              <tbody>
                <tr className={h === 0 ? 'now' : ''}>
                  <td>Rent</td>
                  <td>{money(space.rent[0])}</td>
                </tr>
                <tr>
                  <td>With the whole color group</td>
                  <td>{money(space.rent[0] * 2)}</td>
                </tr>
                {[1, 2, 3, 4].map((n) => (
                  <tr key={n} className={h === n ? 'now' : ''}>
                    <td>With {n} house{n > 1 ? 's' : ''}</td>
                    <td>{money(space.rent[n])}</td>
                  </tr>
                ))}
                <tr className={h === 5 ? 'now' : ''}>
                  <td>With a hotel</td>
                  <td>{money(space.rent[5])}</td>
                </tr>
              </tbody>
            </table>
          )}
          {space.type === 'station' && (
            <table className="rent-table">
              <tbody>
                {[1, 2, 3, 4].map((n) => (
                  <tr key={n}>
                    <td>If {n} station{n > 1 ? 's are' : ' is'} owned</td>
                    <td>{money(25 * 2 ** (n - 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {space.type === 'utility' && (
            <p className="deed-text">
              If one utility is owned, rent is <b>4 times</b> the dice. If both are owned, rent is <b>10 times</b> the dice.
            </p>
          )}

          <dl className="deed-facts">
            <div><dt>Price</dt><dd>{money(space.price)}</dd></div>
            {space.type === 'street' && <div><dt>Each house / hotel</dt><dd>{money(houseCost(index))}</dd></div>}
            <div><dt>Mortgage value</dt><dd>{money(mortgageValue(space))}</dd></div>
            <div>
              <dt>Owner</dt>
              <dd>
                {owner === null ? 'For sale' : <span className="owner-name" style={{ '--c': game.players[owner].color }}>{game.players[owner].name}</span>}
                {game.mortgaged[index] && <span className="tag">Mortgaged</span>}
              </dd>
            </div>
            {owner !== null && !game.mortgaged[index] && space.type !== 'utility' && (
              <div><dt>Rent right now</dt><dd>{money(rentFor(game, index, 7))}</dd></div>
            )}
          </dl>

          {mine && (
            <div className="deed-actions">
              {space.type === 'street' && (
                <>
                  <button className="btn" disabled={!canBuild(game, viewer, index) || owes} title={canBuild(game, viewer, index) ? '' : buildWhy()} onClick={() => act('BUILD')}>
                    {h === 4 ? 'Build hotel' : 'Build house'} ({money(houseCost(index))})
                  </button>
                  <button className="btn ghost" disabled={!canSell(game, viewer, index)} onClick={() => act('SELL')}>
                    Sell {h === 5 ? 'hotel' : 'house'} (+{money(houseCost(index) / 2)})
                  </button>
                </>
              )}
              {game.mortgaged[index] ? (
                <button className="btn ghost" disabled={!canUnmortgage(game, viewer, index) || owes} onClick={() => act('UNMORTGAGE')}>
                  Pay off mortgage ({money(unmortgageCost(space))})
                </button>
              ) : (
                <button
                  className="btn ghost"
                  disabled={!canMortgage(game, viewer, index)}
                  title={canMortgage(game, viewer, index) ? '' : 'Sell the buildings in this color group first'}
                  onClick={() => act('MORTGAGE')}
                >
                  Mortgage (+{money(mortgageValue(space))})
                </button>
              )}
            </div>
          )}
          <button className="btn-link" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

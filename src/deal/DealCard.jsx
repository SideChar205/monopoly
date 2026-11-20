import { SETS, ACTIONS, colorHex } from './cards.js'

const MONEY_COLORS = { 1: '#f5e6c8', 2: '#fbd0c8', 3: '#cdeccf', 4: '#c9def7', 5: '#e3d0f5', 10: '#fbd9a6' }
const ICONS = { breaker: '💥', no: '✋', passgo: '➜', forced: '🔄', sly: '🦊', debt: '💼', birthday: '🎂', double: '×2', house: '🏠', hotel: '🏨' }

const rainbow = 'conic-gradient(#955436, #aae0fa, #d93a96, #f7941d, #ed1b24, #fef200, #1fb25a, #0072bb, #955436)'

// One card. size: 'big' (in your hand / menus) or 'small' (on the table)
export default function DealCard({ card, size = 'big', as, onClick, selected, dim, title }) {
  const cls = `dcard ${size} k-${card.kind}${selected ? ' selected' : ''}${dim ? ' dim' : ''}${onClick ? ' clickable' : ''}`
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cls} onClick={onClick} title={title} style={card.kind === 'money' ? { '--bg': MONEY_COLORS[card.value] ?? '#eee' } : undefined}>
      {card.value > 0 && <span className="dvalue">${card.value}M</span>}
      <Face card={card} size={size} as={as} />
    </Tag>
  )
}

function Face({ card, size, as }) {
  const big = size === 'big'
  switch (card.kind) {
    case 'money':
      return (
        <div className="dmoney">
          <b>${card.value}M</b>
          {big && <small>MONEY</small>}
        </div>
      )
    case 'property': {
      const set = SETS[card.color]
      return (
        <>
          <div className="dband" style={{ background: colorHex(card.color) }}>
            <span>{big ? card.name : set.name}</span>
          </div>
          {big ? (
            <div className="drent">
              {set.rent.map((r, i) => (
                <div key={i} className={i === set.rent.length - 1 ? 'full' : ''}>
                  <span>{i + 1}{i === set.rent.length - 1 ? ' (set)' : ''}</span>
                  <b>${r}M</b>
                </div>
              ))}
            </div>
          ) : (
            <div className="dsmall-name">{card.name}</div>
          )}
        </>
      )
    }
    case 'wild': {
      const any = card.colors === 'any'
      const bg = any ? rainbow : `linear-gradient(90deg, ${colorHex(card.colors[0])} 50%, ${colorHex(card.colors[1])} 50%)`
      return (
        <>
          <div className="dband wildband" style={{ background: bg }}>
            <span>WILD</span>
          </div>
          <div className="dwild-body">
            {as && <span className="as-chip" style={{ '--c': colorHex(as) }}>{SETS[as].name}</span>}
            {big && <small>{any ? 'Any color. Worth nothing as money.' : `${SETS[card.colors[0]].name} or ${SETS[card.colors[1]].name}`}</small>}
          </div>
        </>
      )
    }
    case 'rent': {
      const any = card.colors === 'any'
      const bg = any ? rainbow : `linear-gradient(90deg, ${colorHex(card.colors[0])} 50%, ${colorHex(card.colors[1])} 50%)`
      return (
        <div className="drentcard">
          <span className="rent-disc" style={{ background: bg }}>
            <b>RENT</b>
          </span>
          {big && <small>{any ? 'Charge ONE player rent for any of your sets' : 'All players pay you rent for one of these sets'}</small>}
        </div>
      )
    }
    case 'action': {
      const a = ACTIONS[card.action]
      return (
        <div className="daction">
          <span className="dicon">{ICONS[card.action]}</span>
          <b>{a.name}</b>
          {big && <small>{a.text}</small>}
        </div>
      )
    }
    default:
      return null
  }
}

// a card back (other players' hands, the draw pile)
export function CardBack({ size = 'big', count }) {
  return (
    <div className={`dcard ${size} dback`}>
      <span className="back-logo">DEAL</span>
      {count !== undefined && <span className="back-count">{count}</span>}
    </div>
  )
}

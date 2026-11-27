import { useState } from 'react'

// the board game's optional rules: a switch each, and an (i) that explains it
export const RULES = [
  { key: 'auctions', name: 'Auctions', info: "When someone lands on a property and doesn't buy it, everyone bids for it. Off: it simply stays unsold." },
  { key: 'crazyFund', name: 'Crazy Town Fund', info: 'Adds 8 wild cards to the Town Fund pile: free houses, surprise auctions, free rent passes, block parties and more.' },
  { key: 'crazyFortune', name: 'Crazy Fortune', info: 'Adds 8 wild cards to the Fortune pile: swap places with the leader, pickpocket the richest, lottery tickets, double or nothing and more.' },
  { key: 'freeParking', name: 'Free Parking', info: 'Taxes, jail fines and card fees go into a pot in the middle of the board. Land on Town Square to win it all.' },
  { key: 'draft', name: 'Card Draft', info: 'Before the first roll, everyone picks 2 free properties, taking turns back and forth (snake order).' },
  { key: 'teleport', name: 'Teleport', info: 'When a card sends a piece far across the board (or to jail), it teleports there instead of hopping square by square.' },
]

// the optional rules: a switch each, and an (i) that explains it. readOnly: show them, but only the host can change them
export default function RulesPicker({ settings, setSettings, readOnly = false }) {
  const [info, setInfo] = useState(null) // which rule's explanation is open
  return (
    <ul className="rule-list">
      {RULES.map((r) => (
        <li key={r.key}>
          <span className="rule-name">{r.name}</span>
          <button
            role="switch"
            aria-checked={!!settings[r.key]}
            className={`switch${settings[r.key] ? ' on' : ''}`}
            disabled={readOnly}
            onClick={() => setSettings({ ...settings, [r.key]: !settings[r.key] })}
            title={settings[r.key] ? 'On' : 'Off'}
          >
            <span className="knob" />
          </button>
          <button className={`info-btn${info === r.key ? ' open' : ''}`} onClick={() => setInfo((k) => (k === r.key ? null : r.key))} aria-label={`About ${r.name}`}>
            i
          </button>
          {info === r.key && <p className="rule-info">{r.info}</p>}
        </li>
      ))}
    </ul>
  )
}

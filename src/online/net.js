// Helpers for online rooms (the rooms themselves run through the message relay in relay.js)
import { auctionBidder } from '../game/rules.js'

// Every room has an id: PREFIX + code
export const PREFIX = 'landlord-room-'
export const PEER_OPTIONS = {}
export const CONNECT_OPTIONS = { reliable: true, serialization: 'json' }

// This browser's player id: a random id made once and kept in the browser.
// Rooms use it to recognise a player who drops out and comes back (there are no accounts).
const ID_KEY = 'landlord-player-id'
let memoryId = null
export function playerId() {
  const make = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`)
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id = make()
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return (memoryId ??= make()) // storage blocked (some private modes): the id lasts until the page is closed
  }
}

export const JOIN_TIMEOUT = 15000 // ms before we tell the guest something is wrong

// 5-character codes without look-alike letters (no 0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const makeCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
export const cleanCode = (text) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)

const TURN_ACTIONS = new Set(['ROLL', 'PAY_FINE', 'USE_CARD', 'BUY', 'DECLINE', 'TAX_FLAT', 'TAX_PERCENT', 'END_TURN', 'PAY_DEBT', 'BANKRUPT', 'DRAFT_PICK'])
const OWNER_ACTIONS = new Set(['BUILD', 'SELL', 'MORTGAGE', 'UNMORTGAGE'])

// Which player an action is for: the bidder in an auction, the owner when building/mortgaging, otherwise the current player
export function actorOf(game, action) {
  if (action.type === 'BID' || action.type === 'AUCTION_PASS') return auctionBidder(game)
  if (OWNER_ACTIONS.has(action.type)) return action.player ?? game.current
  return game.current
}

// Is `seat` allowed to send this action right now? (the host checks every action from a guest)
export function allowed(game, action, seat) {
  if (!game || game.phase === 'over') return false
  if (action.dice !== undefined) return false // no loaded dice from guests
  if (action.type === 'BID' || action.type === 'AUCTION_PASS') return game.phase === 'auction' && auctionBidder(game) === seat && action.player === seat
  if (OWNER_ACTIONS.has(action.type)) return action.player === seat // only your own properties
  if (TURN_ACTIONS.has(action.type)) return game.current === seat && (action.player === undefined || action.player === seat)
  return false // NEW, END_GAME... only the host can do those
}

// Online play for the board game: create a room (host) or join one (guest).
// The host's browser runs the real game (and the bots); guests send their moves and get the game back.
// Rooms go through a public message relay (works on any network, in any browser): see relay.js.
import { useEffect, useRef, useState } from 'react'
import { RelayPeer as Peer } from './relay.js'
import { gameReducer, TOKEN_COLORS, PIECE_IDS, DEFAULT_SETTINGS } from '../game/rules.js'
import { STARTING_CASH } from '../game/board.js'
import { randomBotName } from '../game/botNames.js'
import Game from '../components/Game.jsx'
import RulesPicker from '../components/RulesPicker.jsx'
import { PieceIcon } from '../components/Pieces.jsx'
import { PREFIX, PEER_OPTIONS, CONNECT_OPTIONS, JOIN_TIMEOUT, makeCode, cleanCode, allowed, actorOf, playerId } from './net.js'

const MAX_PLAYERS = 6
const CASH_OPTIONS = [1000, 1500, 2000, 2500]
const PING_EVERY = 2000 // ms between heartbeat messages
const TIMEOUT = 8000 // ms of silence before someone counts as gone

// invite links must work on friends' devices: "localhost" only means "this computer", so use the network address
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
const shareOrigin = isLocal && typeof __LAN_URL__ !== 'undefined' ? __LAN_URL__ : window.location.origin
// the invite link carries a long random secret after '#' (never sent to any server): only people with it walk straight in;
// typing the short room code only knocks, and the host decides
const inviteLink = (secret) => `${shareOrigin}${window.location.pathname}#join=${secret}`
const makeSecret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16)) // 128 bits: impossible to guess
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function readInvite() {
  const secret = (window.location.hash.match(/join=([A-Za-z0-9_-]{16,64})/) ?? [])[1] ?? null
  const code = cleanCode(new URLSearchParams(window.location.search).get('room') ?? '')
  if (secret || code) window.history.replaceState(null, '', window.location.pathname)
  return { secret, code: code.length === 5 ? code : '' }
}
export const hasInvite = () => new URLSearchParams(window.location.search).has('room') || /join=/.test(window.location.hash)

// your name is remembered in this browser
const NAME_KEY = 'landlord-player-name'
const savedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
const saveName = (n) => {
  try {
    if (n.trim()) localStorage.setItem(NAME_KEY, n.trim().slice(0, 12))
  } catch { /* storage blocked */ }
}
const cleanName = (n) => String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 12)

function Page({ children }) {
  return (
    <div className="setup-page">
      <div className="skyline" aria-hidden="true" />
      <div className="setup-card online-card-wrap">
        <header className="setup-head">
          <div className="logo">
            <span className="logo-house" aria-hidden="true" />
            LANDLORD
            <span className="online-tag">ONLINE</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

// ---------------- Menu: your name, then create or join ----------------
export default function Online({ onBack }) {
  const [invite] = useState(readInvite)
  const [name, setName] = useState(savedName)
  const [code, setCode] = useState(invite.code)
  const [room, setRoom] = useState(null) // { role: 'host' } or { role: 'guest', code, secret }
  const [pendingInvite, setPendingInvite] = useState(() => (invite.secret ? { role: 'guest', code: '', secret: invite.secret } : invite.code ? { role: 'guest', code: invite.code } : null))
  useEffect(() => saveName(name), [name])
  const leave = () => setRoom(null)
  const player = cleanName(name) || 'Player'

  if (pendingInvite && !room) {
    const go = () => {
      if (!cleanName(name)) return
      setName(cleanName(name))
      setRoom(pendingInvite)
      setPendingInvite(null)
    }
    return (
      <Page>
        <p className="ol-hello">🎉 You're invited to a Landlord game!</p>
        <h2>What's your name?</h2>
        <input className="text-input ol-name-big" autoFocus maxLength={12} value={name} placeholder="e.g. Ana" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <button className="start-btn" disabled={!cleanName(name)} onClick={go}>Join the game</button>
        <button className="btn-link ol-back" onClick={() => { setPendingInvite(null); onBack() }}>← Not now</button>
      </Page>
    )
  }
  if (room?.role === 'host') return <HostRoom name={player} onLeave={leave} onRename={setName} />
  if (room?.role === 'guest') return <GuestRoom name={player} code={room.code} secret={room.secret} onLeave={leave} onRename={setName} />

  return (
    <Page>
      <p className="ol-sub">Play with friends on their own devices, anywhere. Empty seats can be bots.</p>
      <h2>Your name</h2>
      <input className="text-input ol-full" value={name} maxLength={12} placeholder="e.g. Steven" onChange={(e) => setName(e.target.value)} />
      <div className="ol-choices">
        <div className="ol-choice">
          <h3>Create a game</h3>
          <p>You get an invite link and a code to share.</p>
          <button className="btn primary ol-full" onClick={() => setRoom({ role: 'host' })}>Create game</button>
        </div>
        <div className="ol-choice">
          <h3>Join a game</h3>
          <input className="text-input ol-code" value={code} placeholder="CODE" onChange={(e) => setCode(cleanCode(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && code.length === 5 && setRoom({ role: 'guest', code })} />
          <button className="btn ol-full" disabled={code.length !== 5} onClick={() => setRoom({ role: 'guest', code })}>Join</button>
        </div>
      </div>
      <button className="btn-link ol-back" onClick={onBack}>← Back to the start screen</button>
    </Page>
  )
}

// ---------------- Host ----------------
function HostRoom({ name, onLeave, onRename }) {
  const [code] = useState(makeCode)
  const [secret] = useState(makeSecret)
  const [knocks, setKnocks] = useState([])
  const admit = useRef(null)
  const [status, setStatus] = useState('connecting') // connecting | open | error
  const [error, setError] = useState(null)
  // seat 0 is always the host. id = the player's browser id (lets them rejoin)
  const [seats, setSeats] = useState(() => [{ name, isBot: false, peer: null, id: playerId(), ready: true }])
  const [notices, setNotices] = useState([])
  const notice = (text) => setNotices((n) => [{ id: `${Date.now()}-${Math.random()}`, text }, ...n].slice(0, 5))
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [cash, setCash] = useState(STARTING_CASH)
  const [game, setGame] = useState(null)
  const [connecting, setConnecting] = useState({})
  const [failedJoins, setFailedJoins] = useState({})
  const conns = useRef(new Map())
  const live = useRef({})
  live.current = { seats, game }

  useEffect(() => {
    const peer = new Peer(PREFIX + code, { ...PEER_OPTIONS, secret })
    const approved = new Set() // ids the host has let in
    peer.on('open', () => setStatus('open'))
    peer.on('error', (e) => {
      setError(e.type === 'network' ? "Couldn't reach the online service. Check your internet connection, then leave and create the room again." : `Connection problem (${e.type}).`)
      setStatus('error')
    })

    const lastSeen = new Map() // peer id -> time of their last message

    // a guest left: in the lobby they lose their seat; during a game a bot takes over (they can rejoin from the same browser)
    function handleLeave(peerId) {
      const conn = conns.current.get(peerId)
      if (!conn) return
      // forget them first: closing the connection fires 'close', which calls this again
      conns.current.delete(peerId)
      lastSeen.delete(peerId)
      conn.close()
      const { seats, game } = live.current
      const idx = seats.findIndex((x) => x.peer === peerId)
      if (idx < 0) return
      if (!game) {
        notice(`${seats[idx].name} left the room`)
        setSeats((s) => s.filter((x) => x.peer !== peerId))
        return
      }
      setSeats((s) => s.map((x, i) => (i === idx ? { ...x, peer: null, isBot: true } : x)))
      setGame((g) =>
        g && {
          ...g,
          players: g.players.map((p, i) => (i === idx && !p.isBot ? { ...p, isBot: true, name: `${p.name} (bot)` } : p)),
          log: [`${g.players[idx].name} left. A bot takes over.`, ...g.log].slice(0, 8),
        },
      )
    }

    // heartbeat: ping everyone, and drop anyone who has been silent too long
    const beat = setInterval(() => {
      const now = Date.now()
      conns.current.forEach((c, id) => {
        if (c.open) c.send({ type: 'ping' })
        if (now - (lastSeen.get(id) ?? now) > TIMEOUT) handleLeave(id)
      })
    }, PING_EVERY)

    peer.on('connection', (conn) => {
      // someone found the room; now their browser and ours try to connect directly
      const who = String(conn.metadata?.id ?? conn.peer).slice(0, 80)
      const whoName = String(conn.metadata?.name ?? '').slice(0, 12) || 'Someone'
      const without = (obj) => {
        const next = { ...obj }
        delete next[who]
        return next
      }
      setConnecting((c) => ({ ...c, [who]: whoName }))
      let opened = false
      const giveUp = setTimeout(() => {
        if (opened) return
        setConnecting(without)
        setFailedJoins((f) => ({ ...f, [who]: { name: whoName, tries: (f[who]?.tries ?? 0) + 1 } }))
        conn.close()
      }, JOIN_TIMEOUT)
      conn.on('open', () => {
        opened = true
        clearTimeout(giveUp)
        setConnecting(without)
        setFailedJoins(without)
        conns.current.set(conn.peer, conn)
        lastSeen.set(conn.peer, Date.now())
      })

      conn.on('data', (msg) => {
        lastSeen.set(conn.peer, Date.now())
        const { seats, game } = live.current
        if (msg.type === 'hello') {
          const id = typeof msg.id === 'string' ? msg.id.slice(0, 80) : null
          // came with just the room code: the host has to let them in (unless they're already a player here)
          if (conn.via === 'code' && id && !approved.has(id) && !seats.some((x) => x.id === id)) {
            const who = cleanName(msg.name) || 'Someone'
            setKnocks((k) => (k.some((x) => x.peer === conn.peer) ? k : [...k, { peer: conn.peer, id, name: who }].slice(-4)))
            return conn.send({ type: 'pending', host: seats[0].name })
          }
          if (!id) return conn.send({ type: 'refused', reason: 'Please reload the page and try again.' })
          if (id === seats[0].id) return conn.send({ type: 'refused', reason: "You're already the host of this room in another tab." })
          const mine = seats.findIndex((x, i) => i > 0 && x.id === id) // a seat this browser had before

          // same browser again (dropped out, or a second tab): give them their seat back
          if (mine > 0) {
            const old = seats[mine].peer
            if (old && old !== conn.peer) {
              const oldConn = conns.current.get(old)
              conns.current.delete(old) // forget it first so closing it doesn't count as leaving
              lastSeen.delete(old)
              oldConn?.close()
            }
            setSeats((s) => s.map((x, i) => (i === mine ? { ...x, peer: conn.peer, isBot: false } : x)))
            if (game) {
              setGame((g) =>
                g && {
                  ...g,
                  players: g.players.map((p, i) => (i === mine ? { ...p, isBot: false, name: seats[mine].name } : p)),
                  log: [`${seats[mine].name} is back and takes over from the bot.`, ...g.log].slice(0, 8),
                },
              )
            }
            return
          }

          if (game) return conn.send({ type: 'refused', reason: 'This game has already started. Only players from this game can rejoin, from the same browser they played on.' })
          if (seats.length >= MAX_PLAYERS) return conn.send({ type: 'refused', reason: 'The room is full.' })
          // two players with the same name get a number
          let guestName = cleanName(msg.name) || 'Guest'
          for (let k = 2; seats.some((x) => x.name === guestName); k++) guestName = `${cleanName(msg.name).slice(0, 9) || 'Guest'} ${k}`
          if (!seats.some((x) => x.peer === conn.peer)) notice(`${guestName} joined the room`)
          setSeats((s) => (s.some((x) => x.peer === conn.peer) ? s : [...s, { name: guestName, isBot: false, peer: conn.peer, id, ready: false }]))
        } else if (msg.type === 'ready' && !game) {
          const i = seats.findIndex((x) => x.peer === conn.peer)
          if (i <= 0 || seats[i].ready === !!msg.ready) return
          notice(msg.ready ? `${seats[i].name} is ready` : `${seats[i].name} isn't ready yet`)
          setSeats((s) => s.map((x, j) => (j === i ? { ...x, ready: !!msg.ready } : x)))
        } else if (msg.type === 'rename' && !game) {
          const i = seats.findIndex((x) => x.peer === conn.peer)
          const next = cleanName(msg.name)
          if (i <= 0 || !next || next === seats[i].name || seats.some((x) => x.name === next)) return
          notice(`${seats[i].name} is now ${next}`)
          setSeats((s) => s.map((x, j) => (j === i ? { ...x, name: next } : x)))
        } else if (msg.type === 'action') {
          const seat = seats.findIndex((x) => x.peer === conn.peer)
          // only accept moves that this guest is allowed to make right now
          setGame((g) => (seat > 0 && allowed(g, msg.action, seat) ? gameReducer(g, msg.action) : g))
        }
      })

      conn.on('close', () => {
        setKnocks((k) => k.filter((x) => x.peer !== conn.peer))
        handleLeave(conn.peer)
      })
      conn.helloAgain = (name, id) => conn.emit('data', { type: 'hello', name, id })
    })

    // the host answers a knock: let them in (replays their hello) or send them away
    admit.current = (knock, yes) => {
      setKnocks((k) => k.filter((x) => x.peer !== knock.peer))
      const conn = conns.current.get(knock.peer)
      if (!conn) return
      if (yes) {
        approved.add(knock.id)
        conn.helloAgain(knock.name, knock.id)
      } else {
        conn.send({ type: 'refused', reason: 'The host didn\'t let you in. Ask them for the invite link.' })
        setTimeout(() => conn.close(), 300)
      }
    }

    return () => {
      clearInterval(beat)
      conns.current.forEach((c) => c.close())
      peer.destroy()
    }
  }, [code])

  // send every guest the room (before the game) or the game, whenever anything changes
  useEffect(() => {
    seats.forEach((s, i) => {
      const conn = s.peer && conns.current.get(s.peer)
      if (!conn?.open) return
      if (game) conn.send({ type: 'state', state: game, seat: i, code })
      else conn.send({ type: 'lobby', seats: seats.map(({ name, isBot, ready }) => ({ name, isBot, ready: isBot || !!ready })), you: i, code, notices, settings, cash })
    })
  }, [seats, game, code, notices, settings, cash])

  // after a game: back to the waiting room (players who left during the game lose their seat; everyone readies up again)
  function backToRoom() {
    setSeats((s) => s.filter((x, i) => i === 0 || x.peer || (x.isBot && !game?.players[i]?.name.endsWith('(bot)'))).map((x, i) => (i === 0 || x.isBot ? x : { ...x, ready: false })))
    setGame(null)
    notice('Back in the room. Ready up for the next game!')
  }

  function start() {
    setGame(gameReducer(null, { type: 'NEW', seats: seats.map(({ name, isBot }, i) => ({ name, isBot, color: TOKEN_COLORS[i], piece: PIECE_IDS[i] })), startingCash: cash, settings }))
  }

  // the host's own moves, plus the bots' (the host's browser runs the bots)
  function hostDispatch(action) {
    setGame((g) => {
      if (!g) return g
      if (action.type === 'END_GAME') return gameReducer(g, action)
      const actor = actorOf(g, action)
      return actor === 0 || g.players[actor]?.isBot ? gameReducer(g, action) : g
    })
  }

  if (game) return <Game game={game} dispatch={hostDispatch} onPlayAgain={start} onBackToRoom={backToRoom} onQuit={onLeave} online={{ seat: 0, isHost: true, code }} />

  return (
    <Lobby
      code={code}
      status={status}
      error={error}
      seats={seats}
      you={0}
      isHost
      connecting={connecting}
      failedJoins={failedJoins}
      notices={notices}
      secret={secret}
      knocks={knocks}
      settings={settings}
      setSettings={setSettings}
      cash={cash}
      setCash={setCash}
      onAnswerKnock={(k, yes) => admit.current?.(k, yes)}
      onRename={(next) => {
        next = cleanName(next)
        if (!next || seats.some((x, j) => j > 0 && x.name === next)) return
        if (next !== seats[0].name) notice(`${seats[0].name} is now ${next}`)
        setSeats((s) => s.map((x, j) => (j === 0 ? { ...x, name: next } : x)))
        onRename(next)
      }}
      onAddBot={() => setSeats((s) => [...s, { name: randomBotName(s.map((x) => x.name)), isBot: true, peer: null, ready: true }])}
      onRemove={(i) => {
        const seat = seats[i]
        notice(seat.isBot ? `${seat.name} (bot) removed` : `The host removed ${seat.name}`)
        if (seat.peer) {
          conns.current.get(seat.peer)?.send({ type: 'refused', reason: 'The host removed you from the game.', kicked: true })
          setTimeout(() => conns.current.get(seat.peer)?.close(), 300)
        }
        setSeats((s) => s.filter((_, j) => j !== i))
      }}
      onStart={start}
      onLeave={onLeave}
    />
  )
}

// ---------------- Guest ----------------
function GuestRoom({ name, code, secret, onLeave, onRename }) {
  const [shownCode, setShownCode] = useState(code)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('connecting') // connecting | pending | lobby | game | closed | error
  const [phase, setPhase] = useState('server')
  const [error, setError] = useState(null)
  const [lobby, setLobby] = useState(null)
  const [view, setView] = useState(null) // { state, seat }
  const wasPlaying = useRef(false)
  const conn = useRef(null)
  const phaseRef = useRef('server')
  const nameRef = useRef(name)
  nameRef.current = name

  useEffect(() => {
    phaseRef.current = 'server'
    let leaving = false
    let lastHeard = Date.now()
    let joined = false
    setStatus('connecting')
    setPhase('server')
    setError(null)
    const peer = new Peer(PEER_OPTIONS)
    // don't wait forever: explain what went wrong
    const giveUp = setTimeout(() => {
      if (joined) return
      setError(
        phaseRef.current === 'server'
          ? "Couldn't reach the online service. Check your internet connection, then try again."
          : "The host didn't answer. Make sure they still have the room open, then try again.",
      )
      setStatus('error')
    }, JOIN_TIMEOUT)
    // heartbeat: tell the host we're here, and notice if the host goes quiet
    const beat = setInterval(() => {
      if (conn.current?.open) conn.current.send({ type: 'ping' })
      if (conn.current?.open && Date.now() - lastHeard > TIMEOUT) {
        conn.current.close()
        setStatus((s) => (s === 'error' ? s : 'closed'))
      }
    }, PING_EVERY)
    peer.on('open', () => {
      setPhase('host')
      phaseRef.current = 'host'
      // metadata: who we are, so the host knows a retry is the same person
      const c = peer.connect(PREFIX + (code || 'LINK'), { ...CONNECT_OPTIONS, secret, metadata: { id: playerId(), name: nameRef.current } })
      conn.current = c
      c.on('open', () => {
        lastHeard = Date.now()
        c.send({ type: 'hello', name: nameRef.current, id: playerId() })
      })
      c.on('data', (msg) => {
        lastHeard = Date.now()
        if (msg.code) setShownCode(msg.code)
        if (msg.type === 'pending') {
          joined = true
          clearTimeout(giveUp)
          setStatus('pending')
          setLobby((l) => ({ ...(l ?? {}), host: msg.host }))
          return
        }
        if (!joined && (msg.type === 'lobby' || msg.type === 'state' || msg.type === 'refused')) {
          joined = true
          clearTimeout(giveUp)
        }
        if (msg.type === 'lobby') {
          setLobby(msg)
          setStatus('lobby')
        } else if (msg.type === 'state') {
          wasPlaying.current = true
          setView(msg)
          setStatus('game')
        } else if (msg.type === 'refused') {
          setError(msg.reason)
          setStatus('error')
        }
      })
      c.on('close', () => !leaving && setStatus((s) => (s === 'error' ? s : 'closed')))
    })
    peer.on('error', (e) => {
      setError(
        e.type === 'peer-unavailable'
          ? secret
            ? "This invite link doesn't lead to an open room. The host may have closed it: ask them for a new link."
            : `No room with code ${code}. Check the code with your host, and that their room is still open.`
          : e.type === 'network'
            ? "Couldn't reach the online service. Check your internet connection, then try again."
            : `Connection problem (${e.type}).`,
      )
      setStatus('error')
    })
    return () => {
      leaving = true
      clearInterval(beat)
      clearTimeout(giveUp)
      peer.destroy()
    }
  }, [code, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = (action) => conn.current?.open && conn.current.send({ type: 'action', action })

  if (status === 'game' && view) {
    return <Game game={view.state} dispatch={send} onPlayAgain={null} onQuit={onLeave} online={{ seat: view.seat, isHost: false, code: shownCode }} />
  }
  if (status === 'lobby' && lobby) {
    const message = (m) => conn.current?.open && conn.current.send(m)
    return (
      <Lobby
        code={shownCode}
        status="open"
        seats={lobby.seats}
        you={lobby.you}
        notices={lobby.notices ?? []}
        settings={lobby.settings ?? DEFAULT_SETTINGS}
        cash={lobby.cash ?? STARTING_CASH}
        onReady={(ready) => message({ type: 'ready', ready })}
        onRename={(next) => {
          next = cleanName(next)
          if (!next) return
          message({ type: 'rename', name: next })
          onRename(next)
        }}
        onLeave={onLeave}
      />
    )
  }

  return (
    <Page>
      <div className="ol-status">
        {status === 'pending' && (
          <>
            <div className="ol-spinner" />
            <h3>Waiting for {lobby?.host ?? 'the host'} to let you in…</h3>
            <p>You joined with the code, so the host has to say yes. With an invite link you get in straight away.</p>
          </>
        )}
        {status === 'connecting' && (
          <>
            <div className="ol-spinner" />
            <h3>{shownCode ? `Joining game ${shownCode}…` : 'Joining the game…'}</h3>
            <ol className="ol-steps">
              <li className={phase === 'server' ? 'now' : 'done'}>Connecting to the online service</li>
              <li className={phase === 'host' ? 'now' : ''}>Finding the game</li>
            </ol>
          </>
        )}
        {status === 'error' && (
          <>
            <h3>Couldn't join</h3>
            <p className="ol-warn">{error}</p>
            <button className="btn primary" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          </>
        )}
        {status === 'closed' && wasPlaying.current && (
          <>
            <h3>You lost the connection</h3>
            <p>A bot is playing for you. Rejoin to take your seat back (from this browser).</p>
            <button className="btn primary" onClick={() => setAttempt((a) => a + 1)}>Rejoin game</button>
          </>
        )}
        {status === 'closed' && !wasPlaying.current && (
          <>
            <h3>The host closed the game</h3>
            <p>The connection to the host was lost.</p>
          </>
        )}
      </div>
      <button className="btn-link ol-back" onClick={onLeave}>← Back</button>
    </Page>
  )
}

// ---------------- Waiting room (host and guests) ----------------
function Lobby({ code, status, error, seats, you, isHost, connecting = {}, failedJoins = {}, notices = [], secret, knocks = [], settings, setSettings, cash, setCash, onAnswerKnock, onReady, onRename, onAddBot, onRemove, onStart, onLeave }) {
  const [copied, setCopied] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmKick, setConfirmKick] = useState(null)
  const me = seats[you]
  const notReady = seats.filter((s) => !s.isBot && !s.ready)
  const empty = MAX_PLAYERS - seats.length
  const finishRename = () => {
    if (draft.trim() && draft.trim() !== me?.name) onRename?.(draft)
    setEditing(false)
  }
  function copy(text, what) {
    navigator.clipboard?.writeText(text)
    setCopied(what)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Page>
      <h2>Game code</h2>
      {status === 'connecting' && <p className="ol-sub">Opening the game…</p>}
      {status === 'error' && <p className="ol-warn">{error}</p>}
      {status === 'open' && (
        <>
          <div className="ol-code-big">
            {code.split('').map((ch, i) => (
              <span key={i} style={{ '--i': i }}>{ch}</span>
            ))}
          </div>
          <div className="ol-copy-row">
            {isHost && secret && (
              <button className="btn primary" onClick={() => copy(inviteLink(secret), 'link')}>{copied === 'link' ? '✓ Link copied!' : '🔗 Copy invite link'}</button>
            )}
            <button className="btn" onClick={() => copy(code, 'code')}>{copied === 'code' ? 'Copied!' : 'Copy code'}</button>
          </div>
          {isHost && <p className="ol-note">🔒 The <b>invite link</b> is private: friends with it join straight away. Anyone typing the <b>code</b> has to be let in by you.</p>}
          {isHost &&
            knocks.map((k) => (
              <div key={k.peer} className="ol-knock">
                <span><b>{k.name}</b> wants to join with the code</span>
                <span className="ol-knock-btns">
                  <button className="btn small primary" onClick={() => onAnswerKnock(k, true)}>Let in</button>
                  <button className="btn small ghost" onClick={() => onAnswerKnock(k, false)}>Deny</button>
                </span>
              </div>
            ))}
        </>
      )}

      <h2>Players ({seats.length}/{MAX_PLAYERS})</h2>
      <ul className="ol-seats">
        {seats.map((s, i) => (
          <li key={`${i}-${s.name}`} style={{ '--c': TOKEN_COLORS[i] }}>
            <PieceIcon id={PIECE_IDS[i]} color={TOKEN_COLORS[i]} size={30} />
            {i === you && editing ? (
              <input className="text-input" autoFocus maxLength={12} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={finishRename} onKeyDown={(e) => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setEditing(false) }} />
            ) : (
              <span className="ol-seat-name">
                {s.name}
                {i === you && onRename && <button className="ol-rename" title="Change your name" onClick={() => { setDraft(s.name); setEditing(true) }}>✎ Edit</button>}
              </span>
            )}
            {i === 0 && <span className="ol-tag">HOST</span>}
            {i === you && <span className="ol-tag you">YOU</span>}
            {s.isBot && <span className="ol-tag">BOT</span>}
            {!s.isBot && i > 0 && <span className={`ol-ready${s.ready ? ' on' : ''}`}>{s.ready ? '✓ Ready' : 'Not ready'}</span>}
            {isHost && i > 0 &&
              (confirmKick === i ? (
                <button className="ol-remove confirm" onClick={() => { onRemove(i); setConfirmKick(null) }} onBlur={() => setConfirmKick(null)} autoFocus>Remove?</button>
              ) : (
                <button className="ol-remove" onClick={() => (s.isBot ? onRemove(i) : setConfirmKick(i))} title={s.isBot ? 'Remove bot' : 'Remove player'}>✕</button>
              ))}
          </li>
        ))}
        {empty > 0 && (
          <li className="ol-empty">
            <span className="ol-dots"><span /><span /><span /></span>
            <span className="ol-seat-name">Waiting… {empty} seat{empty === 1 ? '' : 's'} left</span>
            {isHost && <button className="btn small" onClick={onAddBot}>+ Add bot</button>}
          </li>
        )}
      </ul>
      {Object.entries(connecting).map(([id, who]) => (
        <p key={`c-${id}`} className="ol-join-note">{who} is connecting…</p>
      ))}
      {Object.entries(failedJoins)
        .filter(([id]) => !connecting[id])
        .map(([id, f]) => (
          <p key={`f-${id}`} className="ol-join-note bad">{f.name} found the game but couldn't connect{f.tries > 1 ? ` (${f.tries} tries)` : ''}. Ask them to press Try again.</p>
        ))}
      {notices.length > 0 && (
        <ul className="ol-feed">
          {notices.slice(0, 3).map((n) => (
            <li key={n.id}>{n.text}</li>
          ))}
        </ul>
      )}

      <h2>Starting money{!isHost && <span className="ol-h2-note"> · chosen by the host</span>}</h2>
      <div className="count-row">
        {CASH_OPTIONS.map((c) => (
          <button key={c} className={`chip wide${cash === c ? ' on' : ''}`} disabled={!isHost && cash !== c} onClick={() => isHost && setCash(c)}>${c.toLocaleString('en-US')}</button>
        ))}
      </div>
      <h2>Rules{!isHost && <span className="ol-h2-note"> · chosen by the host</span>}</h2>
      <RulesPicker settings={settings} setSettings={setSettings ?? (() => {})} readOnly={!isHost} />

      {isHost ? (
        <>
          <button className="start-btn" disabled={seats.length < 2 || status !== 'open' || notReady.length > 0} onClick={onStart}>
            {seats.length < 2 ? 'Waiting for players…' : notReady.length ? `Waiting for ${notReady.length === 1 ? notReady[0].name : `${notReady.length} players`} to be ready` : 'Start game'}
          </button>
          {seats.length >= 2 && notReady.length > 0 && <button className="btn-link ol-back" onClick={onStart}>Start anyway</button>}
        </>
      ) : (
        <>
          <button className={`start-btn ol-ready-btn${me?.ready ? ' is-ready' : ''}`} onClick={() => onReady?.(!me?.ready)}>{me?.ready ? "✓ I'm ready (tap to undo)" : "I'm ready!"}</button>
          <p className="hint ol-center">{me?.ready ? `Waiting for ${seats[0]?.name ?? 'the host'} to start…` : 'Tap Ready so the host knows you are set.'}</p>
        </>
      )}
      <button className="btn-link ol-back" onClick={onLeave}>Leave game</button>
    </Page>
  )
}

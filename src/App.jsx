import { useReducer, useState } from 'react'
import { gameReducer } from './game/rules.js'
import { dealReducer } from './deal/rules.js'
import Setup from './components/Setup.jsx'
import Game from './components/Game.jsx'
import DealGame from './deal/DealGame.jsx'

// Set up the players, then play: the board game or the Deal card game
export default function App() {
  const [game, dispatch] = useReducer(gameReducer, null)
  const [deal, dealDispatch] = useReducer(dealReducer, null)
  const [setup, setSetup] = useState(null) // the last setup, so "Play again" keeps the same players
  const [playing, setPlaying] = useState(false)

  const start = (next) => {
    setSetup(next)
    if (next.mode === 'deal') dealDispatch({ type: 'NEW', ...next })
    else dispatch({ type: 'NEW', ...next })
    setPlaying(true)
  }

  if (playing && setup?.mode === 'deal' && deal) {
    return <DealGame game={deal} dispatch={dealDispatch} onPlayAgain={() => start(setup)} onQuit={() => setPlaying(false)} />
  }
  if (!playing || !game) return <Setup initial={setup} onStart={start} />
  return <Game game={game} dispatch={dispatch} onPlayAgain={() => start(setup)} onQuit={() => setPlaying(false)} />
}

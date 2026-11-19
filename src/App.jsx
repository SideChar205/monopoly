import { useReducer, useState } from 'react'
import { gameReducer } from './game/rules.js'
import Setup from './components/Setup.jsx'
import Game from './components/Game.jsx'

// Two screens: set up the players, then play
export default function App() {
  const [game, dispatch] = useReducer(gameReducer, null)
  const [setup, setSetup] = useState(null) // the last setup, so "Play again" keeps the same players
  const [playing, setPlaying] = useState(false)

  const start = (next) => {
    setSetup(next)
    dispatch({ type: 'NEW', ...next })
    setPlaying(true)
  }

  if (!playing || !game) return <Setup initial={setup} onStart={start} />
  return <Game game={game} dispatch={dispatch} onPlayAgain={() => start(setup)} onQuit={() => setPlaying(false)} />
}

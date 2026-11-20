import { useEffect, useLayoutEffect, useState } from 'react'

// Real 3D dice (CSS cubes) shown just above the board's dice tray.
// They sit in their own flat layer over the board (not inside the tilted board), so the board can't cut through them.
// key={rollId} on this component replays the throw.

const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }
// how to turn the cube so a number faces up (the same list of rotations every time, so the spin is smooth)
const UP = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] }

function Face({ n }) {
  return (
    <div className={`sface s${n}`}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={PIPS[n].includes(k + 1) ? 'spip' : 'spip off'} />
      ))}
    </div>
  )
}

function rnd(seed, n) {
  const x = Math.sin(seed * 9301 + n * 49297) * 233280
  return x - Math.floor(x)
}

export default function ScreenDice({ dice, seed = 0, onRoll, trayRef, areaRef }) {
  const values = dice ?? [5, 3]
  const [spot, setSpot] = useState(null)
  const [landed, setLanded] = useState(!dice)

  // follow the tray's position on screen
  useLayoutEffect(() => {
    const place = () => {
      const t = trayRef.current?.getBoundingClientRect()
      const a = areaRef.current?.getBoundingClientRect()
      if (t && a) setSpot({ x: t.left + t.width / 2 - a.left, y: t.top + t.height / 2 - a.top, w: t.width })
    }
    place()
    // the board settles into place over the first moments: check again a few times
    const again = [50, 200, 600].map((ms) => setTimeout(place, ms))
    const ro = new ResizeObserver(place)
    if (areaRef.current) ro.observe(areaRef.current)
    window.addEventListener('resize', place)
    return () => {
      again.forEach(clearTimeout)
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [trayRef, areaRef])

  useEffect(() => {
    if (!dice) return
    const t = setTimeout(() => setLanded(true), 1150)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!spot) return null
  const angle = rnd(seed, 1) * Math.PI * 2 // the side the throw comes from
  const size = Math.max(42, Math.min(64, spot.w * 0.19))
  return (
    <div
      className={`screen-dice${dice ? ' rolled' : ''}${landed && dice && dice[0] === dice[1] ? ' doubles' : ''}${onRoll ? ' can-roll' : ''}`}
      style={{ left: spot.x, top: spot.y, '--size': `${size}px`, '--fx': `${Math.cos(angle) * 320}px`, '--fy': `${Math.sin(angle) * 200 - 40}px` }}
      onClick={onRoll ?? undefined}
      title={onRoll ? 'Roll the dice' : undefined}
    >
      {values.map((v, i) => {
        const [sx, sy] = UP[v]
        const spinX = (rnd(seed, 2 + i) > 0.5 ? 1 : -1) * 720
        const spinY = (rnd(seed, 4 + i) > 0.5 ? 1 : -1) * 540
        return (
          <div key={i} className="sdie-slot" style={{ '--i': i, '--yaw': `${Math.round((rnd(seed, 6 + i) - 0.5) * 70)}deg` }}>
            <span className="sdie-shadow" />
            <div className="sdie-hop">
              <div className="sdie-view">
                <div className="sdie" style={{ '--sx': `${sx}deg`, '--sy': `${sy}deg`, '--spx': `${spinX}deg`, '--spy': `${spinY}deg` }}>
                  <div className="score" />
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <Face key={n} n={n} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

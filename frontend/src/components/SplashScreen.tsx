import './SplashScreen.css'
import GradifyLogo from './GradifyLogo'
import { IconChart, IconGraph, IconUpload } from './icons'

interface SplashScreenProps {
  fading: boolean
  onFinish: () => void
}

const NODES = [
  { cx: 120, cy: 115, r: 5 },
  { cx: 245, cy: 300, r: 4 },
  { cx: 420, cy: 130, r: 6, hub: true },
  { cx: 380, cy: 425, r: 5 },
  { cx: 605, cy: 235, r: 7, hub: true },
  { cx: 560, cy: 470, r: 5 },
  { cx: 765, cy: 175, r: 6 },
  { cx: 845, cy: 370, r: 4.5 },
  { cx: 1045, cy: 115, r: 5 },
  { cx: 1185, cy: 305, r: 4 },
  { cx: 1105, cy: 525, r: 6 },
  { cx: 1325, cy: 420, r: 5 },
  { cx: 145, cy: 605, r: 4 },
  { cx: 345, cy: 705, r: 5 },
  { cx: 645, cy: 645, r: 6, hub: true },
  { cx: 885, cy: 705, r: 4 },
  { cx: 1185, cy: 745, r: 5 },
  { cx: 1365, cy: 640, r: 4, hub: true },
]

const EDGES = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 4],
  [3, 5],
  [4, 6],
  [4, 9],
  [5, 7],
  [6, 8],
  [7, 9],
  [8, 10],
  [9, 10],
  [10, 11],
  [3, 13],
  [4, 14],
  [13, 14],
  [14, 15],
  [14, 5],
  [15, 16],
  [16, 17],
  [12, 13],
]

const NODE_DELAY = NODES.map((_, i) => 0.12 + 0.14 * i)

const PARTICLES = [
  { x: '12%', y: '18%', size: 4, duration: '4s', delay: '0.2s' },
  { x: '76%', y: '24%', size: 5, duration: '3.6s', delay: '0.9s' },
  { x: '28%', y: '62%', size: 3, duration: '3.2s', delay: '0.4s' },
  { x: '58%', y: '48%', size: 4, duration: '4.4s', delay: '1.2s' },
  { x: '88%', y: '70%', size: 5, duration: '3.8s', delay: '0.1s' },
  { x: '40%', y: '82%', size: 3, duration: '4.1s', delay: '1.7s' },
  { x: '66%', y: '12%', size: 4, duration: '3.4s', delay: '0.6s' },
  { x: '14%', y: '86%', size: 5, duration: '4.6s', delay: '1.4s' },
  { x: '52%', y: '30%', size: 3, duration: '3.9s', delay: '0.8s' },
  { x: '82%', y: '50%', size: 4, duration: '4.2s', delay: '0.3s' },
  { x: '34%', y: '40%', size: 5, duration: '3.5s', delay: '1.9s' },
  { x: '94%', y: '86%', size: 3, duration: '4.0s', delay: '1.1s' },
]

export default function SplashScreen({ fading, onFinish }: SplashScreenProps) {
  return (
    <div className={`splash ${fading ? 'splash--fade-out' : ''}`}>
      <svg
        className="splash__scene"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            className="star-edge"
            x1={NODES[a].cx}
            y1={NODES[a].cy}
            x2={NODES[b].cx}
            y2={NODES[b].cy}
          />
        ))}

        {NODES.map((s, i) => (
          <circle
            key={i}
            className={`star-node${s.hub ? ' star-node--hub' : ' star-node--twinkle'}`}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            style={{ animationDelay: `${NODE_DELAY[i]}s` }}
          />
        ))}
      </svg>

      <div className="splash__particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="splash__particle"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <main className="splash__card">
        <div className="splash__brand">
          <GradifyLogo size={40} className="splash__logo-badge" />
          Gradify
        </div>

        <p className="splash__welcome">Bienvenido a</p>
        <h1 className="splash__title">Gradify</h1>
        <p className="splash__subtitle">Tu conexión académica inteligente</p>

        <ul className="splash__features">
          <li>
            <IconUpload />
            <span>Cargá el PDF de tu plan y armá tu carrera</span>
          </li>
          <li>
            <IconGraph />
            <span>Explorá las correlatividades en un grafo interactivo</span>
          </li>
          <li>
            <IconChart />
            <span>Seguí tu avance, créditos y aprobadas</span>
          </li>
        </ul>

        <button type="button" className="btn btn-gradify splash__button" onClick={onFinish}>
          Empezar
        </button>
      </main>
    </div>
  )
}
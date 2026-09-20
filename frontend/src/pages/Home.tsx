import { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCareerSelection } from '../hooks/useCareerSelection';
import { useCareers } from '../hooks/useCareers';
import { useFlashMessage } from '../hooks/useFlashMessage';
import { apiService } from '../api';
import type { Career, GraphData } from '../types';
import { getCareerColor } from '../utils/careerColor';
import { IconBoard, IconCap, IconCheck, IconCoins } from '../components/icons';
import PageHeader from '../components/PageHeader';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import MessageBanner from '../components/MessageBanner';
import ColorDot from '../components/ColorDot';

interface CareerEntry {
  career: Career;
  graph: GraphData | null;
}

const fmt = new Intl.NumberFormat('es-AR');

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setCareerId } = useCareerSelection();
  const { msg, flash, clear } = useFlashMessage();
  const { careers, loading } = useCareers({ onError: (m) => flash('danger', m) });
  const [stats, setStats] = useState<Record<string, GraphData | null>>({});

  useEffect(() => {
    let alive = true;
    if (!careers.length) return;
    Promise.all(
      careers.map(async (c) => {
        try {
          return [c._id, await apiService.getGraph(c._id)] as const;
        } catch {
          return [c._id, null] as const;
        }
      }),
    ).then((graphs) => {
      if (alive) setStats(Object.fromEntries(graphs));
    });
    return () => {
      alive = false;
    };
  }, [careers]);

  const entries = useMemo<CareerEntry[]>(
    () =>
      careers.map((career) => ({
        career,
        graph: stats[career._id] ?? null,
      })),
    [careers, stats],
  );

  const totals = useMemo(() => {
    let subjects = 0;
    let aprobadas = 0;
    let totalCredits = 0;
    let aprobCredits = 0;
    for (const { graph } of entries) {
      if (!graph) continue;
      subjects += graph.stats.total;
      aprobadas += graph.stats.aprobadas;
      totalCredits += graph.stats.creditsTotal;
      aprobCredits += graph.stats.creditsAprobados;
    }
    const pct = totalCredits > 0 ? Math.round((aprobCredits / totalCredits) * 100) : 0;
    return { subjects, aprobadas, totalCredits, aprobCredits, pct };
  }, [entries]);

  const go = (path: string, id: string) => {
    setCareerId(id);
    navigate(path);
  };

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.nickName} 👋`}
        sub="Planeá tu camino: cargá un plan, explorá sus correlatividades y seguí tu avance."
        action={
          <Button className="btn-gradify" onClick={() => navigate('/cargar')}>
            + Cargar plan nuevo
          </Button>
        }
      />

      <MessageBanner message={msg} onClose={clear} />

      {loading && <PageLoader text="Cargando tus planes…" />}

      {!loading && careers.length > 0 && (
        <div className="mini-stats">
          <div className="mini-stat">
            <span className="mini-stat__icon"><IconCap /></span>
            <div>
              <div className="mini-stat__value">{fmt.format(careers.length)}</div>
              <div className="mini-stat__label">planes cargados</div>
            </div>
          </div>
          <div className="mini-stat">
            <span className="mini-stat__icon"><IconBoard /></span>
            <div>
              <div className="mini-stat__value">{fmt.format(totals.subjects)}</div>
              <div className="mini-stat__label">materias en total</div>
            </div>
          </div>
          <div className="mini-stat">
            <span className="mini-stat__icon"><IconCheck /></span>
            <div>
              <div className="mini-stat__value">{fmt.format(totals.aprobadas)}</div>
              <div className="mini-stat__label">materias aprobadas</div>
            </div>
          </div>
          <div className="mini-stat">
            <span className="mini-stat__icon"><IconCoins /></span>
            <div className="flex-grow-1">
              <div className="mini-stat__value">{totals.pct}%</div>
              <div className="mini-stat__label">
                avance en créditos · {fmt.format(totals.aprobCredits)}/{fmt.format(totals.totalCredits)}
              </div>
              <div className="mini-progress mt-1">
                <div className="mini-progress__bar" style={{ width: `${totals.pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <EmptyState
          icon={<IconCap size={46} />}
          title="Todavía no tenés planes cargados"
          text="Subí el PDF del plan de estudios de una carrera y empezá a explorar sus correlatividades."
          action={
            <Button className="btn-gradify" onClick={() => navigate('/cargar')}>
              Cargar mi primer plan
            </Button>
          }
        />
      )}

      {!loading && entries.length > 0 && (
        <div className="career-grid">
          {entries.map(({ career, graph }) => {
            const color = getCareerColor(career);
            const s = graph?.stats;
            const pct =
              s && s.creditsTotal > 0
                ? Math.round((s.creditsAprobados / s.creditsTotal) * 100)
                : 0;
            const published = career.status === 'published';
            return (
              <article key={career._id} className="career-card">
                <div
                  className="career-card__cover"
                  style={{
                    background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 52%, #0b0f14) 100%)`,
                  }}
                >
                  <span
                    className={`career-card__cover-badge${published ? ' career-card__cover-badge--published' : ''}`}
                  >
                    {published ? 'Publicada' : 'Borrador'}
                  </span>
                  <span className="career-card__cover-icon"><IconCap /></span>
                  <span className="career-card__cover-title">{career.name}</span>
                </div>

                <div className="career-card__body">
                  <p className="career-card__institute">{career.institute || 'UNAHUR'}</p>

                  {graph ? (
                    <div className="chips">
                      <span className="chip">
                        <ColorDot color={color} /> {fmt.format(s?.total ?? 0)} materias
                      </span>
                      <span className="chip chip--success">{fmt.format(s?.aprobadas ?? 0)} aprobadas</span>
                      <span className="chip chip--warn">{fmt.format(s?.disponibles ?? 0)} disponibles</span>
                      <span className="chip">
                        <IconCoins size={13} /> {fmt.format(s?.creditsAprobados ?? 0)}/{fmt.format(s?.creditsTotal ?? 0)} cr
                      </span>
                    </div>
                  ) : (
                    <p className="text-muted small mb-3">Sin datos de materias todavía.</p>
                  )}

                  <div className="career-card__progress-row">
                    <span className="career-card__progress-label">Avance</span>
                    <div className="mini-progress">
                      <div className="mini-progress__bar" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="career-card__progress-label">{pct}%</span>
                  </div>
                </div>

                <div className="career-card__actions">
                  <Button size="sm" variant="outline-primary" onClick={() => go(`/grafo/${career._id}`, career._id)}>
                    Grafo
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={() => go(`/tablero/${career._id}`, career._id)}>
                    Tablero
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => go('/progreso', career._id)}>
                    Progreso
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => go(`/admin/${career._id}`, career._id)}>
                    Editar
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
// Estado de armado y empuje de materias del plan oficial.

const {
  cleanName,
  rowText,
  classifyPeriodHeader,
  isPeriodMarkerRow,
} = require("./shared");
const {
  splitRowFacts,
  TAB_TOTAL_RE,
  TAB_ACA_RE,
} = require("./officialPlanRows");

function fillRetroactiveCuat(ctx, cuat) {
  for (const s of ctx.subjects) {
    if (s.cuatrimestre == null && (s.year == null || s.year === ctx.state.year)) {
      s.cuatrimestre = cuat;
    }
  }
}

function fillRetroactiveYear(ctx, year) {
  for (const s of ctx.subjects) {
    if (s.year == null && s.kind === "Materia" && !s.optional) {
      s.year = year;
    }
  }
}

function applyMarkerRow(ctx, row) {
  const { state } = ctx;
  const joined = rowText(row);
  if (!joined) return false;
  const isTotalish = TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined);
  if (isTotalish) {
    const stripped = joined.replace(TAB_TOTAL_RE, " ").replace(TAB_ACA_RE, " ");
    const peri = classifyPeriodHeader(stripped);
    if (peri && peri.cuatrimestre) {
      fillRetroactiveCuat(ctx, peri.cuatrimestre);
      state.cuatrimestre = peri.cuatrimestre + 1;
    } else if (peri) {
      fillRetroactiveYear(ctx, peri.year);
      state.year = peri.year;
      state.cuatrimestre = null;
    }
    return true;
  }
  if (isPeriodMarkerRow(row)) {
    const peri = classifyPeriodHeader(joined);
    if (peri.year) {
      state.year = peri.year;
      // en carreras con subtotales por cuatrimestre el año no define cuatrimestre
      state.cuatrimestre = null;
    } else if (peri.cuatrimestre) {
      state.cuatrimestre = peri.cuatrimestre;
    }
    return true;
  }
  return false;
}

function pushSubject(ctx, anchor) {
  const { meta, state, subjects, seen } = ctx;
  const nums = anchor.nums;
  const yearCol = meta && meta.yearX != null;
  if (yearCol && anchor.yearCol != null) state.year = anchor.yearCol;

  let facts;
  let credits;
  if (anchor.dialectAgro) {
    // Dialecto Asignatura|Campo|Carga: [carga semanal → his, carga total → ht],
    // sin créditos ni duración en la tabla.
    const vs = nums.map((n) => n.v);
    facts = {
      his: vs[0] ?? 0,
      hit: 0,
      hite: 0,
      hip: 0,
      htat: 0,
      ht: vs[1] ?? 0,
    };
    credits = 0;
  } else if (meta) {
    const byC = {};
    let tf = null;
    for (const n of nums) {
      let bestField = null;
      let bestD = Infinity;
      for (const [field, x] of meta.labels) {
        const d = Math.abs(n.x - x);
        if (d < bestD) {
          bestD = d;
          bestField = field;
        }
      }
      if (bestD > 45) continue;
      if (bestField === "credits") {
        credits = n.v;
      } else if (bestField === "tf") {
        tf = n.v;
      } else {
        if (byC[bestField] == null) byC[bestField] = n.v;
      }
    }
    facts = {
      his: byC.his ?? 0,
      hit: byC.hit ?? 0,
      hite: byC.hite ?? 0,
      hip: byC.hip ?? 0,
      htat: byC.htat ?? 0,
      ht: byC.ht ?? 0,
      ...(tf != null ? { tf } : {}),
    };
    if (credits == null) {
      credits = meta.noCredits
        ? 0
        : nums.length
          ? nums[nums.length - 1].v
          : 0;
    }
  } else {
    facts = splitRowFacts({
      nums: nums.map((n) => n.v),
      duration: anchor.duration,
    });
    credits = facts.credits;
  }

  const name = cleanName(anchor.nameParts.map((p) => p.t));
  if (!name) return null;

  const isAca = /\bACA\b/i.test(name);
  const isAu = /^AU[_ ]/i.test(name);

  const code = `OF${String(anchor.num ?? subjects.length + 1).padStart(3, "0")}`;

  const entry = {
    code,
    name,
    year: (yearCol ? anchor.yearCol : null) ?? state.year,
    cuatrimestre: state.cuatrimestre,
    duration: anchor.duration || "C",
    hours: facts,
    credits: credits ?? 0,
    kind: isAca ? "ACA" : "Materia",
    generic: isAca ? "ACA" : null,
    optional: isAu || isAca,
    intermediate: !!state.inIntermediate,
  };

  if (isAca) {
    // La ACA no pertenece a ningún año/cuatrimestre y su código es estable.
    entry.year = null;
    entry.cuatrimestre = null;
    entry.code = "ACA";
  }

  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  const existing = seen.get(key);
  if (existing) {
    if (existing.cuatrimestre == null && entry.cuatrimestre != null) {
      existing.cuatrimestre = entry.cuatrimestre;
    }
    if (existing.year == null && entry.year != null) {
      existing.year = entry.year;
    }
    if (entry.intermediate) existing.intermediate = true;
    for (const [k, v] of Object.entries(entry.hours || {})) {
      if (!existing.hours[k]) existing.hours[k] = v;
    }
    if (!existing.credits) {
      existing.credits = entry.credits;
    } else if (existing.kind === "ACA" && entry.credits > existing.credits) {
      // La misma fila ACA aparece en la tabla del título intermedio y en la
      // de la licenciatura con créditos distintos (p. ej. 10 y 30): el total
      // del plan (creditsFinal) debe usar la de la licenciatura.
      existing.credits = entry.credits;
    }
    return existing;
  }
  seen.set(key, entry);
  subjects.push(entry);
  return entry;
}

module.exports = { applyMarkerRow, pushSubject };

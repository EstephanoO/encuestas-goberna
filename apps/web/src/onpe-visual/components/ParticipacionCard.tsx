import { useEffect, useState } from 'react';

interface MapaCalorRow {
  ambitoGeografico: number;
  ubigeoNivel01: number | null;
  porcentajeActasContabilizadas: number | null;
  actasContabilizadas: number | null;
  porcentajeAsistentes: number | null;
  asistentes: number | null;
}

interface ParticipacionData {
  totales?: {
    totalElectoresHabiles: number;
    totalAsistentes: number;
    totalAusentes: number;
    porcentajeAsistentes: number;
    porcentajeAusentes: number;
  };
  mapaCalor?: MapaCalorRow[];
}

// ubigeo nivel 01 → nombre depto (ONPE devuelve sin 0 padding)
const DEPT_NAME: Record<number, string> = {
  10000: 'Amazonas', 20000: 'Áncash', 30000: 'Apurímac', 40000: 'Arequipa', 50000: 'Ayacucho',
  60000: 'Cajamarca', 70000: 'Cusco', 80000: 'Huancavelica', 90000: 'Huánuco', 100000: 'Ica',
  110000: 'Junín', 120000: 'La Libertad', 130000: 'Lambayeque', 140000: 'Lima', 150000: 'Loreto',
  160000: 'Madre de Dios', 170000: 'Moquegua', 180000: 'Pasco', 190000: 'Piura', 200000: 'Puno',
  210000: 'San Martín', 220000: 'Tacna', 230000: 'Tumbes', 240000: 'Callao', 250000: 'Ucayali',
};

export function ParticipacionCard() {
  const [data, setData] = useState<ParticipacionData | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/api/participacion?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setData(j);
      } catch {}
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!data?.totales) return null;
  const t = data.totales;

  // Departamentos: filtrar solo nivel 01
  const depts = (data.mapaCalor || [])
    .filter(r => r.ubigeoNivel01 != null && r.porcentajeAsistentes != null && r.ambitoGeografico === 1)
    .map(r => ({
      nombre: DEPT_NAME[r.ubigeoNivel01 as number] || `Dpto ${r.ubigeoNivel01}`,
      pct: r.porcentajeAsistentes as number,
      asistentes: r.asistentes || 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  const extranjero = (data.mapaCalor || []).find(r => r.ambitoGeografico === 2);

  return (
    <div className="card" style={{ marginBottom: 16, padding: 18 }}>
      <div className="card-title">Participación ciudadana</div>
      <div className="card-sub">Asistencia a las urnas · ONPE en vivo</div>

      {/* Stat hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
        <Stat label="Asistentes" value={t.totalAsistentes.toLocaleString('es-PE')} sub={`${t.porcentajeAsistentes.toFixed(2)}%`} color="#2ECDA7" />
        <Stat label="Ausentes"  value={t.totalAusentes.toLocaleString('es-PE')}  sub={`${t.porcentajeAusentes.toFixed(2)}%`} color="#E04848" />
        <Stat label="Electores hábiles" value={t.totalElectoresHabiles.toLocaleString('es-PE')} sub="padrón total" color="#4A90D9" />
      </div>

      {/* Barra global */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--bg-alt)' }}>
          <div style={{ width: `${t.porcentajeAsistentes}%`, background: '#2ECDA7' }} />
          <div style={{ width: `${t.porcentajeAusentes}%`, background: '#E04848' }} />
          <div style={{ flex: 1, background: '#9aa0ab' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--tx3)', marginTop: 4 }}>
          <span>{t.porcentajeAsistentes.toFixed(1)}% asistió</span>
          <span>{t.porcentajeAusentes.toFixed(1)}% ausente</span>
          <span>{(100 - t.porcentajeAsistentes - t.porcentajeAusentes).toFixed(1)}% otros</span>
        </div>
      </div>

      {/* Top y bottom departamentos */}
      {depts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, color: 'var(--tx3)', marginBottom: 8 }}>MÁS PARTICIPATIVOS</div>
            {depts.slice(0, 5).map(d => (
              <div key={d.nombre} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--tx1)', fontWeight: 500 }}>{d.nombre}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#2ECDA7' }}>{d.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, color: 'var(--tx3)', marginBottom: 8 }}>MENOS PARTICIPATIVOS</div>
            {depts.slice(-5).reverse().map(d => (
              <div key={d.nombre} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--tx1)', fontWeight: 500 }}>{d.nombre}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#E89A3A' }}>{d.pct.toFixed(1)}%</span>
              </div>
            ))}
            {extranjero?.porcentajeAsistentes != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--tx1)', fontWeight: 500 }}>Extranjero</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#E04848' }}>{extranjero.porcentajeAsistentes.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-alt)', borderRadius: 10, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--tx3)', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

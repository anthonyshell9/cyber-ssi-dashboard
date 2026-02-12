import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import ExportButton from "../components/ExportButton";
import "./Evaluations.css";

const EXPORT_COLUMNS = [
  { key: 'nomFournisseur', label: 'Fournisseur' },
  { key: 'typePrestataire', label: 'Type' },
  { key: 'dependance', label: 'Dependance' },
  { key: 'penetration', label: 'Penetration' },
  { key: 'maturite', label: 'Maturite' },
  { key: 'confiance', label: 'Confiance' },
  { key: 'riskNote', label: 'Note Risque' },
  { key: 'riskInterpretation', label: 'Interpretation' },
  { key: 'lastEvaluation', label: 'Derniere Evaluation' },
];

const computeRiskScore = (dep, pen, mat, conf) => {
  if (!mat || !conf) return { note: null, interpretation: "Non evalue", color: "gray" };
  const note = (dep * pen) / (mat * conf);
  if (note < 1) return { note: Math.round(note * 100) / 100, interpretation: "FAVORABLE", color: "green" };
  if (note === 1) return { note: 1, interpretation: "EQUILIBREE", color: "yellow" };
  if (note <= 2) return { note: Math.round(note * 100) / 100, interpretation: "A RISQUE", color: "orange" };
  return { note: Math.round(note * 100) / 100, interpretation: "CRITIQUE", color: "red" };
};

const getExposureColor = (val) => {
  if (!val) return '#64748b';
  if (val <= 1) return '#10b981';
  if (val <= 2) return '#eab308';
  if (val <= 3) return '#f97316';
  return '#ef4444';
};

const getReliabilityColor = (val) => {
  if (!val) return '#64748b';
  if (val >= 4) return '#10b981';
  if (val >= 3) return '#eab308';
  if (val >= 2) return '#f97316';
  return '#ef4444';
};

const getRiskDisplayColor = (color) => {
  if (color === 'green') return '#10b981';
  if (color === 'yellow') return '#eab308';
  if (color === 'orange') return '#f97316';
  if (color === 'red') return '#ef4444';
  return '#64748b';
};

const Evaluations = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setFournisseurs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getEvalStatus = (f) => {
    if (!f.lastEvaluation) return "missing";
    const lastDate = new Date(f.lastEvaluation);
    const monthsAgo = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo > 12) return "expired";
    if (monthsAgo > 6) return "warning";
    return "ok";
  };

  const enriched = fournisseurs.map(f => {
    const dep = Number(f.dependance) || Number(f.niveauDependance) || null;
    const pen = Number(f.penetration) || null;
    const mat = Number(f.maturite) || Number(f.niveauMaturite) || null;
    const conf = Number(f.confiance) || Number(f.niveauConfiance) || null;
    const risk = (dep && pen && mat && conf)
      ? computeRiskScore(dep, pen, mat, conf)
      : { note: null, interpretation: "Non evalue", color: "gray" };
    return { ...f, dep, pen, mat, conf, risk };
  });

  const filtered = enriched.filter(f => {
    if (filter === "all") return true;
    if (filter === "FAVORABLE") return f.risk.interpretation === "FAVORABLE";
    if (filter === "EQUILIBREE") return f.risk.interpretation === "EQUILIBREE";
    if (filter === "A RISQUE") return f.risk.interpretation === "A RISQUE";
    if (filter === "CRITIQUE") return f.risk.interpretation === "CRITIQUE";
    return true;
  });

  const stats = {
    total: fournisseurs.length,
    favorable: enriched.filter(f => f.risk.interpretation === "FAVORABLE").length,
    aRisque: enriched.filter(f => f.risk.interpretation === "A RISQUE").length,
    critique: enriched.filter(f => f.risk.interpretation === "CRITIQUE").length,
    nonEvalue: enriched.filter(f => f.risk.interpretation === "Non evalue").length,
  };

  return (
    <div className="eval-dashboard">
      <div className="eval-bg"></div>

      <header className="eval-header">
        <div className="header-left">
          <button onClick={() => navigate('/gestion')} className="btn-back-eval">&larr; Retour</button>
          <div>
            <h1>EVALUATIONS EBIOS RM</h1>
            <p>Evaluation des parties prenantes</p>
          </div>
        </div>
        <ExportButton data={filtered} columns={EXPORT_COLUMNS} filename="evaluations-ebios" title="Evaluations EBIOS RM" />
      </header>

      {/* KPIs */}
      <div className="eval-kpis">
        <div className="kpi-card">
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Total fournisseurs</div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-value">{stats.favorable}</div>
          <div className="kpi-label">FAVORABLE</div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-value">{stats.aRisque}</div>
          <div className="kpi-label">A RISQUE</div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-value">{stats.critique}</div>
          <div className="kpi-label">CRITIQUE</div>
        </div>
        <div className="kpi-card kpi-gray">
          <div className="kpi-value">{stats.nonEvalue}</div>
          <div className="kpi-label">Non evalue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="eval-toolbar">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="eval-filter">
          <option value="all">Tous les niveaux</option>
          <option value="FAVORABLE">FAVORABLE</option>
          <option value="EQUILIBREE">EQUILIBREE</option>
          <option value="A RISQUE">A RISQUE</option>
          <option value="CRITIQUE">CRITIQUE</option>
        </select>
      </div>

      {/* Table */}
      <div className="eval-table-wrap">
        {loading ? (
          <div className="eval-loader"><div className="cyber-spinner"></div></div>
        ) : (
          <table className="eval-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Type</th>
                <th>Dep.</th>
                <th>Pen.</th>
                <th>Mat.</th>
                <th>Conf.</th>
                <th>Note</th>
                <th>Interpretation</th>
                <th>Derniere Eval</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const status = getEvalStatus(f);
                return (
                  <tr key={f.id}>
                    <td>
                      <div style={{fontWeight: 'bold'}}>{f.nomFournisseur}</div>
                      <div style={{color: '#64748b', fontSize: '0.8rem'}}>{f.email}</div>
                    </td>
                    <td>{f.typePrestataire}</td>
                    <td>
                      <span className="dim-number-badge" style={{background: `${getExposureColor(f.dep)}20`, color: getExposureColor(f.dep)}}>
                        {f.dep || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="dim-number-badge" style={{background: `${getExposureColor(f.pen)}20`, color: getExposureColor(f.pen)}}>
                        {f.pen || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="dim-number-badge" style={{background: `${getReliabilityColor(f.mat)}20`, color: getReliabilityColor(f.mat)}}>
                        {f.mat || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="dim-number-badge" style={{background: `${getReliabilityColor(f.conf)}20`, color: getReliabilityColor(f.conf)}}>
                        {f.conf || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="risk-note-badge" style={{color: getRiskDisplayColor(f.risk.color), fontWeight: 'bold', fontSize: '1.1rem'}}>
                        {f.risk.note !== null ? f.risk.note : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-interpretation-pill risk-${f.risk.color}`}>
                        {f.risk.interpretation}
                      </span>
                    </td>
                    <td style={{color: '#94a3b8', fontSize: '0.85rem'}}>
                      {f.lastEvaluation ? new Date(f.lastEvaluation).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                    <td>
                      <span className={`eval-status-pill ${status}`}>
                        {status === 'ok' && 'A jour'}
                        {status === 'warning' && 'Bientot'}
                        {status === 'expired' && 'Expiree'}
                        {status === 'missing' && 'Manquante'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => navigate(`/fournisseur/${f.id}`)} className="btn-eval-action">
                        {f.lastEvaluation ? 'Re-evaluer' : 'Evaluer'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="11" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>Aucun fournisseur ne correspond au filtre.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Evaluations;

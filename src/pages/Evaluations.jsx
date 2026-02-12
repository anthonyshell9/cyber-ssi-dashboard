import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import ExportButton from "../components/ExportButton";
import "./Evaluations.css";

const EXPORT_COLUMNS = [
  { key: 'nomFournisseur', label: 'Fournisseur' },
  { key: 'typePrestataire', label: 'Type' },
  { key: 'niveauConfiance', label: 'Confiance' },
  { key: 'doraReadiness', label: 'DORA %' },
  { key: 'isoMaturity', label: 'ISO Maturite' },
  { key: 'lastEvaluation', label: 'Derniere Evaluation' },
];

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

  const getDoraColor = (score) => {
    if (!score) return '#64748b';
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getConfColor = (score) => {
    if (!score) return '#64748b';
    if (score >= 4) return '#10b981';
    if (score >= 3) return '#f59e0b';
    return '#ef4444';
  };

  const filtered = fournisseurs.filter(f => {
    if (filter === "all") return true;
    return getEvalStatus(f) === filter;
  });

  const stats = {
    total: fournisseurs.length,
    evaluated: fournisseurs.filter(f => f.lastEvaluation).length,
    missing: fournisseurs.filter(f => !f.lastEvaluation).length,
    expired: fournisseurs.filter(f => getEvalStatus(f) === "expired").length,
    avgDora: fournisseurs.filter(f => f.doraReadiness).length > 0
      ? Math.round(fournisseurs.filter(f => f.doraReadiness).reduce((s, f) => s + Number(f.doraReadiness), 0) / fournisseurs.filter(f => f.doraReadiness).length)
      : 0,
  };

  return (
    <div className="eval-dashboard">
      <div className="eval-bg"></div>

      <header className="eval-header">
        <div className="header-left">
          <button onClick={() => navigate('/gestion')} className="btn-back-eval">&larr; Retour</button>
          <div>
            <h1>EVALUATIONS FOURNISSEURS</h1>
            <p>Suivi des evaluations DORA + ISO 27001 de chaque prestataire</p>
          </div>
        </div>
        <ExportButton data={filtered} columns={EXPORT_COLUMNS} filename="evaluations" title="Evaluations Fournisseurs" />
      </header>

      {/* KPIs */}
      <div className="eval-kpis">
        <div className="kpi-card">
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Total fournisseurs</div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-value">{stats.evaluated}</div>
          <div className="kpi-label">Evalues</div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-value">{stats.missing}</div>
          <div className="kpi-label">Jamais evalues</div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-value">{stats.expired}</div>
          <div className="kpi-label">Evaluation expiree (&gt;12 mois)</div>
        </div>
        <div className="kpi-card kpi-cyan">
          <div className="kpi-value">{stats.avgDora}%</div>
          <div className="kpi-label">DORA Readiness moyen</div>
        </div>
      </div>

      {/* Filters */}
      <div className="eval-toolbar">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="eval-filter">
          <option value="all">Tous</option>
          <option value="missing">Jamais evalues</option>
          <option value="expired">Evaluation expiree</option>
          <option value="warning">A re-evaluer bientot</option>
          <option value="ok">A jour</option>
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
                <th>Confiance</th>
                <th>DORA Readiness</th>
                <th>ISO Maturite</th>
                <th>Derniere Evaluation</th>
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
                      <span style={{color: getConfColor(f.niveauConfiance), fontWeight: 'bold', fontSize: '1.1rem'}}>
                        {f.niveauConfiance || '—'}/5
                      </span>
                    </td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{flex: 1, height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden'}}>
                          <div style={{width: `${f.doraReadiness || 0}%`, height: '100%', background: getDoraColor(f.doraReadiness), borderRadius: '4px', transition: 'width 0.3s'}}></div>
                        </div>
                        <span style={{color: getDoraColor(f.doraReadiness), fontWeight: 'bold', minWidth: '40px'}}>{f.doraReadiness || '—'}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{color: getConfColor(f.isoMaturity), fontWeight: 'bold'}}>
                        {f.isoMaturity || '—'}/5
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
                <tr><td colSpan="8" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>Aucun fournisseur ne correspond au filtre.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Evaluations;

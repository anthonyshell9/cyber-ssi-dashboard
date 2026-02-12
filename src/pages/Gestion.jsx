import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";

import DashboardStats from "../components/DashboardStats.jsx";
import CyberMap from "../components/CyberMap.jsx";
import ExportButton from "../components/ExportButton.jsx";
import './gestion.css';

const EXPORT_COLUMNS = [
  { key: 'nomFournisseur', label: 'Fournisseur' },
  { key: 'email', label: 'Email' },
  { key: 'typePrestataire', label: 'Type' },
  { key: 'niveauConfiance', label: 'Confiance' },
  { key: 'status', label: 'Statut' },
];

const Gestion = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [fournisseurs, setFournisseurs] = useState([]);
  const [criticalIncidents, setCriticalIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFournisseurs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const qInc = query(collection(db, "incidents"), where("gravite", "==", "Critique"), where("statut", "==", "En cours"));
    const unsubInc = onSnapshot(qInc, (s) => setCriticalIncidents(s.docs.map(d => d.data())));
    return () => unsubInc();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "validé" ? "en_attente" : "validé";
    const ref = doc(db, "fournisseurs", id);
    await updateDoc(ref, { status: newStatus });

    if (newStatus === "validé") {
      addNotification("success", "Accès fournisseur validé. Protocole activé.");
    } else {
      addNotification("warning", "Fournisseur suspendu. Accès révoqué.");
    }
  };

  const filtered = fournisseurs.filter(f => {
    const search = f.nomFournisseur?.toLowerCase() || "";
    const email = f.email?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    const matchesSearch = search.includes(term) || email.includes(term);
    const matchesStatus = filterStatus === "all" || f.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus]);

  // Pagination computed values
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
  const paginated = filtered.slice(startIndex, endIndex);

  const stats = {
    total: fournisseurs.length,
    valides: fournisseurs.filter(f => f.status === "validé").length,
    risques: fournisseurs.filter(f => Number(f.niveauConfiance) <= 2).length
  };

  return (
      <main className="main-content">
        {criticalIncidents.length > 0 && (
          <div style={{background: 'linear-gradient(90deg, #7f1d1d, #ef4444)', color: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fca5a5', boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)', animation: 'pulse 2s infinite', cursor: 'pointer'}} onClick={() => navigate('/crise')}>
            <div style={{fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px'}}>ALERTE CYBER : {criticalIncidents.length} Incident(s) Critique(s) en cours !</div>
            <div style={{fontSize: '0.9rem', background:'rgba(0,0,0,0.3)', padding:'5px 10px', borderRadius:'4px'}}>Gerer la crise</div>
          </div>
        )}

        <header className="dashboard-header">
          <div className="header-titles"><h1>Centre de Controle</h1><p>Pilotage centralise de la securite fournisseurs.</p></div>
          <div className="stats-grid">
            <div className="cyber-card stat-card"><div className="stat-icon">&#128194;</div><div className="stat-info"><span className="stat-num">{stats.total}</span><span className="stat-label">Total</span></div></div>
            <div className="cyber-card stat-card"><div className="stat-icon">&#128737;&#65039;</div><div className="stat-info"><span className="stat-num text-green">{stats.valides}</span><span className="stat-label">Valides</span></div></div>
            <div className="cyber-card stat-card alert-mode"><div className="stat-icon">&#9888;&#65039;</div><div className="stat-info"><span className="stat-num text-red">{stats.risques}</span><span className="stat-label">Critiques</span></div></div>
          </div>
        </header>

        {!loading && fournisseurs.length > 0 && (<><DashboardStats fournisseurs={fournisseurs} /><CyberMap fournisseurs={fournisseurs} /></>)}

        <div className="toolbar glass-panel">
          <div className="search-wrapper"><span className="search-icon">&#128269;</span><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="filter-wrapper">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Tout afficher</option>
              <option value="en_attente">En Attente</option>
              <option value="validé">Valide</option>
            </select>
          </div>
          <ExportButton
            data={filtered}
            columns={EXPORT_COLUMNS}
            filename="fournisseurs"
            title="Liste des Fournisseurs"
          />
        </div>

        <div className="data-grid-container glass-panel">
          {loading ? (<div className="cyber-loader-container"><div className="cyber-spinner"></div><p>Synchronisation...</p></div>) : (
            <div className="table-responsive">
              <table className="cyber-table">
                <thead><tr><th>Fournisseur</th><th>Service</th><th>Confiance</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {paginated.map((f) => (
                    <tr key={f.id} className="fade-in-row">
                      <td><div className="fw-bold">{f.nomFournisseur}</div><div className="text-muted-sm">{f.email}</div></td>
                      <td className="tech-font">{f.typePrestataire}</td>
                      <td><div className="risk-meter"><div className={`risk-fill level-${f.niveauConfiance}`} style={{width: `${(Number(f.niveauConfiance)/5)*100}%`}}></div><span className="risk-score">{f.niveauConfiance}/5</span></div></td>
                      <td><span className={`status-pill ${f.status === "validé" ? "ok" : "pending"}`}>{f.status === "validé" ? "ACTIF" : "ATTENTE"}</span></td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <button className="btn-icon btn-scan" onClick={() => navigate(`/intelligence/${f.id}`)}>&#128225;</button>
                          <button className="btn-icon btn-view" onClick={() => navigate(`/fournisseur/${f.id}`)}>&#128065;&#65039;</button>
                          <button className="btn-icon btn-edit" onClick={() => navigate(`/modifier/${f.id}`)}>&#9998;&#65039;</button>
                          <button className={`btn-toggle ${f.status === "validé" ? "btn-suspend" : "btn-validate"}`} onClick={() => toggleStatus(f.id, f.status)}>{f.status === "validé" ? "STOP" : "OK"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="pagination-bar">
              <div className="pagination-info">
                {startIndex + 1}-{endIndex} sur {filtered.length} fournisseurs
              </div>
              <div className="pagination-controls">
                <select
                  className="pagination-per-page"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <button
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Prec
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-btn ${currentPage === pageNum ? 'pagination-active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Suiv
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
  );
};

export default Gestion;

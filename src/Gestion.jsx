import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "./db/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom"; 
import { useNotification } from "./NotificationContext";

import DashboardStats from "./DashboardStats.jsx";
import CyberMap from "./CyberMap.jsx";
import './gestion.css'; // Assure-toi que c'est bien écrit en minuscule ici

const Gestion = ({ setConnectedUser }) => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [fournisseurs, setFournisseurs] = useState([]);
  const [criticalIncidents, setCriticalIncidents] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogout = async () => {
    await signOut(auth);
    setConnectedUser(null);
  };

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

  const stats = {
    total: fournisseurs.length,
    valides: fournisseurs.filter(f => f.status === "validé").length,
    risques: fournisseurs.filter(f => Number(f.niveauConfiance) <= 2).length
  };

  return (
    <div className="cyber-dashboard">
      <div className="cyber-bg-animation"></div>
      
      <nav className="glass-nav">
        <div className="nav-brand-area">
          <div className="brand-logo-anim">☁️</div>
          <span className="brand-text">CYBER-SSI <span className="neon-text">COMMAND</span></span>
        </div>
        <div className="nav-links-center">
          <button className={`nav-item ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}>Dashboard</button>
          
          {/* BOUTON CRISE (Rouge) */}
          <button className="nav-item" style={{color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', marginLeft: '10px'}} onClick={() => navigate('/crise')}>🚨 CRISE</button>
          
          {/* BOUTON PLANNING (Cyan) */}
          <button className="nav-item" style={{color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)', marginLeft: '10px'}} onClick={() => navigate('/audits')}>📅 PLANNING</button>
          
          {/* BOUTON ANNUAIRE (Violet) - AJOUTÉ */}
          <button className="nav-item" style={{color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)', marginLeft: '10px'}} onClick={() => navigate('/annuaire')}>📇 ANNUAIRE</button>
        </div>
        <div className="nav-user-area">
          <span className="user-role">ADMIN</span>
          <button onClick={handleLogout} className="btn-cyber-logout">QUITTER</button>
        </div>
      </nav>

      <main className="main-content">
        {criticalIncidents.length > 0 && (
          <div style={{background: 'linear-gradient(90deg, #7f1d1d, #ef4444)', color: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fca5a5', boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)', animation: 'pulse 2s infinite', cursor: 'pointer'}} onClick={() => navigate('/crise')}>
            <div style={{fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px'}}><span style={{fontSize:'1.5rem'}}>🚨</span>ALERTE CYBER : {criticalIncidents.length} Incident(s) Critique(s) en cours !</div>
            <div style={{fontSize: '0.9rem', background:'rgba(0,0,0,0.3)', padding:'5px 10px', borderRadius:'4px'}}>Gérer la crise →</div>
          </div>
        )}

        <header className="dashboard-header">
          <div className="header-titles"><h1>Centre de Contrôle</h1><p>Pilotage centralisé de la sécurité fournisseurs.</p></div>
          <div className="stats-grid">
            <div className="cyber-card stat-card"><div className="stat-icon">📂</div><div className="stat-info"><span className="stat-num">{stats.total}</span><span className="stat-label">Total</span></div></div>
            <div className="cyber-card stat-card"><div className="stat-icon">🛡️</div><div className="stat-info"><span className="stat-num text-green">{stats.valides}</span><span className="stat-label">Validés</span></div></div>
            <div className="cyber-card stat-card alert-mode"><div className="stat-icon">⚠️</div><div className="stat-info"><span className="stat-num text-red">{stats.risques}</span><span className="stat-label">Critiques</span></div></div>
          </div>
        </header>

        {!loading && fournisseurs.length > 0 && (<><DashboardStats fournisseurs={fournisseurs} /><CyberMap fournisseurs={fournisseurs} /></>)}

        <div className="toolbar glass-panel">
          <div className="search-wrapper"><span className="search-icon">🔍</span><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="filter-wrapper">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Tout afficher</option>
              <option value="en_attente">En Attente</option>
              <option value="validé">Validé</option>
            </select>
          </div>
        </div>

        <div className="data-grid-container glass-panel">
          {loading ? (<div className="cyber-loader-container"><div className="cyber-spinner"></div><p>Synchronisation...</p></div>) : (
            <div className="table-responsive">
              <table className="cyber-table">
                <thead><tr><th>Fournisseur</th><th>Service</th><th>Confiance</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="fade-in-row">
                      <td><div className="fw-bold">{f.nomFournisseur}</div><div className="text-muted-sm">{f.email}</div></td>
                      <td className="tech-font">{f.typePrestataire}</td>
                      <td><div className="risk-meter"><div className={`risk-fill level-${f.niveauConfiance}`} style={{width: `${(Number(f.niveauConfiance)/5)*100}%`}}></div><span className="risk-score">{f.niveauConfiance}/5</span></div></td>
                      <td><span className={`status-pill ${f.status === "validé" ? "ok" : "pending"}`}>{f.status === "validé" ? "ACTIF" : "ATTENTE"}</span></td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <button className="btn-icon btn-scan" onClick={() => navigate(`/intelligence/${f.id}`)}>📡</button>
                          <button className="btn-icon btn-view" onClick={() => navigate(`/fournisseur/${f.id}`)}>👁️</button>
                          <button className="btn-icon btn-edit" onClick={() => navigate(`/modifier/${f.id}`)}>✏️</button>
                          <button className={`btn-toggle ${f.status === "validé" ? "btn-suspend" : "btn-validate"}`} onClick={() => toggleStatus(f.id, f.status)}>{f.status === "validé" ? "STOP" : "OK"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Gestion;
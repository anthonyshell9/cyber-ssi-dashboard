import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "./db/firebase";
import { useNavigate } from "react-router-dom";
import "./Incidents.css";

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // On récupère TOUS les incidents, du plus récent au plus ancien
    const q = query(collection(db, "incidents"), orderBy("dateDeclaration", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setIncidents(data);
    });
    return () => unsubscribe();
  }, []);

  const resolveIncident = async (id) => {
    if (window.confirm("Confirmer la résolution de cet incident ?")) {
      await updateDoc(doc(db, "incidents", id), { statut: "Résolu" });
    }
  };

  // Séparation des incidents en cours et résolus
  const activeIncidents = incidents.filter(i => i.statut !== "Résolu");
  const resolvedIncidents = incidents.filter(i => i.statut === "Résolu");

  return (
    <div className="crisis-room">
      <div className="crisis-bg"></div>
      
      <header className="crisis-header">
        <button onClick={() => navigate('/gestion')} className="btn-back-crisis">← Retour Dashboard</button>
        <div className="header-title">
            <h1>SALLE DE CRISE</h1>
            <p>Supervision des incidents de sécurité en temps réel</p>
        </div>
        <div className="live-indicator">
            <span className="blink-dot"></span> LIVE
        </div>
      </header>

      <div className="crisis-content">
        
        {/* SECTION 1 : INCIDENTS ACTIFS */}
        <section className="active-zone">
          <h2>🔥 Incidents En Cours ({activeIncidents.length})</h2>
          <div className="incidents-grid">
            {activeIncidents.map(inc => (
              <div key={inc.id} className={`incident-card ${inc.gravite}`}>
                <div className="card-top">
                    <span className="supplier-tag">{inc.nomFournisseur}</span>
                    <span className="date-tag">
                        {inc.dateDeclaration?.seconds 
                          ? new Date(inc.dateDeclaration.seconds * 1000).toLocaleDateString() 
                          : "À l'instant"}
                    </span>
                </div>
                <h3>{inc.titre}</h3>
                <div className="impact-box">
                    <strong>Impact :</strong> {inc.impact}
                </div>
                <div className="card-actions">
                    <span className={`badge-gravite ${inc.gravite}`}>{inc.gravite.toUpperCase()}</span>
                    <button onClick={() => resolveIncident(inc.id)} className="btn-resolve">✅ Marquer Résolu</button>
                    <button onClick={() => navigate(`/fournisseur/${inc.fournisseurId}`)} className="btn-details">Voir Dossier</button>
                </div>
              </div>
            ))}
            {activeIncidents.length === 0 && (
                <div className="all-clear">
                    ✅ Aucun incident actif. Systèmes nominaux.
                </div>
            )}
          </div>
        </section>

        {/* SECTION 2 : HISTORIQUE */}
        <section className="history-zone">
            <h2>🗄️ Archives / Résolus</h2>
            <table className="history-table">
                <thead><tr><th>Date</th><th>Fournisseur</th><th>Incident</th><th>Gravité</th></tr></thead>
                <tbody>
                    {resolvedIncidents.map(inc => (
                        <tr key={inc.id}>
                            <td>{inc.dateDeclaration ? new Date(inc.dateDeclaration.seconds * 1000).toLocaleDateString() : '-'}</td>
                            <td>{inc.nomFournisseur}</td>
                            <td>{inc.titre}</td>
                            <td><span className="simple-tag">{inc.gravite}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>

      </div>
    </div>
  );
};

export default Incidents;
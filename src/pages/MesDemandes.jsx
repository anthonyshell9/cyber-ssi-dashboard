import React, { useEffect, useState, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useUser } from "../hooks/UserContext";
import { useNavigate } from "react-router-dom";
import "./MesDemandes.css";

const STATUS_LABELS = {
  en_attente_rssi: "En attente",
  approuvee: "Approuvee",
  rejetee: "Rejetee",
};

const MesDemandes = () => {
  const { user, userProfile } = useUser();
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, "demandes"),
      where("emailDemandeur", "==", user.email),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDemandes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.email]);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const stats = useMemo(() => ({
    total: demandes.length,
    enAttente: demandes.filter((d) => d.status === "en_attente_rssi").length,
    approuvees: demandes.filter((d) => d.status === "approuvee").length,
    rejetees: demandes.filter((d) => d.status === "rejetee").length,
  }), [demandes]);

  if (loading) {
    return (
      <div className="mes-demandes-loading">
        <div className="md-spinner"></div>
        <p>Chargement de vos demandes...</p>
      </div>
    );
  }

  return (
    <div className="mes-demandes">
      {/* HEADER */}
      <div className="md-header">
        <div>
          <h1 className="md-title">Mes Demandes</h1>
          <p className="md-subtitle">Suivi de vos demandes de referencement fournisseur</p>
        </div>
        <button className="md-btn-new" onClick={() => navigate("/se-proposer-fournisseur")}>
          + Nouvelle Demande
        </button>
      </div>

      {/* STATS */}
      <div className="md-stats">
        <div className="md-stat">
          <span className="md-stat-value">{stats.total}</span>
          <span className="md-stat-label">Total</span>
        </div>
        <div className="md-stat stat-amber">
          <span className="md-stat-value">{stats.enAttente}</span>
          <span className="md-stat-label">En attente</span>
        </div>
        <div className="md-stat stat-green">
          <span className="md-stat-value">{stats.approuvees}</span>
          <span className="md-stat-label">Approuvees</span>
        </div>
        <div className="md-stat stat-red">
          <span className="md-stat-value">{stats.rejetees}</span>
          <span className="md-stat-label">Rejetees</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="md-table-wrapper">
        {demandes.length === 0 ? (
          <div className="md-empty">
            <div className="md-empty-icon">&#x1F4E5;</div>
            <h3>Aucune demande</h3>
            <p>Vous n'avez pas encore soumis de demande de referencement.</p>
            <button className="md-btn-new" onClick={() => navigate("/se-proposer-fournisseur")}>
              Creer une demande
            </button>
          </div>
        ) : (
          <table className="md-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.id}>
                  <td className="md-cell-date">{formatDate(d.createdAt)}</td>
                  <td className="md-cell-vendor">{d.nomFournisseur || "—"}</td>
                  <td className="md-cell-type">{d.typePrestataire || "—"}</td>
                  <td>
                    <span className={`md-status-pill md-status-${d.status === "en_attente_rssi" ? "amber" : d.status === "approuvee" ? "green" : d.status === "rejetee" ? "red" : "gray"}`}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td className="md-cell-score">
                    {d.riskNote != null ? d.riskNote : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MesDemandes;

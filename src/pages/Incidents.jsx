import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import "./Incidents.css";

const DORA_DEADLINES = [
  { key: "initialNotification", label: "Notification initiale", hoursAfter: 4 },
  { key: "intermediateReport", label: "Rapport intermediaire", hoursAfter: 72 },
  { key: "finalReport", label: "Rapport final", hoursAfter: 720 }, // ~30 days
];

const getDeadlineDate = (declarationDate, hoursAfter) => {
  if (!declarationDate) return null;
  const base = declarationDate.seconds
    ? new Date(declarationDate.seconds * 1000)
    : new Date(declarationDate);
  return new Date(base.getTime() + hoursAfter * 60 * 60 * 1000);
};

const getDeadlineStatus = (deadline, submittedStatus) => {
  if (submittedStatus === "Submitted") return "Submitted";
  if (!deadline) return "Pending";
  return new Date() > deadline ? "Overdue" : "Pending";
};

const getTimeRemaining = (deadline) => {
  if (!deadline) return "";
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return "Depasse";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}j ${remainingHours}h`;
  return `${hours}h`;
};

const getProgressPct = (declarationDate, deadline) => {
  if (!declarationDate || !deadline) return 0;
  const base = declarationDate.seconds
    ? new Date(declarationDate.seconds * 1000)
    : new Date(declarationDate);
  const now = new Date();
  const total = deadline - base;
  const elapsed = now - base;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  return Math.round(pct);
};

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  useEffect(() => {
    const q = query(collection(db, "incidents"), orderBy("dateDeclaration", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIncidents(data);
    });
    return () => unsubscribe();
  }, []);

  const resolveIncident = async (id) => {
    if (window.confirm("Confirmer la resolution de cet incident ?")) {
      await updateDoc(doc(db, "incidents", id), { statut: "Resolu" });
    }
  };

  const updateDoraField = async (id, field, value) => {
    try {
      await updateDoc(doc(db, "incidents", id), { [field]: value });
    } catch {
      addNotification("error", "Erreur lors de la mise a jour.");
    }
  };

  const updateDoraDeadlineStatus = async (id, deadlineKey, status) => {
    try {
      const fieldName = `dora_${deadlineKey}`;
      await updateDoc(doc(db, "incidents", id), { [fieldName]: status });
      addNotification("success", "Statut DORA mis a jour.");
    } catch {
      addNotification("error", "Erreur lors de la mise a jour.");
    }
  };

  const activeIncidents = incidents.filter((i) => i.statut !== "Resolu");
  const resolvedIncidents = incidents.filter((i) => i.statut === "Resolu");

  return (
    <div className="crisis-room">
      <div className="crisis-bg"></div>

      <header className="crisis-header">
        <button onClick={() => navigate("/gestion")} className="btn-back-crisis">
          ← Retour Dashboard
        </button>
        <div className="header-title">
          <h1>SALLE DE CRISE</h1>
          <p>Supervision des incidents de securite en temps reel</p>
        </div>
        <div className="live-indicator">
          <span className="blink-dot"></span> LIVE
        </div>
      </header>

      <div className="crisis-content">
        {/* SECTION 1 : INCIDENTS ACTIFS */}
        <section className="active-zone">
          <h2>Incidents En Cours ({activeIncidents.length})</h2>
          <div className="incidents-grid">
            {activeIncidents.map((inc) => (
              <div key={inc.id} className={`incident-card ${inc.gravite}`}>
                <div className="card-top">
                  <span className="supplier-tag">{inc.nomFournisseur}</span>
                  <span className="date-tag">
                    {inc.dateDeclaration?.seconds
                      ? new Date(inc.dateDeclaration.seconds * 1000).toLocaleDateString()
                      : "A l'instant"}
                  </span>
                </div>
                <h3>{inc.titre}</h3>
                <div className="impact-box">
                  <strong>Impact :</strong> {inc.impact}
                </div>

                {/* DORA Additional Fields */}
                <div className="dora-extra-fields">
                  <div className="dora-field-row">
                    <label>Clients affectes :</label>
                    <input
                      type="number"
                      min="0"
                      className="dora-inline-input"
                      value={inc.affectedClients ?? ""}
                      onChange={(e) =>
                        updateDoraField(inc.id, "affectedClients", parseInt(e.target.value, 10) || 0)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="dora-field-row">
                    <label>Impact financier :</label>
                    <input
                      type="text"
                      className="dora-inline-input"
                      value={inc.financialImpact ?? ""}
                      onChange={(e) => updateDoraField(inc.id, "financialImpact", e.target.value)}
                      placeholder="ex: 50 000 EUR"
                    />
                  </div>
                  <div className="dora-field-row">
                    <label>Violation donnees :</label>
                    <select
                      className="dora-inline-select"
                      value={inc.dataBreach ?? "no"}
                      onChange={(e) => updateDoraField(inc.id, "dataBreach", e.target.value)}
                    >
                      <option value="no">Non</option>
                      <option value="yes">Oui</option>
                    </select>
                  </div>
                </div>

                {/* DORA Timeline */}
                <div className="dora-timeline-section">
                  <h4 className="dora-timeline-title">Timeline DORA</h4>
                  {DORA_DEADLINES.map((dl) => {
                    const deadline = getDeadlineDate(inc.dateDeclaration, dl.hoursAfter);
                    const submittedStatus = inc[`dora_${dl.key}`] || "";
                    const status = getDeadlineStatus(deadline, submittedStatus);
                    const timeLeft = getTimeRemaining(deadline);
                    const progress = getProgressPct(inc.dateDeclaration, deadline);

                    return (
                      <div key={dl.key} className="dora-deadline-row">
                        <div className="deadline-info">
                          <span className="deadline-label">{dl.label}</span>
                          <span className="deadline-date">
                            {deadline ? deadline.toLocaleString("fr-FR") : "-"}
                          </span>
                        </div>
                        <div className="deadline-bar-container">
                          <div
                            className={`deadline-bar-fill ${
                              status === "Submitted"
                                ? "bar-submitted"
                                : status === "Overdue"
                                ? "bar-overdue"
                                : "bar-pending"
                            }`}
                            style={{ width: `${status === "Submitted" ? 100 : progress}%` }}
                          />
                        </div>
                        <div className="deadline-status-area">
                          <span className={`deadline-time-left ${status === "Overdue" ? "overdue" : ""}`}>
                            {status === "Submitted" ? "Soumis" : timeLeft}
                          </span>
                          <button
                            className={`deadline-status-btn ${status.toLowerCase()}`}
                            onClick={() =>
                              updateDoraDeadlineStatus(
                                inc.id,
                                dl.key,
                                submittedStatus === "Submitted" ? "" : "Submitted"
                              )
                            }
                          >
                            {status === "Submitted" ? "Soumis" : status === "Overdue" ? "En retard" : "En attente"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="card-actions">
                  <span className={`badge-gravite ${inc.gravite}`}>
                    {(inc.gravite || "").toUpperCase()}
                  </span>
                  <button onClick={() => resolveIncident(inc.id)} className="btn-resolve">
                    Marquer Resolu
                  </button>
                  <button
                    onClick={() => navigate(`/fournisseur/${inc.fournisseurId}`)}
                    className="btn-details"
                  >
                    Voir Dossier
                  </button>
                </div>
              </div>
            ))}
            {activeIncidents.length === 0 && (
              <div className="all-clear">
                Aucun incident actif. Systemes nominaux.
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2 : HISTORIQUE */}
        <section className="history-zone">
          <h2>Archives / Resolus</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Incident</th>
                <th>Gravite</th>
                <th>Clients Affectes</th>
                <th>Violation Donnees</th>
              </tr>
            </thead>
            <tbody>
              {resolvedIncidents.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    {inc.dateDeclaration
                      ? new Date(inc.dateDeclaration.seconds * 1000).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{inc.nomFournisseur}</td>
                  <td>{inc.titre}</td>
                  <td>
                    <span className="simple-tag">{inc.gravite}</span>
                  </td>
                  <td>{inc.affectedClients ?? "-"}</td>
                  <td>{inc.dataBreach === "yes" ? "Oui" : "Non"}</td>
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

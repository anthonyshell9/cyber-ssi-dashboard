import React, { useEffect, useState, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useUser } from "../hooks/UserContext";
import { useNotification } from "../hooks/NotificationContext";
import "./DemandesDashboard.css";

const STATUS_LABELS = {
  en_attente_rssi: "En attente",
  approuvee: "Approuvee",
  rejetee: "Rejetee",
};

const STATUS_COLORS = {
  en_attente_rssi: "amber",
  approuvee: "green",
  rejetee: "red",
};

const computeRiskScore = (dep, pen, mat, conf) => {
  if (mat === 0 && conf === 0) return { note: null, interpretation: "Non calculable", color: "gray" };
  if (mat * conf === 0) return { note: null, interpretation: "Non calculable - Division par zero", color: "gray" };
  const note = (dep * pen) / (mat * conf);
  let interpretation, color;
  if (note < 1) { interpretation = "FAVORABLE"; color = "green"; }
  else if (note === 1) { interpretation = "EQUILIBREE"; color = "amber"; }
  else if (note <= 2) { interpretation = "A RISQUE"; color = "orange"; }
  else { interpretation = "CRITIQUE"; color = "red"; }
  return { note: Math.round(note * 100) / 100, interpretation, color };
};

const DemandesDashboard = () => {
  const { userProfile } = useUser();
  const { addNotification } = useNotification();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [processing, setProcessing] = useState(false);

  // RSSI review form state
  const [rssiScores, setRssiScores] = useState({
    dependance: 1,
    penetration: 1,
    maturite: 1,
    confiance: 1,
  });
  const [commentaire, setCommentaire] = useState("");
  const [strategieExit, setStrategieExit] = useState("");
  const [fournisseurCritique, setFournisseurCritique] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "demandes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDemandes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return demandes;
    return demandes.filter((d) => d.status === filterStatus);
  }, [demandes, filterStatus]);

  const kpis = useMemo(() => ({
    total: demandes.length,
    enAttente: demandes.filter((d) => d.status === "en_attente_rssi").length,
    approuvees: demandes.filter((d) => d.status === "approuvee").length,
    rejetees: demandes.filter((d) => d.status === "rejetee").length,
  }), [demandes]);

  // Live recomputed score when RSSI adjusts
  const liveScore = useMemo(() => {
    if (!selectedDemande) return null;
    return computeRiskScore(
      Number(rssiScores.dependance),
      Number(rssiScores.penetration),
      Number(rssiScores.maturite),
      Number(rssiScores.confiance)
    );
  }, [selectedDemande, rssiScores]);

  const openReview = (demande) => {
    setSelectedDemande(demande);
    setRssiScores({
      dependance: demande.dependance || 1,
      penetration: demande.penetration || 1,
      maturite: demande.maturite || 1,
      confiance: demande.confiance || 1,
    });
    setCommentaire("");
    setStrategieExit(demande.strategieExit || "");
    setFournisseurCritique(false);
  };

  const closeReview = () => {
    setSelectedDemande(null);
    setCommentaire("");
    setStrategieExit("");
    setFournisseurCritique(false);
  };

  const handleApprove = async () => {
    if (!selectedDemande) return;
    setProcessing(true);
    try {
      const score = liveScore;
      const demandeRef = doc(db, "demandes", selectedDemande.id);
      await updateDoc(demandeRef, {
        status: "approuvee",
        validationRSSI: "Approuve",
        commentaireRSSI: commentaire,
        strategieExitRSSI: strategieExit,
        dateValidation: serverTimestamp(),
        dependanceRSSI: Number(rssiScores.dependance),
        penetrationRSSI: Number(rssiScores.penetration),
        maturiteRSSI: Number(rssiScores.maturite),
        confianceRSSI: Number(rssiScores.confiance),
        riskNoteRSSI: score?.note,
        riskInterpretationRSSI: score?.interpretation,
        fournisseurCritique,
      });

      // Copy to fournisseurs collection
      await addDoc(collection(db, "fournisseurs"), {
        nomFournisseur: selectedDemande.nomFournisseur || "",
        email: selectedDemande.emailFournisseur || "",
        typePrestataire: selectedDemande.typePrestataire || "",
        typeServiceMateriel: selectedDemande.typeServiceMateriel || "",
        nomApplication: selectedDemande.nomApplication || "",
        applicationActive: selectedDemande.applicationActive || "",
        donneesPersonnelles: selectedDemande.donneesPersonnelles || "",
        accesFournisseurSystemes: selectedDemande.accesFournisseurSystemes || "",
        produitImpacte: selectedDemande.produitImpacte || "",
        dependance: Number(rssiScores.dependance),
        penetration: Number(rssiScores.penetration),
        maturite: Number(rssiScores.maturite),
        confiance: Number(rssiScores.confiance),
        niveauConfiance: Number(rssiScores.confiance),
        riskNote: score?.note,
        riskInterpretation: score?.interpretation,
        riskColor: score?.color,
        fournisseurCritique,
        strategieExit: strategieExit || selectedDemande.strategieExit || "",
        status: "Actif",
        demandeId: selectedDemande.id,
        demandeurEmail: selectedDemande.emailDemandeur || selectedDemande.demandeurEmail || "",
        createdAt: serverTimestamp(),
      });

      addNotification("success", "Demande approuvee avec succes.");
      closeReview();
    } catch (error) {
      console.error("Approve error:", error);
      addNotification("error", "Erreur lors de l'approbation.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDemande) return;
    setProcessing(true);
    try {
      const demandeRef = doc(db, "demandes", selectedDemande.id);
      await updateDoc(demandeRef, {
        status: "rejetee",
        validationRSSI: "Rejete",
        commentaireRSSI: commentaire,
        dateValidation: serverTimestamp(),
      });
      addNotification("success", "Demande rejetee.");
      closeReview();
    } catch (error) {
      console.error("Reject error:", error);
      addNotification("error", "Erreur lors du rejet.");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getScoreColor = (color) => {
    const map = { green: "#10b981", amber: "#f59e0b", orange: "#f97316", red: "#ef4444" };
    return map[color] || "#64748b";
  };

  if (loading) {
    return (
      <div className="demandes-loading">
        <div className="demandes-spinner"></div>
        <p>Chargement des demandes...</p>
      </div>
    );
  }

  return (
    <div className="demandes-dashboard">
      {/* HEADER */}
      <div className="demandes-header">
        <div>
          <h1 className="demandes-title">Demandes Fournisseurs</h1>
          <p className="demandes-subtitle">Validation et approbation des demandes fournisseurs</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="demandes-kpis">
        <div className="kpi-card kpi-total">
          <div className="kpi-icon">&#x1F4CB;</div>
          <div className="kpi-info">
            <span className="kpi-value">{kpis.total}</span>
            <span className="kpi-label">Total demandes</span>
          </div>
        </div>
        <div className="kpi-card kpi-pending">
          <div className="kpi-icon">&#x23F3;</div>
          <div className="kpi-info">
            <span className="kpi-value">{kpis.enAttente}</span>
            <span className="kpi-label">En attente</span>
          </div>
        </div>
        <div className="kpi-card kpi-approved">
          <div className="kpi-icon">&#x2705;</div>
          <div className="kpi-info">
            <span className="kpi-value">{kpis.approuvees}</span>
            <span className="kpi-label">Approuvees</span>
          </div>
        </div>
        <div className="kpi-card kpi-rejected">
          <div className="kpi-icon">&#x274C;</div>
          <div className="kpi-info">
            <span className="kpi-value">{kpis.rejetees}</span>
            <span className="kpi-label">Rejetees</span>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="demandes-filters">
        {[
          { key: "all", label: "Toutes" },
          { key: "en_attente_rssi", label: "En attente" },
          { key: "approuvee", label: "Approuvees" },
          { key: "rejetee", label: "Rejetees" },
        ].map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${filterStatus === f.key ? "active" : ""}`}
            onClick={() => setFilterStatus(f.key)}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="filter-count">
                {f.key === "en_attente_rssi" ? kpis.enAttente : f.key === "approuvee" ? kpis.approuvees : kpis.rejetees}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="demandes-table-wrapper">
        <table className="demandes-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Demandeur</th>
              <th>Fournisseur</th>
              <th>Type</th>
              <th>Score Risque</th>
              <th>Interpretation</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">Aucune demande trouvee.</td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id}>
                  <td className="cell-date">{formatDate(d.createdAt)}</td>
                  <td className="cell-email">{d.emailDemandeur || d.demandeurEmail || "—"}</td>
                  <td className="cell-vendor">
                    <span className="vendor-name">{d.nomFournisseur || "—"}</span>
                  </td>
                  <td className="cell-type">{d.typePrestataire || "—"}</td>
                  <td className="cell-score">
                    {d.riskNote != null ? (
                      <span className="score-badge" style={{ color: getScoreColor(d.riskColor) }}>
                        {d.riskNote}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    {d.riskInterpretation ? (
                      <span className={`interp-pill interp-${d.riskColor}`}>
                        {d.riskInterpretation}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    <span className={`status-pill-dm status-${STATUS_COLORS[d.status] || "gray"}`}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {d.status === "en_attente_rssi" ? (
                      <button className="btn-examine" onClick={() => openReview(d)}>
                        Examiner
                      </button>
                    ) : (
                      <button className="btn-view-detail" onClick={() => openReview(d)}>
                        Voir
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REVIEW MODAL */}
      {selectedDemande && (
        <div className="review-overlay" onClick={closeReview}>
          <div className="review-panel" onClick={(e) => e.stopPropagation()}>
            <div className="review-header">
              <div>
                <h2 className="review-title">Examen de la Demande</h2>
                <p className="review-vendor">{selectedDemande.nomFournisseur}</p>
              </div>
              <button className="review-close" onClick={closeReview}>&#x2715;</button>
            </div>

            <div className="review-body">
              {/* Risk Score Banner */}
              {liveScore && liveScore.note != null && (
                <div className={`review-score-banner score-${liveScore.color}`}>
                  <div className="rsb-note">{liveScore.note}</div>
                  <div className="rsb-interp">{liveScore.interpretation}</div>
                  <div className="rsb-formula">
                    ({rssiScores.dependance} x {rssiScores.penetration}) / ({rssiScores.maturite} x {rssiScores.confiance})
                  </div>
                </div>
              )}

              {/* FM-DS-100 Summary */}
              <div className="review-sections">
                <div className="review-section">
                  <h3>Demandeur</h3>
                  <div className="review-grid">
                    <div className="review-field">
                      <label>Email</label>
                      <span>{selectedDemande.emailDemandeur || selectedDemande.demandeurEmail || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Equipe</label>
                      <span>{selectedDemande.equipUtilisatrice || "—"}</span>
                    </div>
                    <div className="review-field full-width">
                      <label>Detail de la demande</label>
                      <span>{selectedDemande.detailDemande || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Integration/Retrait</label>
                      <span>{selectedDemande.integrationOuRetrait || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="review-section">
                  <h3>Fournisseur</h3>
                  <div className="review-grid">
                    <div className="review-field">
                      <label>Nom</label>
                      <span>{selectedDemande.nomFournisseur || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Email</label>
                      <span>{selectedDemande.emailFournisseur || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Type</label>
                      <span>{selectedDemande.typePrestataire || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Produit impacte</label>
                      <span>{selectedDemande.produitImpacte || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="review-section">
                  <h3>Service & Application</h3>
                  <div className="review-grid">
                    <div className="review-field">
                      <label>Service/Materiel</label>
                      <span>{selectedDemande.typeServiceMateriel || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Application</label>
                      <span>{selectedDemande.nomApplication || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Active</label>
                      <span>{selectedDemande.applicationActive || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Donnees personnelles</label>
                      <span>{selectedDemande.donneesPersonnelles || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="review-section">
                  <h3>Donnees & Acces</h3>
                  <div className="review-grid">
                    <div className="review-field full-width">
                      <label>Acces systemes</label>
                      <span>{selectedDemande.accesFournisseurSystemes || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Donnees entrantes</label>
                      <span>{selectedDemande.donneesEntrantes || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Donnees sortantes</label>
                      <span>{selectedDemande.donneesSortantes || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Actifs BPS</label>
                      <span>{selectedDemande.actifsBPS || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Strategie de sortie</label>
                      <span>{selectedDemande.strategieExit || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Scores demandeur */}
                <div className="review-section">
                  <h3>Scores du Demandeur</h3>
                  <div className="review-grid">
                    <div className="review-field">
                      <label>Dependance</label>
                      <span className="score-value">{selectedDemande.dependance || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Penetration</label>
                      <span className="score-value">{selectedDemande.penetration || "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Maturite</label>
                      <span className="score-value">{selectedDemande.maturite ?? "—"}</span>
                    </div>
                    <div className="review-field">
                      <label>Confiance</label>
                      <span className="score-value">{selectedDemande.confiance || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RSSI EVALUATION (only if pending) */}
              {selectedDemande.status === "en_attente_rssi" && (
                <div className="rssi-scoring-section">
                  <h3>Evaluation RSSI (EBIOS RM)</h3>
                  <p className="rssi-scoring-hint">
                    Evaluez le fournisseur sur les 4 dimensions (echelle 1-4).
                  </p>

                  <div className="rssi-score-inputs">
                    <div className="rssi-input-group">
                      <label>Dependance <span className="range-hint">(1-4)</span></label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={rssiScores.dependance}
                        onChange={(e) => setRssiScores((p) => ({ ...p, dependance: Number(e.target.value) }))}
                      />
                      <span className="rssi-input-value">{rssiScores.dependance}</span>
                    </div>
                    <div className="rssi-input-group">
                      <label>Penetration <span className="range-hint">(1-4)</span></label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={rssiScores.penetration}
                        onChange={(e) => setRssiScores((p) => ({ ...p, penetration: Number(e.target.value) }))}
                      />
                      <span className="rssi-input-value">{rssiScores.penetration}</span>
                    </div>
                    <div className="rssi-input-group">
                      <label>Maturite <span className="range-hint">(1-4)</span></label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={rssiScores.maturite}
                        onChange={(e) => setRssiScores((p) => ({ ...p, maturite: Number(e.target.value) }))}
                      />
                      <span className="rssi-input-value">{rssiScores.maturite}</span>
                    </div>
                    <div className="rssi-input-group">
                      <label>Confiance <span className="range-hint">(1-4)</span></label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={rssiScores.confiance}
                        onChange={(e) => setRssiScores((p) => ({ ...p, confiance: Number(e.target.value) }))}
                      />
                      <span className="rssi-input-value">{rssiScores.confiance}</span>
                    </div>
                  </div>

                  <div className="rssi-comment-group">
                    <label>Strategie de sortie</label>
                    <textarea
                      value={strategieExit}
                      onChange={(e) => setStrategieExit(e.target.value)}
                      placeholder="Decrivez la strategie de sortie : fournisseur de substitution, plan de migration, delais, conditions de reversibilite..."
                      rows={3}
                    />
                  </div>

                  <div className="rssi-comment-group">
                    <label>Commentaire RSSI</label>
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      placeholder="Observations, conditions, recommandations..."
                      rows={3}
                    />
                  </div>

                  <div className="rssi-critique-toggle">
                    <label>Fournisseur Critique ?</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${fournisseurCritique ? "toggle-on" : ""}`}
                        onClick={() => setFournisseurCritique(true)}
                      >
                        OUI
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${!fournisseurCritique ? "toggle-off" : ""}`}
                        onClick={() => setFournisseurCritique(false)}
                      >
                        NON
                      </button>
                    </div>
                  </div>

                  <div className="review-actions">
                    <button
                      className="btn-approve"
                      onClick={handleApprove}
                      disabled={processing}
                    >
                      {processing ? "Traitement..." : "Approuver"}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={handleReject}
                      disabled={processing}
                    >
                      {processing ? "Traitement..." : "Rejeter"}
                    </button>
                  </div>
                </div>
              )}

              {/* Show RSSI decision if already reviewed */}
              {selectedDemande.status !== "en_attente_rssi" && (
                <div className="review-decision-section">
                  <h3>Decision RSSI</h3>
                  <div className="review-grid">
                    <div className="review-field">
                      <label>Validation</label>
                      <span className={`status-pill-dm status-${STATUS_COLORS[selectedDemande.status]}`}>
                        {selectedDemande.validationRSSI || STATUS_LABELS[selectedDemande.status]}
                      </span>
                    </div>
                    <div className="review-field">
                      <label>Date validation</label>
                      <span>{formatDate(selectedDemande.dateValidation)}</span>
                    </div>
                    {selectedDemande.commentaireRSSI && (
                      <div className="review-field full-width">
                        <label>Commentaire</label>
                        <span>{selectedDemande.commentaireRSSI}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandesDashboard;

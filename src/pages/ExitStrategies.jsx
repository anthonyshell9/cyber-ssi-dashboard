import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  where,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import "./ExitStrategies.css";

const ExitStrategies = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [strategies, setStrategies] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    alternativeProviders: "",
    migrationTimeline: "",
    dataPortability: "Moderate",
    costEstimate: "",
    lastReviewDate: "",
    status: "Draft",
  });

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFournisseurs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "exitStrategies"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        map[data.fournisseurId] = { id: d.id, ...data };
      });
      setStrategies(map);
    });
    return () => unsubscribe();
  }, []);

  const criticalVendors = fournisseurs.filter(
    (f) => f.doraClassification === "Critical" || f.doraClassification === "Important"
  );

  const openEdit = (vendor) => {
    const existing = strategies[vendor.id];
    if (existing) {
      setFormData({
        alternativeProviders: existing.alternativeProviders || "",
        migrationTimeline: existing.migrationTimeline || "",
        dataPortability: existing.dataPortability || "Moderate",
        costEstimate: existing.costEstimate || "",
        lastReviewDate: existing.lastReviewDate || "",
        status: existing.status || "Draft",
      });
    } else {
      setFormData({
        alternativeProviders: "",
        migrationTimeline: "",
        dataPortability: "Moderate",
        costEstimate: "",
        lastReviewDate: "",
        status: "Draft",
      });
    }
    setEditingVendor(vendor);
  };

  const saveStrategy = async () => {
    if (!editingVendor) return;
    try {
      const existing = strategies[editingVendor.id];
      if (existing) {
        await updateDoc(doc(db, "exitStrategies", existing.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "exitStrategies"), {
          fournisseurId: editingVendor.id,
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      addNotification("success", "Strategie de sortie sauvegardee.");
      setEditingVendor(null);
    } catch {
      addNotification("error", "Erreur lors de la sauvegarde.");
    }
  };

  const isOlderThan12Months = (dateStr) => {
    if (!dateStr) return false;
    const reviewDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now - reviewDate;
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
    return diffMonths > 12;
  };

  const approvedCritical = criticalVendors.filter((f) => {
    const s = strategies[f.id];
    return s && s.status === "Approved";
  }).length;
  const approvedPct =
    criticalVendors.length > 0
      ? Math.round((approvedCritical / criticalVendors.length) * 100)
      : 0;

  const portabilityClass = (v) => {
    if (v === "Good") return "portability-good";
    if (v === "Moderate") return "portability-moderate";
    return "portability-poor";
  };

  const statusClass = (s) => {
    if (s === "Approved") return "approved";
    if (s === "Under Review") return "under-review";
    if (s === "Needs Update") return "needs-update";
    return "draft";
  };

  return (
    <div className="exit-strategies">
      <header className="exit-header">
        <button onClick={() => navigate("/gestion")} className="btn-back-exit">
          ← Retour
        </button>
        <div className="header-title">
          <h1>STRATEGIES DE SORTIE</h1>
          <p>Plans de sortie par fournisseur critique / important</p>
        </div>
        <div />
      </header>

      <div className="exit-summary">
        <div className="exit-summary-card">
          <span className="exit-stat-value" style={{ color: "#06b6d4" }}>
            {criticalVendors.length}
          </span>
          <span className="exit-stat-label">Fournisseurs Critiques/Importants</span>
        </div>
        <div className="exit-summary-card">
          <span className="exit-stat-value" style={{ color: "#10b981" }}>
            {approvedPct}%
          </span>
          <span className="exit-stat-label">Avec Strategie Approuvee</span>
        </div>
        <div className="exit-summary-card">
          <span className="exit-stat-value" style={{ color: "#f59e0b" }}>
            {Object.keys(strategies).length}
          </span>
          <span className="exit-stat-label">Strategies Definies</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 60 }}>
          Chargement...
        </div>
      ) : criticalVendors.length === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 60 }}>
          Aucun fournisseur critique/important. Classifiez vos fournisseurs dans le Registre DORA.
        </div>
      ) : (
        <div className="exit-cards-grid">
          {criticalVendors.map((f) => {
            const s = strategies[f.id];
            const isOld = s && isOlderThan12Months(s.lastReviewDate);
            return (
              <div key={f.id} className={`exit-card ${isOld ? "alert-old" : ""}`}>
                <div className="card-vendor-name">{f.nomFournisseur}</div>
                <div className="card-vendor-service">{f.typePrestataire || "-"}</div>

                {isOld && (
                  <div className="old-alert-banner">
                    ⚠️ Strategie non revisee depuis plus de 12 mois
                  </div>
                )}

                {s ? (
                  <>
                    <div className="exit-field">
                      <label>Fournisseurs Alternatifs</label>
                      <div className="field-value">
                        {s.alternativeProviders || <span className="no-data">Non defini</span>}
                      </div>
                    </div>
                    <div className="exit-field">
                      <label>Delai de Migration</label>
                      <div className="field-value">
                        {s.migrationTimeline || <span className="no-data">Non defini</span>}
                      </div>
                    </div>
                    <div className="exit-field">
                      <label>Portabilite des Donnees</label>
                      <div className={`field-value ${portabilityClass(s.dataPortability)}`}>
                        {s.dataPortability === "Good"
                          ? "Bonne"
                          : s.dataPortability === "Moderate"
                          ? "Moderee"
                          : "Faible"}
                      </div>
                    </div>
                    <div className="exit-field">
                      <label>Estimation Cout</label>
                      <div className="field-value">
                        {s.costEstimate || <span className="no-data">Non defini</span>}
                      </div>
                    </div>
                    <div className="exit-field">
                      <label>Derniere Revision</label>
                      <div className="field-value">
                        {s.lastReviewDate || <span className="no-data">Non defini</span>}
                      </div>
                    </div>
                    <div className="card-status-row">
                      <span className={`exit-status-pill ${statusClass(s.status)}`}>
                        {s.status === "Approved"
                          ? "Approuve"
                          : s.status === "Under Review"
                          ? "En Revue"
                          : s.status === "Needs Update"
                          ? "A Mettre a Jour"
                          : "Brouillon"}
                      </span>
                      <button className="btn-edit-exit" onClick={() => openEdit(f)}>
                        Modifier
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ color: "#64748b", marginBottom: 12 }}>
                      Aucune strategie definie
                    </div>
                    <button className="btn-edit-exit" onClick={() => openEdit(f)}>
                      + Creer Strategie
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingVendor && (
        <div className="exit-modal-overlay" onClick={() => setEditingVendor(null)}>
          <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Strategie de sortie - {editingVendor.nomFournisseur}</h2>
            <div className="form-group">
              <label>Fournisseurs Alternatifs</label>
              <textarea
                value={formData.alternativeProviders}
                onChange={(e) =>
                  setFormData({ ...formData, alternativeProviders: e.target.value })
                }
                placeholder="Liste des fournisseurs alternatifs..."
              />
            </div>
            <div className="form-group">
              <label>Delai de Migration</label>
              <input
                type="text"
                value={formData.migrationTimeline}
                onChange={(e) =>
                  setFormData({ ...formData, migrationTimeline: e.target.value })
                }
                placeholder="ex: 3-6 mois"
              />
            </div>
            <div className="form-group">
              <label>Portabilite des Donnees</label>
              <select
                value={formData.dataPortability}
                onChange={(e) =>
                  setFormData({ ...formData, dataPortability: e.target.value })
                }
              >
                <option value="Good">Bonne</option>
                <option value="Moderate">Moderee</option>
                <option value="Poor">Faible</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estimation Cout</label>
              <input
                type="text"
                value={formData.costEstimate}
                onChange={(e) =>
                  setFormData({ ...formData, costEstimate: e.target.value })
                }
                placeholder="ex: 50 000 EUR"
              />
            </div>
            <div className="form-group">
              <label>Date Derniere Revision</label>
              <input
                type="date"
                value={formData.lastReviewDate}
                onChange={(e) =>
                  setFormData({ ...formData, lastReviewDate: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="Draft">Brouillon</option>
                <option value="Under Review">En Revue</option>
                <option value="Approved">Approuve</option>
                <option value="Needs Update">A Mettre a Jour</option>
              </select>
            </div>
            <div className="exit-modal-actions">
              <button className="btn-cancel-exit" onClick={() => setEditingVendor(null)}>
                Annuler
              </button>
              <button className="btn-save-exit" onClick={saveStrategy}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitStrategies;

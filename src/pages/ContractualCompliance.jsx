import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import "./ContractualCompliance.css";

const REQUIREMENTS = [
  { key: "sla", label: "SLA (Service Level Agreement) defini" },
  { key: "auditRights", label: "Droits d'audit accordes" },
  { key: "dataLocation", label: "Localisation des donnees specifiee" },
  { key: "subcontracting", label: "Regles de sous-traitance definies" },
  { key: "terminationRights", label: "Droits de resiliation / sortie" },
  { key: "incidentNotification", label: "Clause notification incidents (<4h)" },
  { key: "bcpTesting", label: "Clause tests continuite d'activite" },
  { key: "dataPortability", label: "Clause portabilite des donnees" },
  { key: "performanceMetrics", label: "Metriques de suivi performance" },
  { key: "doraReporting", label: "Conformite reporting DORA" },
];

const ContractualCompliance = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFournisseurs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleRequirement = async (vendorId, key, currentCompliance) => {
    const updated = { ...currentCompliance };
    updated[key] = !updated[key];
    try {
      await updateDoc(doc(db, "fournisseurs", vendorId), {
        contractualCompliance: updated,
      });
    } catch {
      addNotification("error", "Erreur lors de la mise a jour.");
    }
  };

  const getCompliancePct = (compliance) => {
    if (!compliance) return 0;
    const checked = REQUIREMENTS.filter((r) => compliance[r.key]).length;
    return Math.round((checked / REQUIREMENTS.length) * 100);
  };

  const getPctClass = (pct) => {
    if (pct >= 80) return "high";
    if (pct >= 50) return "medium";
    return "low";
  };

  // Dashboard stats
  const allPcts = fournisseurs.map((f) =>
    getCompliancePct(f.contractualCompliance || {})
  );
  const avgCompliance =
    allPcts.length > 0
      ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length)
      : 0;
  const fullyCompliant = allPcts.filter((p) => p === 100).length;
  const gapsToAddress = fournisseurs.reduce((acc, f) => {
    const comp = f.contractualCompliance || {};
    return acc + REQUIREMENTS.filter((r) => !comp[r.key]).length;
  }, 0);

  return (
    <div className="contractual-compliance">
      <header className="contractual-header">
        <button onClick={() => navigate("/gestion")} className="btn-back-comp">
          ← Retour
        </button>
        <div className="header-title">
          <h1>CONFORMITE CONTRACTUELLE</h1>
          <p>Article 30 DORA - Exigences contractuelles par fournisseur</p>
        </div>
        <div />
      </header>

      <div className="compliance-dashboard">
        <div className="compliance-dash-card">
          <span className="dash-value" style={{ color: "#f59e0b" }}>
            {avgCompliance}%
          </span>
          <span className="dash-label">Conformite Moyenne</span>
        </div>
        <div className="compliance-dash-card">
          <span className="dash-value" style={{ color: "#10b981" }}>
            {fullyCompliant}
          </span>
          <span className="dash-label">Totalement Conformes</span>
        </div>
        <div className="compliance-dash-card">
          <span className="dash-value" style={{ color: "#ef4444" }}>
            {gapsToAddress}
          </span>
          <span className="dash-label">Ecarts a Combler</span>
        </div>
        <div className="compliance-dash-card">
          <span className="dash-value" style={{ color: "#06b6d4" }}>
            {fournisseurs.length}
          </span>
          <span className="dash-label">Fournisseurs Evalues</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-compliance">Chargement...</div>
      ) : fournisseurs.length === 0 ? (
        <div className="empty-compliance">Aucun fournisseur enregistre.</div>
      ) : (
        <div className="compliance-cards-grid">
          {fournisseurs.map((f) => {
            const compliance = f.contractualCompliance || {};
            const pct = getCompliancePct(compliance);
            const pctClass = getPctClass(pct);
            return (
              <div key={f.id} className="compliance-vendor-card">
                <div className="vendor-header">
                  <div>
                    <div className="vendor-name">{f.nomFournisseur}</div>
                    <div className="vendor-service">{f.typePrestataire || "-"}</div>
                  </div>
                  <span className={`compliance-pct ${pctClass}`}>{pct}%</span>
                </div>

                <div className="compliance-progress-bar">
                  <div
                    className={`compliance-progress-fill ${pctClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <ul className="compliance-checklist">
                  {REQUIREMENTS.map((req) => {
                    const isChecked = !!compliance[req.key];
                    return (
                      <li
                        key={req.key}
                        onClick={() => toggleRequirement(f.id, req.key, compliance)}
                      >
                        <div className={`check-box ${isChecked ? "checked" : ""}`} />
                        <span className={`check-label ${isChecked ? "checked" : ""}`}>
                          {req.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractualCompliance;

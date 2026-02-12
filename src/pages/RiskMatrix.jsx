import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import "./RiskMatrix.css";

const EXPOSITION_LABELS = ["Faible", "Moderee", "Elevee", "Critique"];
const FIABILITE_LABELS = ["Faible", "Partielle", "Maitrisee", "Exemplaire"];

const RISK_COLORS = [
  // Fiab: 1(Faible)  2(Partielle)  3(Maitrisee)  4(Exemplaire)
  /*Expo 1*/ ["green",  "green",     "green",      "green"],
  /*Expo 2*/ ["yellow", "yellow",    "green",      "green"],
  /*Expo 3*/ ["orange", "orange",    "yellow",     "green"],
  /*Expo 4*/ ["red",    "red",       "orange",     "yellow"],
];

const RISK_LABELS = { green: "FAVORABLE", yellow: "EQUILIBREE", orange: "A RISQUE", red: "CRITIQUE" };

function calcVendorRisk(vendor) {
  const dep = Number(vendor.dependance) || Number(vendor.niveauDependance) || 2;
  const pen = Number(vendor.penetration) || 2;
  const mat = Number(vendor.maturite) || Number(vendor.niveauMaturite) || 2;
  const conf = Number(vendor.confiance) || Number(vendor.niveauConfiance) || 2;

  const exposition = Math.max(1, Math.min(4, Math.max(dep, pen)));
  const fiabilite = Math.max(1, Math.min(4, Math.min(mat, conf)));

  const riskColor = RISK_COLORS[exposition - 1][fiabilite - 1];
  return { exposition, fiabilite, riskColor, riskLabel: RISK_LABELS[riskColor], dep, pen, mat, conf };
}

const RiskMatrix = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setFournisseurs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Build matrix: matrix[exposition][fiabilite] = [vendors]
  const matrix = {};
  const vendorRisks = fournisseurs.map((f) => ({ ...f, risk: calcVendorRisk(f) }));

  vendorRisks.forEach((v) => {
    const key = `${v.risk.exposition}-${v.risk.fiabilite}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(v);
  });

  const kpis = {
    total: fournisseurs.length,
    favorable: vendorRisks.filter((v) => v.risk.riskColor === "green").length,
    equilibree: vendorRisks.filter((v) => v.risk.riskColor === "yellow").length,
    aRisque: vendorRisks.filter((v) => v.risk.riskColor === "orange").length,
    critique: vendorRisks.filter((v) => v.risk.riskColor === "red").length,
  };

  const handleCellClick = (exposition, fiabilite) => {
    const key = `${exposition}-${fiabilite}`;
    const vendors = matrix[key] || [];
    if (vendors.length === 0) return;
    const riskColor = RISK_COLORS[exposition - 1][fiabilite - 1];
    setPopup({
      exposition,
      fiabilite,
      riskColor,
      riskLabel: RISK_LABELS[riskColor],
      vendors,
    });
  };

  return (
    <div className="risk-matrix-page">
      <div className="cyber-bg-animation"></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Matrice de Risques EBIOS RM</h1>
            <p>Evaluation des parties prenantes - Methodologie EBIOS RM</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/gestion")}>
            &larr; Retour Dashboard
          </button>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="cyber-spinner"></div>
            <p style={{ color: "#94a3b8" }}>Chargement des donnees...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="risk-kpi-grid">
              <div className="risk-kpi-card kpi-total">
                <div className="kpi-icon">&#x1F4CA;</div>
                <div>
                  <span className="kpi-value">{kpis.total}</span>
                  <span className="kpi-label">Total Fournisseurs</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-low">
                <div className="kpi-icon">&#x1F7E2;</div>
                <div>
                  <span className="kpi-value">{kpis.favorable}</span>
                  <span className="kpi-label">FAVORABLE</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-medium">
                <div className="kpi-icon">&#x1F7E1;</div>
                <div>
                  <span className="kpi-value">{kpis.equilibree}</span>
                  <span className="kpi-label">EQUILIBREE</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-high">
                <div className="kpi-icon">&#x1F7E0;</div>
                <div>
                  <span className="kpi-value">{kpis.aRisque}</span>
                  <span className="kpi-label">A RISQUE</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-critical">
                <div className="kpi-icon">&#x1F534;</div>
                <div>
                  <span className="kpi-value">{kpis.critique}</span>
                  <span className="kpi-label">CRITIQUE</span>
                </div>
              </div>
            </div>

            {/* Matrix Grid - Exposition (rows, top=4) x Fiabilite (cols, left=1) */}
            <div className="matrix-container">
              <h2>Matrice 4x4 - Exposition x Fiabilite Cyber</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    writingMode: "vertical-lr",
                    transform: "rotate(180deg)",
                    color: "#06b6d4",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    padding: "0 5px",
                  }}
                >
                  EXPOSITION
                </div>
                <div style={{ flex: 1 }}>
                  <div className="matrix-wrapper">
                    {/* Row by row: exposition 4 (top) to 1 (bottom) */}
                    {[4, 3, 2, 1].map((expo) => (
                      <React.Fragment key={`row-${expo}`}>
                        <div className="matrix-y-label">
                          {EXPOSITION_LABELS[expo - 1]}
                        </div>
                        {[1, 2, 3, 4].map((fiab) => {
                          const riskColor = RISK_COLORS[expo - 1][fiab - 1];
                          const key = `${expo}-${fiab}`;
                          const count = (matrix[key] || []).length;
                          return (
                            <div
                              key={`cell-${expo}-${fiab}`}
                              className={`matrix-cell cell-${riskColor}`}
                              onClick={() => handleCellClick(expo, fiab)}
                              title={`Exposition: ${EXPOSITION_LABELS[expo - 1]}, Fiabilite: ${FIABILITE_LABELS[fiab - 1]} → ${RISK_LABELS[riskColor]}`}
                            >
                              <span className="cell-risk-label">{RISK_LABELS[riskColor]}</span>
                              {count > 0 && (
                                <span className="cell-count">
                                  {count} fournisseur{count > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {/* X-axis labels */}
                    <div></div>
                    {FIABILITE_LABELS.map((label) => (
                      <div key={label} className="matrix-x-label">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "10px",
                      color: "#06b6d4",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                    }}
                  >
                    FIABILITE CYBER
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  marginTop: "20px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { color: "#10b981", label: "FAVORABLE" },
                  { color: "#eab308", label: "EQUILIBREE" },
                  { color: "#f97316", label: "A RISQUE" },
                  { color: "#ef4444", label: "CRITIQUE" },
                ].map((l) => (
                  <div
                    key={l.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: l.color,
                      }}
                    ></div>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Popup */}
        {popup && (
          <div
            className="matrix-popup-overlay"
            onClick={() => setPopup(null)}
          >
            <div
              className="matrix-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>
                Zone : {popup.riskLabel}
              </h3>
              <p className="popup-subtitle">
                Exposition: {EXPOSITION_LABELS[popup.exposition - 1]} | Fiabilite:{" "}
                {FIABILITE_LABELS[popup.fiabilite - 1]}
              </p>
              <ul className="vendor-list">
                {popup.vendors.map((v) => (
                  <li key={v.id}>
                    <div>
                      <div className="vendor-name">{v.nomFournisseur}</div>
                      <div className="vendor-type">
                        {v.typePrestataire || "N/A"}
                      </div>
                    </div>
                    <div className="vendor-dimensions">
                      <span className="dim-badge" title="Dependance">D:{v.risk.dep}</span>
                      <span className="dim-badge" title="Penetration">P:{v.risk.pen}</span>
                      <span className="dim-badge" title="Maturite">M:{v.risk.mat}</span>
                      <span className="dim-badge" title="Confiance">C:{v.risk.conf}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                className="btn-close-popup"
                onClick={() => setPopup(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskMatrix;

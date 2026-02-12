import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import "./RiskMatrix.css";

const PROB_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

function getRiskColor(score) {
  if (score <= 4) return "cell-green";
  if (score <= 9) return "cell-yellow";
  if (score <= 15) return "cell-orange";
  return "cell-red";
}

function getRiskLevel(score) {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "critical";
}

function calcVendorRisk(vendor) {
  const confidence = Number(vendor.niveauConfiance) || 3;
  const dependance = Number(vendor.niveauDependance) || 3;
  const probability = Math.max(1, Math.min(5, 6 - confidence));
  const impact = Math.max(1, Math.min(5, dependance));
  return { probability, impact, score: probability * impact };
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

  // Build matrix: matrix[impact][probability] = [vendors]
  const matrix = {};
  const vendorRisks = fournisseurs.map((f) => ({ ...f, risk: calcVendorRisk(f) }));

  vendorRisks.forEach((v) => {
    const key = `${v.risk.impact}-${v.risk.probability}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(v);
  });

  const kpis = {
    total: fournisseurs.length,
    critical: vendorRisks.filter((v) => getRiskLevel(v.risk.score) === "critical").length,
    high: vendorRisks.filter((v) => getRiskLevel(v.risk.score) === "high").length,
    medium: vendorRisks.filter((v) => getRiskLevel(v.risk.score) === "medium").length,
    low: vendorRisks.filter((v) => getRiskLevel(v.risk.score) === "low").length,
  };

  const handleCellClick = (impact, probability) => {
    const key = `${impact}-${probability}`;
    const vendors = matrix[key] || [];
    if (vendors.length === 0) return;
    setPopup({
      impact,
      probability,
      score: impact * probability,
      vendors,
    });
  };

  return (
    <div className="risk-matrix-page">
      <div className="cyber-bg-animation"></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Matrice des Risques</h1>
            <p>Evaluation ISO 27001 - Probabilite x Impact par fournisseur</p>
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
                <div className="kpi-icon">📊</div>
                <div>
                  <span className="kpi-value">{kpis.total}</span>
                  <span className="kpi-label">Total Fournisseurs</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-critical">
                <div className="kpi-icon">🔴</div>
                <div>
                  <span className="kpi-value">{kpis.critical}</span>
                  <span className="kpi-label">Risque Critique</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-high">
                <div className="kpi-icon">🟠</div>
                <div>
                  <span className="kpi-value">{kpis.high}</span>
                  <span className="kpi-label">Risque Eleve</span>
                </div>
              </div>
              <div className="risk-kpi-card kpi-medium">
                <div className="kpi-icon">🟡</div>
                <div>
                  <span className="kpi-value">{kpis.medium}</span>
                  <span className="kpi-label">Risque Moyen</span>
                </div>
              </div>
            </div>

            {/* Matrix Grid - Impact (rows, top=5) x Probability (cols, left=1) */}
            <div className="matrix-container">
              <h2>Matrice 5x5 - Probabilite x Impact</h2>
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
                  IMPACT
                </div>
                <div style={{ flex: 1 }}>
                  <div className="matrix-wrapper">
                    {/* Row by row: impact 5 (top) to 1 (bottom) */}
                    {[5, 4, 3, 2, 1].map((impact) => (
                      <React.Fragment key={`row-${impact}`}>
                        <div className="matrix-y-label">
                          {IMPACT_LABELS[impact - 1]}
                        </div>
                        {[1, 2, 3, 4, 5].map((prob) => {
                          const score = impact * prob;
                          const key = `${impact}-${prob}`;
                          const count = (matrix[key] || []).length;
                          return (
                            <div
                              key={`cell-${impact}-${prob}`}
                              className={`matrix-cell ${getRiskColor(score)}`}
                              onClick={() => handleCellClick(impact, prob)}
                              title={`Impact: ${IMPACT_LABELS[impact - 1]}, Prob: ${PROB_LABELS[prob - 1]}, Score: ${score}`}
                            >
                              <span className="cell-score">{score}</span>
                              {count > 0 && (
                                <span className="cell-count">
                                  {count} vendor{count > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {/* X-axis labels */}
                    <div></div>
                    {PROB_LABELS.map((label) => (
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
                    PROBABILITE
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
                  { color: "#10b981", label: "Faible (1-4)" },
                  { color: "#eab308", label: "Moyen (5-9)" },
                  { color: "#f59e0b", label: "Eleve (10-15)" },
                  { color: "#ef4444", label: "Critique (16-25)" },
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
                Zone de Risque : Score {popup.score}
              </h3>
              <p className="popup-subtitle">
                Impact: {IMPACT_LABELS[popup.impact - 1]} | Probabilite:{" "}
                {PROB_LABELS[popup.probability - 1]}
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
                    <span
                      style={{
                        color:
                          getRiskLevel(v.risk.score) === "critical"
                            ? "#ef4444"
                            : getRiskLevel(v.risk.score) === "high"
                            ? "#f59e0b"
                            : getRiskLevel(v.risk.score) === "medium"
                            ? "#eab308"
                            : "#10b981",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      {v.risk.score}/25
                    </span>
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

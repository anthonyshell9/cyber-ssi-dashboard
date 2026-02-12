import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./ConcentrationRisk.css";

const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#14b8a6"];

const ConcentrationRisk = () => {
  const navigate = useNavigate();
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

  // Critical services distribution per provider
  const criticalVendors = fournisseurs.filter(
    (f) => f.doraClassification === "Critical" || f.doraClassification === "Important"
  );

  const servicesByProvider = {};
  criticalVendors.forEach((f) => {
    const name = f.nomFournisseur || "Inconnu";
    servicesByProvider[name] = (servicesByProvider[name] || 0) + 1;
  });

  const pieData = Object.entries(servicesByProvider).map(([name, value]) => ({
    name,
    value,
  }));

  // Services by data hosting country
  const servicesByCountry = {};
  fournisseurs.forEach((f) => {
    const loc = f.dataLocation || "Non defini";
    servicesByCountry[loc] = (servicesByCountry[loc] || 0) + 1;
  });

  const barData = Object.entries(servicesByCountry)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Concentration warnings: any single provider > 30% of critical services
  const totalCritical = criticalVendors.length;
  const warnings = [];
  Object.entries(servicesByProvider).forEach(([name, count]) => {
    const pct = totalCritical > 0 ? (count / totalCritical) * 100 : 0;
    if (pct > 30) {
      warnings.push({ name, count, pct: Math.round(pct) });
    }
  });

  // Concentration alerts: high dependency vendors
  const alerts = Object.entries(servicesByProvider)
    .map(([name, count]) => ({
      name,
      count,
      pct: totalCritical > 0 ? Math.round((count / totalCritical) * 100) : 0,
      level: count >= 3 ? "Critique" : count >= 2 ? "Eleve" : "Modere",
    }))
    .sort((a, b) => b.count - a.count);

  // Risk matrix 5x5
  const getRiskLevel = (prob, impact) => {
    const score = prob * impact;
    if (score >= 16) return "risk-critical";
    if (score >= 10) return "risk-high";
    if (score >= 5) return "risk-medium";
    return "risk-low";
  };

  const probLabels = ["Rare", "Peu probable", "Possible", "Probable", "Quasi certain"];
  const impactLabels = ["Negligeable", "Mineur", "Modere", "Majeur", "Critique"];

  return (
    <div className="concentration-risk">
      <header className="concentration-header">
        <button onClick={() => navigate("/gestion")} className="btn-back-conc">
          ← Retour
        </button>
        <div className="header-title">
          <h1>RISQUE DE CONCENTRATION</h1>
          <p>Analyse des dependances fournisseurs ICT</p>
        </div>
        <div />
      </header>

      {loading && <div style={{ textAlign: "center", color: "#94a3b8", padding: 60 }}>Chargement...</div>}

      {!loading && (
        <>
          {warnings.map((w, i) => (
            <div key={i} className="concentration-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                ALERTE : {w.name} detient {w.pct}% des services critiques ({w.count}/{totalCritical})
              </span>
            </div>
          ))}

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Services critiques par fournisseur</h3>
              <div className="chart-area">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8", paddingTop: 100 }}>
                    Aucun fournisseur critique enregistre
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>Services par pays d'hebergement</h3>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" name="Services" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="risk-matrix-container">
            <h3>Matrice de Risque - Probabilite x Impact</h3>
            <div className="risk-matrix">
              {/* Y axis labels (top to bottom: 5 -> 1) */}
              {[5, 4, 3, 2, 1].map((prob) => (
                <React.Fragment key={`row-${prob}`}>
                  <div className="matrix-y-label">{probLabels[prob - 1]}</div>
                  {[1, 2, 3, 4, 5].map((impact) => (
                    <div
                      key={`${prob}-${impact}`}
                      className={`matrix-cell ${getRiskLevel(prob, impact)}`}
                    >
                      {prob * impact}
                    </div>
                  ))}
                </React.Fragment>
              ))}
              {/* X axis labels */}
              <div />
              {impactLabels.map((label, i) => (
                <div key={i} className="matrix-x-label">{label}</div>
              ))}
            </div>
            <div className="matrix-axis-title">Impact →</div>
          </div>

          <div className="alerts-section">
            <h3>Alertes de Concentration</h3>
            {alerts.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
                Aucune alerte de concentration
              </div>
            ) : (
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th>Fournisseur</th>
                    <th>Services Critiques</th>
                    <th>Part (%)</th>
                    <th>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={i}>
                      <td>{a.name}</td>
                      <td>{a.count}</td>
                      <td>{a.pct}%</td>
                      <td className={a.level === "Critique" ? "alert-level-high" : "alert-level-medium"}>
                        {a.level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ConcentrationRisk;

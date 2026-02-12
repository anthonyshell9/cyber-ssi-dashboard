import React, { useEffect, useState } from "react";
import {
  collection, onSnapshot, doc, setDoc, Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import "./SoaDashboard.css";

const SOA_CONTROLS = [
  { id: "A.5.19", name: "Information security in supplier relationships" },
  { id: "A.5.20", name: "Addressing info security within supplier agreements" },
  { id: "A.5.21", name: "Managing info security in ICT supply chain" },
  { id: "A.5.22", name: "Monitoring, review and change management of supplier services" },
  { id: "A.5.23", name: "Information security for use of cloud services" },
  { id: "A.5.29", name: "Information security during disruption" },
  { id: "A.5.30", name: "ICT readiness for business continuity" },
  { id: "A.8.1", name: "User endpoint devices" },
];

const STATUSES = ["Implemented", "Partially Implemented", "Not Implemented", "Not Applicable"];

const STATUS_COLORS = {
  Implemented: "#10b981",
  "Partially Implemented": "#f59e0b",
  "Not Implemented": "#ef4444",
  "Not Applicable": "#64748b",
};

const SoaDashboard = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [controls, setControls] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "soaControls"), (snap) => {
      const data = {};
      snap.docs.forEach((d) => {
        data[d.id] = d.data();
      });
      setControls(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateControl = async (controlId, field, value) => {
    const key = `${controlId}-${field}`;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const existing = controls[controlId] || {};
      await setDoc(doc(db, "soaControls", controlId), {
        ...existing,
        [field]: value,
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Error updating SOA control:", err);
      addNotification("error", "Erreur lors de la sauvegarde.");
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Compute stats
  const controlStates = SOA_CONTROLS.map((c) => ({
    ...c,
    status: (controls[c.id] || {}).status || "Not Implemented",
    justification: (controls[c.id] || {}).justification || "",
  }));

  const statusCounts = {
    Implemented: controlStates.filter((c) => c.status === "Implemented").length,
    "Partially Implemented": controlStates.filter((c) => c.status === "Partially Implemented").length,
    "Not Implemented": controlStates.filter((c) => c.status === "Not Implemented").length,
    "Not Applicable": controlStates.filter((c) => c.status === "Not Applicable").length,
  };

  const applicable = SOA_CONTROLS.length - statusCounts["Not Applicable"];
  const implemented = statusCounts.Implemented;
  const compliancePct = applicable > 0 ? Math.round((implemented / applicable) * 100) : 0;

  const pieData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const getStatusSelectClass = (status) => {
    const map = {
      Implemented: "status-implemented",
      "Partially Implemented": "status-partial",
      "Not Implemented": "status-not-implemented",
      "Not Applicable": "status-na",
    };
    return map[status] || "";
  };

  const getComplianceColor = (pct) => {
    if (pct >= 75) return "#10b981";
    if (pct >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="soa-dashboard-page">
      <div className="cyber-bg-animation"></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Declaration d'Applicabilite (SoA)</h1>
            <p>ISO 27001 - Controles Annexe A applicables aux fournisseurs</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/gestion")}>
            &larr; Retour Dashboard
          </button>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="cyber-spinner"></div>
            <p style={{ color: "#94a3b8" }}>Chargement...</p>
          </div>
        ) : (
          <>
            {/* Overview */}
            <div className="soa-compliance-overview">
              <div className="soa-compliance-chart">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="soa-compliance-stats">
                <h2>Conformite Globale</h2>
                <span
                  className="soa-overall-pct"
                  style={{ color: getComplianceColor(compliancePct) }}
                >
                  {compliancePct}%
                </span>
                <div className="soa-overall-bar">
                  <div
                    className="soa-overall-bar-fill"
                    style={{
                      width: `${compliancePct}%`,
                      background: getComplianceColor(compliancePct),
                    }}
                  ></div>
                </div>
                <div className="soa-status-pills">
                  <span className="soa-pill pill-implemented">
                    {statusCounts.Implemented} Implemente
                  </span>
                  <span className="soa-pill pill-partial">
                    {statusCounts["Partially Implemented"]} Partiel
                  </span>
                  <span className="soa-pill pill-not-implemented">
                    {statusCounts["Not Implemented"]} Non Implemente
                  </span>
                  <span className="soa-pill pill-na">
                    {statusCounts["Not Applicable"]} N/A
                  </span>
                </div>
              </div>
            </div>

            {/* Controls List */}
            <div className="soa-controls-container">
              <h2>Controles Annexe A - Fournisseurs</h2>
              {controlStates.map((control) => (
                <div key={control.id} className="soa-control-row">
                  <div className="soa-control-header">
                    <div className="soa-control-info">
                      <span className="soa-control-id">{control.id}</span>
                      <span className="soa-control-name">{control.name}</span>
                    </div>
                    <div className="soa-control-actions">
                      <select
                        className={`soa-status-select ${getStatusSelectClass(control.status)}`}
                        value={control.status}
                        onChange={(e) => updateControl(control.id, "status", e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {saving[`${control.id}-status`] && (
                        <span className="soa-saving">Sauvegarde...</span>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="soa-justification-input"
                    placeholder="Justification / commentaire..."
                    value={control.justification}
                    onChange={(e) => {
                      // Optimistic local update
                      setControls((prev) => ({
                        ...prev,
                        [control.id]: { ...(prev[control.id] || {}), justification: e.target.value },
                      }));
                    }}
                    onBlur={(e) => updateControl(control.id, "justification", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SoaDashboard;

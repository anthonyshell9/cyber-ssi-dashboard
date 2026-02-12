import React, { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, Timestamp, where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import "./SlaMonitoring.css";

const SlaMonitoring = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [slaDefinitions, setSlaDefinitions] = useState([]);
  const [slaMeasurements, setSlaMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // "define" or "measure"

  const [defForm, setDefForm] = useState({
    vendorId: "", vendorName: "", availability: 99.5, responseTime: 4, resolutionTime: 24,
  });

  const [measureForm, setMeasureForm] = useState({
    vendorId: "", vendorName: "", month: "", availability: 99.5, responseTime: 4, resolutionTime: 24,
  });

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, "fournisseurs"), orderBy("createdAt", "desc")),
      (snap) => {
        setFournisseurs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    const unsub2 = onSnapshot(
      query(collection(db, "slaDefinitions")),
      (snap) => setSlaDefinitions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub3 = onSnapshot(
      query(collection(db, "slaMeasurements"), orderBy("month", "asc")),
      (snap) => setSlaMeasurements(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const handleDefineSla = async () => {
    if (!defForm.vendorId) {
      addNotification("error", "Selectionnez un fournisseur.");
      return;
    }
    await addDoc(collection(db, "slaDefinitions"), {
      ...defForm,
      availability: Number(defForm.availability),
      responseTime: Number(defForm.responseTime),
      resolutionTime: Number(defForm.resolutionTime),
      createdAt: Timestamp.now(),
    });
    addNotification("success", "SLA defini avec succes.");
    setShowModal(null);
    setDefForm({ vendorId: "", vendorName: "", availability: 99.5, responseTime: 4, resolutionTime: 24 });
  };

  const handleLogMeasurement = async () => {
    if (!measureForm.vendorId || !measureForm.month) {
      addNotification("error", "Remplissez les champs obligatoires.");
      return;
    }
    await addDoc(collection(db, "slaMeasurements"), {
      ...measureForm,
      availability: Number(measureForm.availability),
      responseTime: Number(measureForm.responseTime),
      resolutionTime: Number(measureForm.resolutionTime),
      createdAt: Timestamp.now(),
    });
    addNotification("success", "Mesure SLA enregistree.");
    setShowModal(null);
    setMeasureForm({ vendorId: "", vendorName: "", month: "", availability: 99.5, responseTime: 4, resolutionTime: 24 });
  };

  // Build vendor SLA view
  const vendorSlaData = slaDefinitions.map((sla) => {
    const measurements = slaMeasurements.filter((m) => m.vendorId === sla.vendorId);
    const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;

    const breaches = [];
    if (latest) {
      if (latest.availability < sla.availability) breaches.push("availability");
      if (latest.responseTime > sla.responseTime) breaches.push("responseTime");
      if (latest.resolutionTime > sla.resolutionTime) breaches.push("resolutionTime");
    }

    return { ...sla, latest, measurements, breaches, isMet: breaches.length === 0 };
  });

  const totalMonitored = vendorSlaData.length;
  const meetingAll = vendorSlaData.filter((v) => v.isMet).length;
  const activBreaches = vendorSlaData.filter((v) => !v.isMet).length;

  // Chart data: monthly availability across vendors
  const monthsSet = new Set(slaMeasurements.map((m) => m.month));
  const months = [...monthsSet].sort();
  const chartData = months.map((month) => {
    const entry = { month };
    vendorSlaData.forEach((v) => {
      const m = v.measurements.find((mm) => mm.month === month);
      if (m) entry[v.vendorName] = m.availability;
    });
    return entry;
  });

  const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

  return (
    <div className="sla-monitoring-page">
      <div className="cyber-bg-animation"></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>SLA Monitoring</h1>
            <p>Suivi des accords de niveau de service fournisseurs</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/gestion")}>
            &larr; Retour Dashboard
          </button>
        </div>

        {/* Summary */}
        <div className="sla-summary-row">
          <div className="sla-summary-card">
            <div className="sum-icon" style={{ background: "rgba(6,182,212,0.15)" }}>📊</div>
            <div>
              <span className="sum-value" style={{ color: "#06b6d4" }}>{totalMonitored}</span>
              <span className="sum-label">Fournisseurs Suivis</span>
            </div>
          </div>
          <div className="sla-summary-card">
            <div className="sum-icon" style={{ background: "rgba(16,185,129,0.15)" }}>✅</div>
            <div>
              <span className="sum-value" style={{ color: "#10b981" }}>
                {totalMonitored > 0 ? Math.round((meetingAll / totalMonitored) * 100) : 0}%
              </span>
              <span className="sum-label">Conformes SLA</span>
            </div>
          </div>
          <div className="sla-summary-card">
            <div className="sum-icon" style={{ background: "rgba(239,68,68,0.15)" }}>🚨</div>
            <div>
              <span className="sum-value" style={{ color: "#ef4444" }}>{activBreaches}</span>
              <span className="sum-label">Violations Actives</span>
            </div>
          </div>
        </div>

        {/* Breach Banner */}
        {activBreaches > 0 && (
          <div className="sla-breach-banner">
            🚨 ALERTE : {activBreaches} fournisseur(s) en violation de SLA !
            {vendorSlaData.filter((v) => !v.isMet).map((v) => ` ${v.vendorName}`).join(",")}
          </div>
        )}

        {/* Actions */}
        <div className="sla-action-bar">
          <button className="btn-sla-action" onClick={() => setShowModal("define")}>
            + Definir SLA
          </button>
          <button className="btn-sla-action" onClick={() => setShowModal("measure")}>
            + Enregistrer Mesure
          </button>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="cyber-spinner"></div>
            <p style={{ color: "#94a3b8" }}>Chargement...</p>
          </div>
        ) : (
          <>
            {/* Vendor SLA Cards */}
            <div className="sla-vendor-grid">
              {vendorSlaData.map((v) => (
                <div key={v.id} className={`sla-vendor-card ${!v.isMet ? "breached" : ""}`}>
                  <div className="card-top">
                    <h3>{v.vendorName}</h3>
                    {v.isMet ? (
                      <span className="sla-badge-ok">SLA OK</span>
                    ) : (
                      <span className="sla-badge-breach">VIOLATION</span>
                    )}
                  </div>

                  {/* Availability */}
                  <div className="sla-metric">
                    <div className="sla-metric-header">
                      <span className="sla-metric-name">Disponibilite</span>
                      <span className="sla-metric-values" style={{ color: v.latest && v.latest.availability < v.availability ? "#ef4444" : "#10b981" }}>
                        {v.latest ? `${v.latest.availability}%` : "N/A"} / {v.availability}%
                      </span>
                    </div>
                    <div className="sla-bar">
                      <div
                        className="sla-bar-fill"
                        style={{
                          width: v.latest ? `${Math.min(100, (v.latest.availability / v.availability) * 100)}%` : "0%",
                          background: v.latest && v.latest.availability < v.availability ? "#ef4444" : "#10b981",
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Response Time */}
                  <div className="sla-metric">
                    <div className="sla-metric-header">
                      <span className="sla-metric-name">Temps de reponse</span>
                      <span className="sla-metric-values" style={{ color: v.latest && v.latest.responseTime > v.responseTime ? "#ef4444" : "#10b981" }}>
                        {v.latest ? `${v.latest.responseTime}h` : "N/A"} / {v.responseTime}h max
                      </span>
                    </div>
                    <div className="sla-bar">
                      <div
                        className="sla-bar-fill"
                        style={{
                          width: v.latest ? `${Math.min(100, (v.responseTime / Math.max(v.latest.responseTime, 0.1)) * 100)}%` : "0%",
                          background: v.latest && v.latest.responseTime > v.responseTime ? "#ef4444" : "#10b981",
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Resolution Time */}
                  <div className="sla-metric">
                    <div className="sla-metric-header">
                      <span className="sla-metric-name">Temps de resolution</span>
                      <span className="sla-metric-values" style={{ color: v.latest && v.latest.resolutionTime > v.resolutionTime ? "#ef4444" : "#10b981" }}>
                        {v.latest ? `${v.latest.resolutionTime}h` : "N/A"} / {v.resolutionTime}h max
                      </span>
                    </div>
                    <div className="sla-bar">
                      <div
                        className="sla-bar-fill"
                        style={{
                          width: v.latest ? `${Math.min(100, (v.resolutionTime / Math.max(v.latest.resolutionTime, 0.1)) * 100)}%` : "0%",
                          background: v.latest && v.latest.resolutionTime > v.resolutionTime ? "#ef4444" : "#10b981",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Historical Chart */}
            {chartData.length > 0 && (
              <div className="sla-chart-section">
                <h2>Tendance Disponibilite Mensuelle</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis domain={[90, 100]} tick={{ fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                      formatter={(value) => [`${value}%`, "Disponibilite"]}
                    />
                    <Legend />
                    {vendorSlaData.map((v, i) => (
                      <Line
                        key={v.vendorId}
                        type="monotone"
                        dataKey={v.vendorName}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Define SLA Modal */}
        {showModal === "define" && (
          <div className="sla-modal-overlay" onClick={() => setShowModal(null)}>
            <div className="sla-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Definir SLA Fournisseur</h3>
              <div className="form-group">
                <label>Fournisseur *</label>
                <select
                  value={defForm.vendorId}
                  onChange={(e) => {
                    const f = fournisseurs.find((f) => f.id === e.target.value);
                    setDefForm({ ...defForm, vendorId: e.target.value, vendorName: f ? f.nomFournisseur : "" });
                  }}
                >
                  <option value="">Selectionner...</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nomFournisseur}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Disponibilite cible (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={defForm.availability} onChange={(e) => setDefForm({ ...defForm, availability: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Temps de reponse max (heures)</label>
                <input type="number" step="0.5" min="0" value={defForm.responseTime} onChange={(e) => setDefForm({ ...defForm, responseTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Temps de resolution max (heures)</label>
                <input type="number" step="0.5" min="0" value={defForm.resolutionTime} onChange={(e) => setDefForm({ ...defForm, resolutionTime: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Annuler</button>
                <button className="btn-save" onClick={handleDefineSla}>Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        {/* Log Measurement Modal */}
        {showModal === "measure" && (
          <div className="sla-modal-overlay" onClick={() => setShowModal(null)}>
            <div className="sla-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Enregistrer Mesure SLA</h3>
              <div className="form-group">
                <label>Fournisseur *</label>
                <select
                  value={measureForm.vendorId}
                  onChange={(e) => {
                    const f = fournisseurs.find((f) => f.id === e.target.value);
                    setMeasureForm({ ...measureForm, vendorId: e.target.value, vendorName: f ? f.nomFournisseur : "" });
                  }}
                >
                  <option value="">Selectionner...</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nomFournisseur}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mois *</label>
                <input type="month" value={measureForm.month} onChange={(e) => setMeasureForm({ ...measureForm, month: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Disponibilite mesuree (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={measureForm.availability} onChange={(e) => setMeasureForm({ ...measureForm, availability: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Temps de reponse mesure (heures)</label>
                <input type="number" step="0.5" min="0" value={measureForm.responseTime} onChange={(e) => setMeasureForm({ ...measureForm, responseTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Temps de resolution mesure (heures)</label>
                <input type="number" step="0.5" min="0" value={measureForm.resolutionTime} onChange={(e) => setMeasureForm({ ...measureForm, resolutionTime: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Annuler</button>
                <button className="btn-save" onClick={handleLogMeasurement}>Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlaMonitoring;

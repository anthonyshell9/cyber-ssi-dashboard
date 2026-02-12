import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import "./IsoControls.css";

const ISO_CONTROLS = [
  { id: "A.5.19", name: "Information security in supplier relationships" },
  { id: "A.5.20", name: "Addressing info security within supplier agreements" },
  { id: "A.5.21", name: "Managing info security in ICT supply chain" },
  { id: "A.5.22", name: "Monitoring, review and change management of supplier services" },
  { id: "A.5.23", name: "Information security for use of cloud services" },
  { id: "A.8.1", name: "User endpoint devices" },
  { id: "A.5.29", name: "Information security during disruption" },
  { id: "A.5.30", name: "ICT readiness for business continuity" },
];

const IsoControls = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vendors");
  const [saving, setSaving] = useState({});

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setFournisseurs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleControl = async (vendorId, controlId, currentValue) => {
    const key = `save-${vendorId}-${controlId}`;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const ref = doc(db, "fournisseurs", vendorId);
      const vendor = fournisseurs.find((f) => f.id === vendorId);
      const currentControls = vendor.isoControls || {};
      await updateDoc(ref, {
        isoControls: { ...currentControls, [controlId]: !currentValue },
      });
    } catch (err) {
      console.error("Error toggling control:", err);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getVendorCompliance = (vendor) => {
    const controls = vendor.isoControls || {};
    const satisfied = ISO_CONTROLS.filter((c) => controls[c.id] === true).length;
    return Math.round((satisfied / ISO_CONTROLS.length) * 100);
  };

  const getComplianceColor = (pct) => {
    if (pct >= 75) return "#10b981";
    if (pct >= 50) return "#f59e0b";
    return "#ef4444";
  };

  // Global view data
  const globalData = ISO_CONTROLS.map((control) => {
    const count = fournisseurs.filter(
      (f) => (f.isoControls || {})[control.id] === true
    ).length;
    const pct = fournisseurs.length > 0 ? Math.round((count / fournisseurs.length) * 100) : 0;
    return { ...control, count, pct, total: fournisseurs.length };
  });

  const gapControls = globalData.filter((d) => d.pct < 50);

  return (
    <div className="iso-controls-page">
      <div className="cyber-bg-animation"></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Controles ISO 27001</h1>
            <p>Annexe A - Mapping conformite fournisseurs</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/gestion")}>
            &larr; Retour Dashboard
          </button>
        </div>

        <div className="iso-tabs">
          <button
            className={`iso-tab-btn ${activeTab === "vendors" ? "active" : ""}`}
            onClick={() => setActiveTab("vendors")}
          >
            Par Fournisseur
          </button>
          <button
            className={`iso-tab-btn ${activeTab === "global" ? "active" : ""}`}
            onClick={() => setActiveTab("global")}
          >
            Vue Globale
          </button>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="cyber-spinner"></div>
            <p style={{ color: "#94a3b8" }}>Chargement...</p>
          </div>
        ) : activeTab === "vendors" ? (
          <div className="iso-vendor-grid">
            {fournisseurs.map((vendor) => {
              const pct = getVendorCompliance(vendor);
              const controls = vendor.isoControls || {};
              return (
                <div key={vendor.id} className="iso-vendor-card">
                  <div className="card-header">
                    <div>
                      <h3>{vendor.nomFournisseur}</h3>
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                        {vendor.typePrestataire || "N/A"}
                      </span>
                    </div>
                    <span
                      className="compliance-pct"
                      style={{ color: getComplianceColor(pct) }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: getComplianceColor(pct),
                      }}
                    ></div>
                  </div>
                  <ul className="control-check-list">
                    {ISO_CONTROLS.map((control) => {
                      const checked = controls[control.id] === true;
                      const saveKey = `save-${vendor.id}-${control.id}`;
                      return (
                        <li key={control.id} className="control-check-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleControl(vendor.id, control.id, checked)
                            }
                          />
                          <span className="control-id">{control.id}</span>
                          <span className="control-name">{control.name}</span>
                          {saving[saveKey] && (
                            <span className="saving-indicator">...</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="iso-global-view">
            <h2>Couverture par Controle</h2>

            {gapControls.length > 0 && (
              <div className="gap-alert">
                Analyse des lacunes : {gapControls.length} controle(s) avec moins
                de 50% de couverture :{" "}
                {gapControls.map((g) => g.id).join(", ")}
              </div>
            )}

            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={globalData}
                margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
              >
                <XAxis
                  dataKey="id"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: "#94a3b8" }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                  formatter={(value, name, props) => [
                    `${props.payload.count}/${props.payload.total} (${value}%)`,
                    "Couverture",
                  ]}
                />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  {globalData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.pct < 50 ? "#ef4444" : entry.pct < 75 ? "#f59e0b" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default IsoControls;

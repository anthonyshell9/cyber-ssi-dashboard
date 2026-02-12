import React, { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import "./AuditProgram.css";

const AUDIT_TYPES = ["Internal", "Supplier", "Certification", "Surveillance"];
const LIFECYCLE = ["Plan", "Execute", "Report", "Follow-up"];
const FINDING_TYPES = ["Non-conformity Major", "Non-conformity Minor", "Observation", "OFI"];
const FINDING_STATUSES = ["Open", "In Progress", "Closed"];

const AuditProgram = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [audits, setAudits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // "audit" or "finding"
  const [targetAuditId, setTargetAuditId] = useState(null);

  // Form state for new audit
  const [auditForm, setAuditForm] = useState({
    type: "Internal", vendor: "", plannedDate: "", auditor: "", scope: "",
  });

  // Form state for new finding
  const [findingForm, setFindingForm] = useState({
    type: "Non-conformity Major", description: "", correctiveAction: "",
    deadline: "", status: "Open",
  });

  useEffect(() => {
    const qAudits = query(collection(db, "auditProgram"), orderBy("plannedDate", "desc"));
    const unsub1 = onSnapshot(qAudits, (snap) => {
      setAudits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const qVendors = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsub2 = onSnapshot(qVendors, (snap) => {
      setFournisseurs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleCreateAudit = async () => {
    if (!auditForm.vendor || !auditForm.plannedDate) {
      addNotification("error", "Veuillez remplir les champs obligatoires.");
      return;
    }
    await addDoc(collection(db, "auditProgram"), {
      ...auditForm,
      status: "Plan",
      findings: [],
      createdAt: Timestamp.now(),
    });
    addNotification("success", "Audit cree avec succes.");
    setShowModal(null);
    setAuditForm({ type: "Internal", vendor: "", plannedDate: "", auditor: "", scope: "" });
  };

  const handleAddFinding = async () => {
    if (!findingForm.description) {
      addNotification("error", "La description est requise.");
      return;
    }
    const audit = audits.find((a) => a.id === targetAuditId);
    if (!audit) return;
    const findings = [...(audit.findings || []), { ...findingForm, id: Date.now().toString() }];
    await updateDoc(doc(db, "auditProgram", targetAuditId), { findings });
    addNotification("success", "Constat ajoute.");
    setShowModal(null);
    setFindingForm({
      type: "Non-conformity Major", description: "", correctiveAction: "",
      deadline: "", status: "Open",
    });
  };

  const advanceLifecycle = async (auditId, currentStatus) => {
    const idx = LIFECYCLE.indexOf(currentStatus);
    if (idx >= LIFECYCLE.length - 1) return;
    await updateDoc(doc(db, "auditProgram", auditId), {
      status: LIFECYCLE[idx + 1],
    });
    addNotification("info", `Audit avance a : ${LIFECYCLE[idx + 1]}`);
  };

  // Group audits by month
  const grouped = {};
  audits.forEach((a) => {
    const date = a.plannedDate || "Non planifie";
    const monthKey = date.substring(0, 7); // YYYY-MM
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push(a);
  });

  const sortedMonths = Object.keys(grouped).sort().reverse();

  // Stats
  const totalPlanned = audits.length;
  const completed = audits.filter((a) => a.status === "Follow-up" || a.status === "Report").length;
  const allFindings = audits.flatMap((a) => a.findings || []);
  const openFindings = allFindings.filter((f) => f.status !== "Closed").length;
  const overdueFindings = allFindings.filter((f) => {
    if (f.status === "Closed" || !f.deadline) return false;
    return new Date(f.deadline) < new Date();
  }).length;

  const getTypeClass = (type) => {
    const map = { Internal: "type-internal", Supplier: "type-supplier", Certification: "type-certification", Surveillance: "type-surveillance" };
    return map[type] || "type-internal";
  };

  const getFindingTypeClass = (type) => {
    if (type.includes("Major")) return "finding-major";
    if (type.includes("Minor")) return "finding-minor";
    if (type === "Observation") return "finding-observation";
    return "finding-ofi";
  };

  const getStatusClass = (status) => {
    const map = { Open: "status-open", "In Progress": "status-in-progress", Closed: "status-closed" };
    return map[status] || "";
  };

  return (
    <div className="audit-program-page">
      <div className="cyber-bg-animation"></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Programme d'Audit</h1>
            <p>Gestion des audits ISO 27001 - Cycle de vie complet</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/gestion")}>
            &larr; Retour Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="audit-stats-row">
          <div className="audit-stat-card">
            <div className="stat-icon" style={{ background: "rgba(6,182,212,0.15)" }}>📋</div>
            <div>
              <span className="stat-value" style={{ color: "#06b6d4" }}>{totalPlanned}</span>
              <span className="stat-label">Audits Planifies</span>
              <div className="audit-progress-bar">
                <div className="audit-progress-fill" style={{ width: totalPlanned > 0 ? `${(completed / totalPlanned) * 100}%` : "0%" }}></div>
              </div>
            </div>
          </div>
          <div className="audit-stat-card">
            <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>✅</div>
            <div>
              <span className="stat-value" style={{ color: "#10b981" }}>{completed}</span>
              <span className="stat-label">Completes</span>
            </div>
          </div>
          <div className="audit-stat-card">
            <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>📝</div>
            <div>
              <span className="stat-value" style={{ color: "#f59e0b" }}>{openFindings}</span>
              <span className="stat-label">Constats Ouverts</span>
            </div>
          </div>
          <div className="audit-stat-card">
            <div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)" }}>⏰</div>
            <div>
              <span className="stat-value" style={{ color: "#ef4444" }}>{overdueFindings}</span>
              <span className="stat-label">En Retard</span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="audit-action-bar">
          <button className="btn-create-audit" onClick={() => setShowModal("audit")}>
            + Nouvel Audit
          </button>
        </div>

        {/* Audit List grouped by month */}
        {loading ? (
          <div className="loader-container">
            <div className="cyber-spinner"></div>
            <p style={{ color: "#94a3b8" }}>Chargement...</p>
          </div>
        ) : sortedMonths.length === 0 ? (
          <div className="no-audits">
            <p style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Aucun audit planifie</p>
            <p>Cliquez sur "Nouvel Audit" pour commencer.</p>
          </div>
        ) : (
          sortedMonths.map((month) => (
            <div key={month} className="audit-month-group">
              <h3>{month}</h3>
              {grouped[month].map((audit) => {
                const stepIdx = LIFECYCLE.indexOf(audit.status);
                return (
                  <div key={audit.id} className="audit-card">
                    <div className="audit-card-header">
                      <div>
                        <h4>{audit.scope || "Audit"} - {audit.vendor}</h4>
                      </div>
                      <span className={`audit-type-badge ${getTypeClass(audit.type)}`}>
                        {audit.type}
                      </span>
                    </div>

                    <div className="audit-card-meta">
                      <span>📅 {audit.plannedDate}</span>
                      <span>👤 {audit.auditor || "Non assigne"}</span>
                      <span>📝 {(audit.findings || []).length} constat(s)</span>
                    </div>

                    {/* Lifecycle steps */}
                    <div className="lifecycle-steps">
                      {LIFECYCLE.map((step, i) => (
                        <div
                          key={step}
                          className={`lifecycle-step ${
                            i < stepIdx ? "step-done" : i === stepIdx ? "step-active" : ""
                          }`}
                        >
                          {step}
                        </div>
                      ))}
                    </div>

                    {stepIdx < LIFECYCLE.length - 1 && (
                      <button
                        className="btn-advance-step"
                        onClick={() => advanceLifecycle(audit.id, audit.status)}
                      >
                        Avancer &rarr; {LIFECYCLE[stepIdx + 1]}
                      </button>
                    )}

                    {/* Findings */}
                    {(audit.findings || []).length > 0 && (
                      <div className="findings-section">
                        <h5>Constats</h5>
                        {audit.findings.map((f, i) => (
                          <div key={f.id || i} className="finding-row">
                            <span className={`finding-type-badge ${getFindingTypeClass(f.type)}`}>
                              {f.type.includes("Major") ? "MAJ" : f.type.includes("Minor") ? "MIN" : f.type === "Observation" ? "OBS" : "OFI"}
                            </span>
                            <span className="finding-desc">{f.description}</span>
                            <span className={`finding-status ${getStatusClass(f.status)}`}>
                              {f.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="btn-add-finding"
                      onClick={() => {
                        setTargetAuditId(audit.id);
                        setShowModal("finding");
                      }}
                    >
                      + Ajouter un constat
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Create Audit Modal */}
        {showModal === "audit" && (
          <div className="audit-modal-overlay" onClick={() => setShowModal(null)}>
            <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Nouvel Audit</h3>
              <div className="form-group">
                <label>Type d'audit *</label>
                <select value={auditForm.type} onChange={(e) => setAuditForm({ ...auditForm, type: e.target.value })}>
                  {AUDIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fournisseur *</label>
                <select value={auditForm.vendor} onChange={(e) => setAuditForm({ ...auditForm, vendor: e.target.value })}>
                  <option value="">Selectionner...</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.nomFournisseur}>{f.nomFournisseur}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date prevue *</label>
                <input type="date" value={auditForm.plannedDate} onChange={(e) => setAuditForm({ ...auditForm, plannedDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Auditeur</label>
                <input type="text" value={auditForm.auditor} onChange={(e) => setAuditForm({ ...auditForm, auditor: e.target.value })} placeholder="Nom de l'auditeur" />
              </div>
              <div className="form-group">
                <label>Perimetre</label>
                <textarea rows={3} value={auditForm.scope} onChange={(e) => setAuditForm({ ...auditForm, scope: e.target.value })} placeholder="Perimetre de l'audit..." />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Annuler</button>
                <button className="btn-save" onClick={handleCreateAudit}>Creer l'audit</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Finding Modal */}
        {showModal === "finding" && (
          <div className="audit-modal-overlay" onClick={() => setShowModal(null)}>
            <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Nouveau Constat</h3>
              <div className="form-group">
                <label>Type *</label>
                <select value={findingForm.type} onChange={(e) => setFindingForm({ ...findingForm, type: e.target.value })}>
                  {FINDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea rows={3} value={findingForm.description} onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })} placeholder="Description du constat..." />
              </div>
              <div className="form-group">
                <label>Action corrective</label>
                <textarea rows={2} value={findingForm.correctiveAction} onChange={(e) => setFindingForm({ ...findingForm, correctiveAction: e.target.value })} placeholder="Action corrective proposee..." />
              </div>
              <div className="form-group">
                <label>Date limite</label>
                <input type="date" value={findingForm.deadline} onChange={(e) => setFindingForm({ ...findingForm, deadline: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Statut</label>
                <select value={findingForm.status} onChange={(e) => setFindingForm({ ...findingForm, status: e.target.value })}>
                  {FINDING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Annuler</button>
                <button className="btn-save" onClick={handleAddFinding}>Ajouter</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditProgram;

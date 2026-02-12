import React, { useEffect, useState, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./AdminAuditLog.css";

const ACTION_LABELS = {
  user_created: "Creation utilisateur",
  user_updated: "Modification utilisateur",
  user_deleted: "Suppression utilisateur",
  settings_updated: "Modification parametres",
  evaluation_saved: "Evaluation enregistree",
  vendor_approved: "Fournisseur approuve",
  vendor_rejected: "Fournisseur rejete",
};

const ACTION_COLORS = {
  user_created: "badge-green",
  user_updated: "badge-cyan",
  user_deleted: "badge-red",
  settings_updated: "badge-purple",
  evaluation_saved: "badge-amber",
  vendor_approved: "badge-green",
  vendor_rejected: "badge-red",
};

const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");

  // Real-time listener on auditLogs collection
  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const total = logs.length;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const today = logs.filter((l) => {
      if (!l.timestamp) return false;
      const d = l.timestamp.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
      return d >= todayStart;
    }).length;

    const week = logs.filter((l) => {
      if (!l.timestamp) return false;
      const d = l.timestamp.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
      return d >= weekStart;
    }).length;

    return { total, today, week };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (filterAction === "all") return logs;
    return logs.filter((l) => l.action === filterAction);
  }, [logs, filterAction]);

  const formatDate = (ts) => {
    if (!ts) return "--";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Unique action types from logs for the filter dropdown
  const actionTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(types).sort();
  }, [logs]);

  if (loading) {
    return (
      <div className="audit-log-loading">
        <div className="audit-log-spinner"></div>
        <span>Chargement du journal d'audit...</span>
      </div>
    );
  }

  return (
    <div className="audit-log">
      {/* KPI CARDS */}
      <div className="audit-log-kpis">
        <div className="al-kpi-card al-kpi-total">
          <div className="al-kpi-icon">&#x1F4CB;</div>
          <div className="al-kpi-info">
            <span className="al-kpi-value">{kpis.total}</span>
            <span className="al-kpi-label">Total logs</span>
          </div>
        </div>
        <div className="al-kpi-card al-kpi-today">
          <div className="al-kpi-icon">&#x1F4C5;</div>
          <div className="al-kpi-info">
            <span className="al-kpi-value">{kpis.today}</span>
            <span className="al-kpi-label">Aujourd'hui</span>
          </div>
        </div>
        <div className="al-kpi-card al-kpi-week">
          <div className="al-kpi-icon">&#x1F4C6;</div>
          <div className="al-kpi-info">
            <span className="al-kpi-value">{kpis.week}</span>
            <span className="al-kpi-label">Cette semaine</span>
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className="audit-log-toolbar">
        <select
          className="audit-log-filter"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="all">Toutes les actions</option>
          {actionTypes.map((type) => (
            <option key={type} value={type}>
              {ACTION_LABELS[type] || type}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="audit-log-table-wrapper">
        <table className="audit-log-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Utilisateur</th>
              <th>Cible</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Aucun log trouve.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="cell-date">{formatDate(log.timestamp)}</td>
                  <td>
                    <span className={`action-badge ${ACTION_COLORS[log.action] || "badge-default"}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="cell-email">{log.performedBy || "--"}</td>
                  <td>{log.targetType ? `${log.targetType}/${log.targetId || ""}` : "--"}</td>
                  <td className="cell-details">{log.details || "--"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLog;

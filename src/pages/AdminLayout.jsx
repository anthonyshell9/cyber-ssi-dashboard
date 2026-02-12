import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AdminLayout.css";

const TABS = [
  { label: "Utilisateurs", path: "/admin/utilisateurs" },
  { label: "Parametres", path: "/admin/parametres" },
  { label: "Journal d'audit", path: "/admin/audit" },
];

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="admin-layout">
      <div className="admin-layout-header">
        <h1 className="admin-layout-title">Administration</h1>
        <p className="admin-layout-subtitle">
          Gestion des utilisateurs, parametres et journal d'audit
        </p>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.path}
            className={`admin-tab ${location.pathname === tab.path ? "active" : ""}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-layout-content">{children}</div>
    </div>
  );
};

export default AdminLayout;

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useUser } from "../hooks/UserContext";
import "./DashboardLayout.css";

const menuSections = [
  {
    title: "Principal",
    items: [
      { label: "Tableau de Bord", path: "/gestion", icon: "\u2302" },
    ],
  },
  {
    title: "Fournisseurs",
    items: [
      { label: "Liste & Gestion", path: "/gestion", icon: "\u2630" },
      { label: "Nouvelle Demande", path: "/se-proposer-fournisseur", icon: "\u002B" },
      { label: "Comparer", path: "/compare", icon: "\u21C4" },
      { label: "Evaluations", path: "/evaluations", icon: "\u2605" },
    ],
  },
  {
    title: "Conformit\u00e9 DORA",
    items: [
      { label: "Registre ICT", path: "/dora-register", icon: "\u2637" },
      { label: "Risque Concentration", path: "/concentration-risk", icon: "\u26A0" },
      { label: "Strat\u00e9gies Sortie", path: "/exit-strategies", icon: "\u2794" },
      { label: "Conformit\u00e9 Contrats", path: "/contractual-compliance", icon: "\u2696" },
    ],
  },
  {
    title: "ISO 27001",
    items: [
      { label: "Matrice Risques", path: "/risk-matrix", icon: "\u25A6" },
      { label: "Contr\u00f4les", path: "/iso-controls", icon: "\u2611" },
      { label: "Programme Audits", path: "/audit-program", icon: "\u2263" },
      { label: "Suivi SLA", path: "/sla-monitoring", icon: "\u29D7" },
      { label: "D\u00e9claration SOA", path: "/soa", icon: "\u2637" },
    ],
  },
  {
    title: "Op\u00e9rations",
    items: [
      { label: "Cellule de Crise", path: "/crise", icon: "\u26A1" },
      { label: "Planning Audits", path: "/audits", icon: "\u2610" },
      { label: "Annuaire", path: "/annuaire", icon: "\u260E" },
    ],
  },
];

const ROLE_LABELS = {
  admin: "Administrateur",
  evaluateur: "Evaluateur",
  demandeur: "Demandeur",
  rssi: "Evaluateur",
};

const DashboardLayout = ({ children, setConnectedUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const role = userProfile?.role || "demandeur";
  const isRssiOrAdmin = role === "rssi" || role === "admin" || role === "evaluateur";
  const isAdmin = role === "admin";

  // Live count of pending demandes
  useEffect(() => {
    if (!isRssiOrAdmin) return;
    const q = query(
      collection(db, "demandes"),
      where("status", "==", "en_attente_rssi")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [isRssiOrAdmin]);

  // Build menu with role-based items
  const fullMenu = useMemo(() => {
    const sections = [...menuSections];

    // Role-specific sections
    const roleItems = [];

    if (role === "demandeur") {
      roleItems.push({
        title: "Mes Demandes",
        items: [
          { label: "Mes Demandes", path: "/mes-demandes", icon: "\u2709" },
        ],
      });
    }

    if (isRssiOrAdmin) {
      roleItems.push({
        title: "Demandes",
        items: [
          {
            label: "Demandes en attente",
            path: "/demandes",
            icon: "\u23F3",
            badge: true,
            badgeCount: pendingCount,
          },
        ],
      });
    }

    if (isAdmin) {
      roleItems.push({
        title: "Administration",
        items: [
          {
            label: "Administration",
            path: "/admin/utilisateurs",
            icon: "\u2699",
          },
        ],
      });
    }

    return [...sections, ...roleItems];
  }, [role, isRssiOrAdmin, isAdmin, pendingCount]);

  const handleLogout = async () => {
    await signOut(auth);
    if (setConnectedUser) setConnectedUser(null);
  };

  const isActive = (path) => {
    if (path === "/admin/utilisateurs") {
      return location.pathname.startsWith("/admin");
    }
    return location.pathname === path;
  };

  const displayName = userProfile?.displayName || "Utilisateur";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">CS</div>
          <span className="sidebar-brand-text">CYBER-SSI</span>
        </div>

        <nav className="sidebar-nav">
          {fullMenu.map((section) => (
            <div className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
                  data-tooltip={item.label}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge && item.badgeCount > 0 && (
                    <span className="sidebar-badge">{item.badgeCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-block">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role-label">{ROLE_LABELS[role] || role}</span>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
          >
            <span className="sidebar-toggle-icon">{"\u00AB"}</span>
            <span className="sidebar-toggle-label">R{"\u00e9"}duire</span>
          </button>
        </div>
      </aside>

      {/* TOPBAR */}
      <div className="topbar" style={{ left: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}>
        <div className="topbar-search">
          <span className="topbar-search-icon">{"\uD83D\uDD0D"}</span>
          <input type="text" placeholder="Rechercher..." />
        </div>

        <div className="topbar-right">
          <button className="topbar-icon-btn" title="Notifications">
            {"\uD83D\uDD14"}
            <span className="topbar-notification-dot"></span>
          </button>

          <div className="topbar-divider"></div>

          <div className="topbar-user">
            <div className="topbar-avatar">{initials}</div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{displayName}</span>
              <span className="topbar-user-role">{ROLE_LABELS[role] || role}</span>
            </div>
          </div>

          <button className="topbar-logout" onClick={handleLogout}>
            Quitter
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="layout-body" style={{ marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}>
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;

import React, { useEffect, useState, useMemo } from "react";
import { db } from "../lib/firebase";
import { secondaryAuth } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut as signOutSecondary } from "firebase/auth";
import { useUser } from "../hooks/UserContext";
import { useNotification } from "../hooks/NotificationContext";
import { logAudit } from "../lib/auditLogger";
import "./AdminUtilisateurs.css";

const ROLE_OPTIONS = [
  { value: "demandeur", label: "Demandeur" },
  { value: "evaluateur", label: "Evaluateur" },
  { value: "admin", label: "Admin" },
];

const ROLE_BADGE_CLASS = {
  admin: "role-badge-admin",
  evaluateur: "role-badge-evaluateur",
  rssi: "role-badge-evaluateur",
  demandeur: "role-badge-demandeur",
};

const ROLE_DISPLAY = {
  admin: "Admin",
  evaluateur: "Evaluateur",
  rssi: "Evaluateur",
  demandeur: "Demandeur",
};

const AdminUtilisateurs = () => {
  const { userProfile } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", displayName: "", role: "demandeur", department: "", password: "" });
  const [creating, setCreating] = useState(false);

  const { addNotification } = useNotification();

  // Real-time listener on users collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const total = users.length;
    const demandeurs = users.filter((u) => u.role === "demandeur").length;
    const evaluateurs = users.filter(
      (u) => u.role === "evaluateur" || u.role === "rssi"
    ).length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { total, demandeurs, evaluateurs, admins };
  }, [users]);

  const formatDate = (ts) => {
    if (!ts) return "--";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Edit handlers
  const openEdit = (u) => {
    setEditUser(u);
    // Normalize rssi to evaluateur for the dropdown
    setEditRole(u.role === "rssi" ? "evaluateur" : u.role || "demandeur");
    setEditDepartment(u.department || "");
  };

  const closeEdit = () => {
    setEditUser(null);
    setEditRole("");
    setEditDepartment("");
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", editUser.id), {
        role: editRole,
        department: editDepartment,
      });
      await logAudit("user_updated", userProfile?.email, "user", editUser.id, `Updated role to ${editRole} for ${editUser.email}`);
      closeEdit();
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const openDelete = (u) => {
    setDeleteTarget(u);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));
      await logAudit("user_deleted", userProfile?.email, "user", deleteTarget.id, `Deleted user ${deleteTarget.email}`);
      closeDelete();
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.displayName) return;
    setCreating(true);
    try {
      // Create in Firebase Auth via secondary app (doesn't sign out admin)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newUser.email.trim(), newUser.password);

      // Immediately sign out of secondary auth
      await signOutSecondary(secondaryAuth);

      // Create Firestore profile
      await setDoc(doc(db, "users", cred.user.uid), {
        email: newUser.email.trim(),
        displayName: newUser.displayName.trim(),
        role: newUser.role,
        department: newUser.department.trim(),
        createdAt: serverTimestamp(),
      });

      await logAudit("user_created", userProfile?.email, "user", cred.user.uid, `Created user ${newUser.email.trim()} with role ${newUser.role}`);
      addNotification("success", `Utilisateur ${newUser.email} cree avec succes.`);
      setShowCreate(false);
      setNewUser({ email: "", displayName: "", role: "demandeur", department: "", password: "" });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.code === "auth/email-already-in-use") {
        addNotification("error", "Cet email est deja utilise.");
      } else if (error.code === "auth/weak-password") {
        addNotification("error", "Le mot de passe doit contenir au moins 6 caracteres.");
      } else {
        addNotification("error", "Erreur lors de la creation: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-users-loading">
        <div className="admin-users-spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="admin-users">
      {/* HEADER */}
      <div className="admin-users-header">
        <div>
          <h1 className="admin-users-title">Gestion Utilisateurs</h1>
          <p className="admin-users-subtitle">
            Administration des profils et des roles utilisateurs
          </p>
        </div>
        <button className="btn-create-user" onClick={() => setShowCreate(true)}>
          + Creer un utilisateur
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="admin-users-kpis">
        <div className="au-kpi-card au-kpi-total">
          <div className="au-kpi-icon">&#x1F465;</div>
          <div className="au-kpi-info">
            <span className="au-kpi-value">{kpis.total}</span>
            <span className="au-kpi-label">Total utilisateurs</span>
          </div>
        </div>
        <div className="au-kpi-card au-kpi-demandeur">
          <div className="au-kpi-icon">&#x2709;</div>
          <div className="au-kpi-info">
            <span className="au-kpi-value">{kpis.demandeurs}</span>
            <span className="au-kpi-label">Demandeurs</span>
          </div>
        </div>
        <div className="au-kpi-card au-kpi-evaluateur">
          <div className="au-kpi-icon">&#x2611;</div>
          <div className="au-kpi-info">
            <span className="au-kpi-value">{kpis.evaluateurs}</span>
            <span className="au-kpi-label">Evaluateurs</span>
          </div>
        </div>
        <div className="au-kpi-card au-kpi-admin">
          <div className="au-kpi-icon">&#x2699;</div>
          <div className="au-kpi-info">
            <span className="au-kpi-value">{kpis.admins}</span>
            <span className="au-kpi-label">Admins</span>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="admin-users-table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nom</th>
              <th>Role</th>
              <th>Departement</th>
              <th>Date creation</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  Aucun utilisateur trouve.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-email">{u.email || "--"}</td>
                  <td>{u.displayName || "--"}</td>
                  <td>
                    <span
                      className={`role-badge ${ROLE_BADGE_CLASS[u.role] || "role-badge-demandeur"}`}
                    >
                      {ROLE_DISPLAY[u.role] || u.role}
                    </span>
                  </td>
                  <td>{u.department || "--"}</td>
                  <td className="cell-date">{formatDate(u.createdAt)}</td>
                  <td className="text-right">
                    <div className="au-actions">
                      <button
                        className="btn-edit-user"
                        onClick={() => openEdit(u)}
                      >
                        Modifier
                      </button>
                      {u.id !== userProfile?.id && (
                        <button
                          className="btn-delete-user"
                          onClick={() => openDelete(u)}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editUser && (
        <div className="au-modal-overlay" onClick={closeEdit}>
          <div className="au-modal" onClick={(e) => e.stopPropagation()}>
            <div className="au-modal-header">
              <h3>Modifier l'utilisateur</h3>
              <button className="au-modal-close" onClick={closeEdit}>
                &#x2715;
              </button>
            </div>
            <div className="au-modal-body">
              <div className="au-form-group">
                <label>Email</label>
                <input type="text" value={editUser.email || ""} disabled />
              </div>
              <div className="au-form-group">
                <label>Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="au-form-group">
                <label>Departement</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="Ex: Securite, IT, Finance..."
                />
              </div>
            </div>
            <div className="au-modal-footer">
              <button className="btn-modal-cancel" onClick={closeEdit}>
                Annuler
              </button>
              <button
                className="btn-modal-save"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="au-modal-overlay" onClick={closeDelete}>
          <div className="au-modal" onClick={(e) => e.stopPropagation()}>
            <div className="au-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="au-modal-close" onClick={closeDelete}>
                &#x2715;
              </button>
            </div>
            <div className="au-modal-body">
              <div className="au-delete-confirm">
                <p>
                  Supprimer l'utilisateur{" "}
                  <span className="au-delete-email">
                    {deleteTarget.email}
                  </span>{" "}
                  ?
                </p>
                <p className="au-delete-warning">
                  Cette action est irreversible.
                </p>
              </div>
            </div>
            <div className="au-modal-footer">
              <button className="btn-modal-cancel" onClick={closeDelete}>
                Annuler
              </button>
              <button
                className="btn-modal-delete"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreate && (
        <div className="au-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="au-modal" onClick={(e) => e.stopPropagation()}>
            <div className="au-modal-header">
              <h3>Creer un utilisateur</h3>
              <button className="au-modal-close" onClick={() => setShowCreate(false)}>
                &#x2715;
              </button>
            </div>
            <div className="au-modal-body">
              <div className="au-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="prenom.nom@entreprise.com"
                  required
                />
              </div>
              <div className="au-form-group">
                <label>Nom complet</label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Prenom Nom"
                  required
                />
              </div>
              <div className="au-form-group">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="au-form-group">
                <label>Departement</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="Ex: Securite, IT, Finance..."
                />
              </div>
              <div className="au-form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="au-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setShowCreate(false)}>
                Annuler
              </button>
              <button
                className="btn-modal-save"
                onClick={handleCreateUser}
                disabled={creating || !newUser.email || !newUser.displayName || !newUser.password}
              >
                {creating ? "Creation..." : "Creer l'utilisateur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUtilisateurs;

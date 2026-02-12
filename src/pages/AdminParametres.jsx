import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNotification } from "../hooks/NotificationContext";
import { useUser } from "../hooks/UserContext";
import { logAudit } from "../lib/auditLogger";
import "./AdminParametres.css";

const DEFAULT_OPTIONS = {
  equipeOptions: [
    "Developpement/IT",
    "Finance/Comptabilite",
    "Marketing/Communication",
    "Compliance/Juridique",
    "RH",
    "Direction Generale",
    "Operations",
    "Autre",
  ],
  typePrestataire: [
    "Fournisseur de services TIC",
    "Fournisseur de services Cloud (IaaS)",
    "Fournisseur de services Cloud (PaaS)",
    "Fournisseur de services Cloud (SaaS)",
    "Editeur de logiciel",
    "Fournisseur de services de donnees et d'analyse",
    "Prestataire de services de securite",
    "Fournisseur de materiel informatique",
    "Integrateur de systemes",
    "Services de conseil en TIC",
    "Fournisseur de services de reseau et telecom",
    "Fournisseur de services d'hebergement",
    "Prestataire de developpement logiciel",
    "Services de maintenance et support",
    "Fournisseur d'infrastructure physique",
    "Services de formation IT",
    "Registraire de noms de domaine",
    "Fournisseur de services de paiement",
    "Sous-traitant TIC",
    "Autre",
  ],
  donneesPerso: [
    "Donnees des employes",
    "Donnees des clients",
    "Les deux",
    "Non",
  ],
  applicationActive: [
    "Oui",
    "Non",
    "Fournisseur de substitution",
  ],
};

const SECTIONS = [
  { key: "equipeOptions", title: "Equipes Utilisatrices", placeholder: "Nouvelle equipe..." },
  { key: "typePrestataire", title: "Types de Prestataire", placeholder: "Nouveau type..." },
  { key: "donneesPerso", title: "Types de Donnees Personnelles", placeholder: "Nouvelle option..." },
  { key: "applicationActive", title: "Statuts Application Active", placeholder: "Nouveau statut..." },
];

const AdminParametres = () => {
  const { addNotification } = useNotification();
  const { userProfile } = useUser();
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newValues, setNewValues] = useState({});
  const [saving, setSaving] = useState({});

  // Fetch settings on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "formOptions"));
        if (snap.exists()) {
          // Merge with defaults so new sections always appear
          setOptions({ ...DEFAULT_OPTIONS, ...snap.data() });
        } else {
          setOptions({ ...DEFAULT_OPTIONS });
        }
      } catch (err) {
        console.error("Erreur chargement parametres:", err);
        setOptions({ ...DEFAULT_OPTIONS });
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleAdd = (sectionKey) => {
    const val = (newValues[sectionKey] || "").trim();
    if (!val) return;
    if (options[sectionKey].includes(val)) {
      addNotification("warning", "Cette option existe deja.");
      return;
    }
    setOptions((prev) => ({
      ...prev,
      [sectionKey]: [...prev[sectionKey], val],
    }));
    setNewValues((prev) => ({ ...prev, [sectionKey]: "" }));
  };

  const handleDelete = (sectionKey, index) => {
    setOptions((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (sectionKey) => {
    setSaving((prev) => ({ ...prev, [sectionKey]: true }));
    try {
      await setDoc(
        doc(db, "settings", "formOptions"),
        { [sectionKey]: options[sectionKey] },
        { merge: true }
      );
      await logAudit("settings_updated", userProfile?.email, "settings", sectionKey, `Updated ${sectionKey} options`);
      addNotification("success", "Parametres enregistres avec succes.");
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      addNotification("error", "Erreur lors de la sauvegarde.");
    } finally {
      setSaving((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  const handleKeyDown = (e, sectionKey) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(sectionKey);
    }
  };

  if (loading) {
    return (
      <div className="admin-parametres-loading">
        <div className="admin-parametres-spinner"></div>
        <span>Chargement des parametres...</span>
      </div>
    );
  }

  return (
    <div className="admin-parametres">
      <div className="admin-parametres-header">
        <h1 className="admin-parametres-title">Parametres du Formulaire</h1>
        <p className="admin-parametres-subtitle">
          Configurez les listes deroulantes utilisees dans le formulaire de demande fournisseur.
        </p>
      </div>

      <div className="admin-parametres-grid">
        {SECTIONS.map((section) => (
          <div className="param-section-card" key={section.key}>
            {/* Header */}
            <div className="param-section-header">
              <h3 className="param-section-title">{section.title}</h3>
              <span className="param-section-count">
                {options[section.key]?.length || 0} options
              </span>
            </div>

            {/* Items List */}
            <div className="param-items-list">
              {options[section.key]?.length === 0 && (
                <div className="param-empty">Aucune option configuree</div>
              )}
              {options[section.key]?.map((item, idx) => (
                <div className="param-item" key={idx}>
                  <div className="param-item-left">
                    <span className="param-item-dot"></span>
                    <span className="param-item-label" title={item}>{item}</span>
                  </div>
                  <button
                    className="param-item-delete"
                    onClick={() => handleDelete(section.key, idx)}
                    title="Supprimer"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Add Row */}
            <div className="param-add-row">
              <input
                className="param-add-input"
                type="text"
                placeholder={section.placeholder}
                value={newValues[section.key] || ""}
                onChange={(e) =>
                  setNewValues((prev) => ({ ...prev, [section.key]: e.target.value }))
                }
                onKeyDown={(e) => handleKeyDown(e, section.key)}
              />
              <button
                className="param-add-btn"
                onClick={() => handleAdd(section.key)}
                disabled={!(newValues[section.key] || "").trim()}
              >
                + Ajouter
              </button>
            </div>

            {/* Save Footer */}
            <div className="param-section-footer">
              <button
                className="param-save-btn"
                onClick={() => handleSave(section.key)}
                disabled={saving[section.key]}
              >
                {saving[section.key] ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminParametres;

import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/NotificationContext";
import "./DoraRegister.css";

const DoraRegister = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCriticality, setFilterCriticality] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "fournisseurs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFournisseurs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateField = async (id, field, value) => {
    try {
      await updateDoc(doc(db, "fournisseurs", id), { [field]: value });
      addNotification("success", `Champ ${field} mis a jour.`);
    } catch {
      addNotification("error", "Erreur lors de la mise a jour.");
    }
  };

  const filtered = fournisseurs.filter((f) => {
    const name = (f.nomFournisseur || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = name.includes(term);
    const matchesCriticality =
      filterCriticality === "all" || f.doraClassification === filterCriticality;
    return matchesSearch && matchesCriticality;
  });

  const totalVendors = fournisseurs.length;
  const criticalCount = fournisseurs.filter(
    (f) => f.doraClassification === "Critical"
  ).length;
  const withExitStrategy = fournisseurs.filter(
    (f) => f.exitStrategyStatus === "Exists"
  ).length;
  const exitPct = totalVendors > 0 ? Math.round((withExitStrategy / totalVendors) * 100) : 0;
  const compliantCount = fournisseurs.filter(
    (f) => f.doraCompliance === "Compliant"
  ).length;
  const compliancePct = totalVendors > 0 ? Math.round((compliantCount / totalVendors) * 100) : 0;

  return (
    <div className="dora-register">
      <header className="dora-register-header">
        <button onClick={() => navigate("/gestion")} className="btn-back">
          ← Retour
        </button>
        <div className="header-title">
          <h1>REGISTRE DORA</h1>
          <p>Article 28 - Registre des arrangements ICT tiers</p>
        </div>
        <div />
      </header>

      <div className="dora-summary-stats">
        <div className="dora-stat-card">
          <span className="stat-value cyan">{totalVendors}</span>
          <span className="stat-label">Total Fournisseurs</span>
        </div>
        <div className="dora-stat-card">
          <span className="stat-value red">{criticalCount}</span>
          <span className="stat-label">Critiques</span>
        </div>
        <div className="dora-stat-card">
          <span className="stat-value green">{exitPct}%</span>
          <span className="stat-label">Avec Strategie Sortie</span>
        </div>
        <div className="dora-stat-card">
          <span className="stat-value yellow">{compliancePct}%</span>
          <span className="stat-label">Conformite DORA</span>
        </div>
      </div>

      <div className="dora-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Rechercher un fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filterCriticality}
          onChange={(e) => setFilterCriticality(e.target.value)}
        >
          <option value="all">Toutes criticites</option>
          <option value="Critical">Critique</option>
          <option value="Important">Important</option>
          <option value="Standard">Standard</option>
        </select>
      </div>

      <div className="dora-table-container">
        {loading ? (
          <div className="empty-state">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">Aucun fournisseur trouve.</div>
        ) : (
          <div className="table-responsive">
            <table className="dora-table">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Service</th>
                  <th>Criticite</th>
                  <th>Debut Contrat</th>
                  <th>Fin Contrat</th>
                  <th>Localisation Donnees</th>
                  <th>Sous-traitants</th>
                  <th>Strategie Sortie</th>
                  <th>Conformite DORA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.nomFournisseur}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        {f.email}
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#a5b4fc" }}>
                      {f.typePrestataire || "-"}
                    </td>
                    <td>
                      <select
                        className="inline-select"
                        value={f.doraClassification || "Standard"}
                        onChange={(e) =>
                          updateField(f.id, "doraClassification", e.target.value)
                        }
                      >
                        <option value="Critical">Critique</option>
                        <option value="Important">Important</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        className="inline-select"
                        value={f.contractStart || ""}
                        onChange={(e) =>
                          updateField(f.id, "contractStart", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="inline-select"
                        value={f.contractEnd || ""}
                        onChange={(e) =>
                          updateField(f.id, "contractEnd", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="inline-select"
                        placeholder="ex: UE, France"
                        value={f.dataLocation || ""}
                        onChange={(e) =>
                          updateField(f.id, "dataLocation", e.target.value)
                        }
                        style={{ width: "120px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="inline-select"
                        min="0"
                        value={f.subcontractors ?? 0}
                        onChange={(e) =>
                          updateField(
                            f.id,
                            "subcontractors",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        style={{ width: "60px" }}
                      />
                    </td>
                    <td>
                      <select
                        className="inline-select"
                        value={f.exitStrategyStatus || "Missing"}
                        onChange={(e) =>
                          updateField(f.id, "exitStrategyStatus", e.target.value)
                        }
                      >
                        <option value="Exists">Existe</option>
                        <option value="Missing">Manquante</option>
                        <option value="Expired">Expiree</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="inline-select"
                        value={f.doraCompliance || "Non-compliant"}
                        onChange={(e) =>
                          updateField(f.id, "doraCompliance", e.target.value)
                        }
                      >
                        <option value="Compliant">Conforme</option>
                        <option value="Partial">Partiel</option>
                        <option value="Non-compliant">Non conforme</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoraRegister;

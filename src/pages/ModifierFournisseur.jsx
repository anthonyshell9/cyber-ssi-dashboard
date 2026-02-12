import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import "./ModifierFournisseur.css";

const ModifierFournisseur = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const docRef = doc(db, "fournisseurs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setFormData(docSnap.data());
        else navigate("/gestion");
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchDoc();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, "fournisseurs", id);
      const dataToUpdate = {
        ...formData,
        niveauConfiance: Number(formData.niveauConfiance),
        niveauDependance: Number(formData.niveauDependance),
        niveauMaturite: Number(formData.niveauMaturite || 0),
        niveauPenetration: Number(formData.niveauPenetration || 0)
      };
      await updateDoc(docRef, dataToUpdate);
      navigate(`/fournisseur/${id}`);
    } catch (error) { alert("Erreur : " + error.message); } 
    finally { setSaving(false); }
  };

  if (loading) return <div className="loader-screen"><div className="cyber-spinner"></div></div>;

  return (
    <div className="editor-layout">
      <div className="editor-bg"></div>
      
      <form onSubmit={handleSubmit} className="editor-container">
        
        {/* EN-TÊTE AVEC BOUTONS FLOTTANTS */}
        <header className="editor-header">
          <div className="header-text">
            <h1>Édition Dossier</h1>
            <p>Réf: {id}</p>
          </div>
          <div className="header-actions">
            <button type="button" onClick={() => navigate(`/fournisseur/${id}`)} className="btn-cancel">Annuler</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "..." : "💾 Enregistrer"}
            </button>
          </div>
        </header>

        {/* GRILLE DU FORMULAIRE */}
        <div className="editor-grid">
          
          {/* IDENTITÉ */}
          <div className="editor-card">
            <h3>🏢 Identité</h3>
            <div className="field-group">
              <label>Nom Entreprise</label>
              <input type="text" name="nomFournisseur" value={formData.nomFournisseur} onChange={handleChange} />
            </div>
            <div className="field-group">
              <label>Email Contact</label>
              <input type="text" name="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="field-row">
              <div className="field-group"><label>Organisation</label><input type="text" name="organisation" value={formData.organisation} onChange={handleChange} /></div>
              <div className="field-group"><label>SIRET</label><input type="text" name="siret" value={formData.siret} onChange={handleChange} /></div>
            </div>
          </div>

          {/* MISSION */}
          <div className="editor-card">
            <h3>🎯 Mission</h3>
            <div className="field-group">
              <label>Type de Prestataire</label>
              <select name="typePrestataire" value={formData.typePrestataire} onChange={handleChange}>
                <option>SaaS / Logiciel</option><option>Cloud Provider</option><option>Matériel / IoT</option><option>Autre</option>
              </select>
            </div>
            <div className="field-group">
              <label>Description</label>
              <input type="text" name="typeServiceMateriel" value={formData.typeServiceMateriel} onChange={handleChange} />
            </div>
            <div className="field-group">
              <label>Objectif Business</label>
              <textarea name="butRequete" value={formData.butRequete} onChange={handleChange} rows="3"></textarea>
            </div>
          </div>

          {/* SÉCURITÉ & JURIDIQUE */}
          <div className="editor-card">
            <h3>🛡️ Conformité</h3>
            <div className="field-row">
              <div className="field-group">
                <label>RGPD</label>
                <select name="conformiteRGPD" value={formData.conformiteRGPD} onChange={handleChange}>
                  <option>Conforme (DPA signé)</option><option>En cours</option><option>Non Conforme</option>
                </select>
              </div>
              <div className="field-group">
                <label>NDA Signé</label>
                <select name="ndaSigne" value={formData.ndaSigne} onChange={handleChange}>
                  <option>OUI</option><option>NON</option>
                </select>
              </div>
            </div>
            <div className="field-group"><label>Contact CISO</label><input type="text" name="destinataireFormulaireSecurite" value={formData.destinataireFormulaireSecurite} onChange={handleChange} /></div>
            <div className="field-group"><label>ISO 27001 / HDS</label><input type="text" name="certificationISO" value={formData.certificationISO} onChange={handleChange} /></div>
          </div>

          {/* SCORING TECHNIQUE (SECTION CLÉ) */}
          <div className="editor-card score-card-edit">
            <h3>📊 Scoring Technique (1-5)</h3>
            <div className="score-inputs-grid">
              <ScoreInput label="Confiance" name="niveauConfiance" val={formData.niveauConfiance} change={handleChange} color="#10b981" />
              <ScoreInput label="Dépendance (1-4)" name="niveauDependance" val={formData.niveauDependance} change={handleChange} color="#f59e0b" max={4} />
              <ScoreInput label="Maturité Cyber" name="niveauMaturite" val={formData.niveauMaturite || 0} change={handleChange} color="#60a5fa" />
              <ScoreInput label="Pénétration" name="niveauPenetration" val={formData.niveauPenetration || 0} change={handleChange} color="#f472b6" />
            </div>
            
            <div className="status-selector">
              <label>Statut Final</label>
              <select name="status" value={formData.status} onChange={handleChange} className={formData.status === 'validé' ? 'sel-ok' : 'sel-wait'}>
                <option value="en_attente">En Attente</option>
                <option value="validé">VALIDÉ / HOMOLOGUÉ</option>
              </select>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

const ScoreInput = ({ label, name, val, change, color, max=5 }) => (
  <div className="score-field" style={{borderColor: color}}>
    <label style={{color: color}}>{label}</label>
    <input type="number" min="1" max={max} name={name} value={val} onChange={change} />
  </div>
);

export default ModifierFournisseur;
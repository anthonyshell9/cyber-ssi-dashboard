import React, { useState } from "react";
import "./AjouterFournisseur.css";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ScoreCalculator from "../components/ScoreCalculator";

const TOTAL_STEPS = 11;

const AjouterFournisseur = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [isSuccess, setIsSuccess] = useState(false);
  const [showScoreCalc, setShowScoreCalc] = useState(false);

  const [formData, setFormData] = useState({
    nomFournisseur: "", email: "", organisation: "", siret: "", 
    typePrestataire: "", typeServiceMateriel: "", butRequete: "", zoneIntervention: "",
    accesDonneesPersonnelles: "", conformiteRGPD: "", natureDonneesSortantes: "", hebergementDonnees: "",
    actifsRelai: "", destinataireFormulaireSecurite: "", certificationISO: "", ndaSigne: "",
    actionCISO: "", planReprise: "", niveauConfiance: "", niveauDependance: "",
  });

  const stepImages = {
    1: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop", 
    2: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1920&auto=format&fit=crop", 
    3: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1920&auto=format&fit=crop", 
    4: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1920&auto=format&fit=crop", 
    5: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1920&auto=format&fit=crop", 
    6: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1920&auto=format&fit=crop", 
    7: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1920&auto=format&fit=crop", 
    8: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1920&auto=format&fit=crop", 
    9: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1920&auto=format&fit=crop", 
    10: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1920&auto=format&fit=crop", 
    11: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1920&auto=format&fit=crop" 
  };

  const stepDetails = {
    1: { title: "Identité", subtitle: "Commençons par les bases.", icon: "🏢" },
    2: { title: "Juridique", subtitle: "Structure & Entité.", icon: "⚖️" },
    3: { title: "Service", subtitle: "Nature de la prestation.", icon: "🛠️" },
    4: { title: "Contexte", subtitle: "Pourquoi ce besoin ?", icon: "🎯" },
    5: { title: "Données", subtitle: "Aspects RGPD & Privacy.", icon: "🔒" },
    6: { title: "Hébergement", subtitle: "Localisation des data.", icon: "🌍" },
    7: { title: "Sécurité", subtitle: "Infra & Contact CISO.", icon: "🛡️" },
    8: { title: "Conformité", subtitle: "Certifications & NDA.", icon: "📜" },
    9: { title: "Résilience", subtitle: "Continuité d'activité.", icon: "⚡" },
    10: { title: "Scoring", subtitle: "Évaluation des risques.", icon: "📊" },
    11: { title: "Validation", subtitle: "Récapitulatif final.", icon: "✅" },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleScoreSelect = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const triggerNotify = (msg, type = "success") => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 4000);
  };

  const requiredFieldsByStep = {
    1: ["nomFournisseur", "email"],
    2: ["organisation", "siret"],
    3: ["typePrestataire", "typeServiceMateriel"],
    4: ["butRequete", "zoneIntervention"],
    5: ["accesDonneesPersonnelles", "conformiteRGPD"],
    6: ["natureDonneesSortantes", "hebergementDonnees"],
    7: ["actifsRelai", "destinataireFormulaireSecurite"],
    8: ["certificationISO", "ndaSigne"],
    9: ["actionCISO", "planReprise"],
    10: ["niveauConfiance", "niveauDependance"],
    11: [],
  };

  const isStepValid = () => requiredFieldsByStep[step].every(f => formData[f] && formData[f].toString().trim() !== "");
  const next = () => { if (step < TOTAL_STEPS && isStepValid()) setStep(step + 1); };
  const prev = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "fournisseurs"), {
        ...formData,
        niveauConfiance: Number(formData.niveauConfiance),
        niveauDependance: Number(formData.niveauDependance),
        niveauMaturite: Number(formData.niveauMaturite || 0),
        doraReadiness: Number(formData.doraReadiness || 0),
        isoMaturity: Number(formData.isoMaturity || 0),
        lastEvaluation: new Date().toISOString(),
        createdAt: serverTimestamp(),
        status: "en_attente",
      });
      setIsSuccess(true);
    } catch (error) {
      triggerNotify("Erreur technique lors de l'envoi.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setStep(1);
    setFormData(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: "" }), {}));
  };

  if (isSuccess) {
    return (
      <div className="split-layout success-mode">
        <div className="success-content scale-in">
          <div className="huge-icon">🎉</div>
          <h1>Dossier Validé !</h1>
          <p>Le fournisseur a été ajouté à la base de surveillance Cyber.</p>
          <button className="btn-primary" onClick={resetForm}>Ajouter un autre</button>
        </div>
      </div>
    );
  }

  return (
    <div className="split-layout">
      {notification.show && <div className={`toast ${notification.type}`}>{notification.message}</div>}

      {/* GAUCHE (FIXE) */}
      <div className="left-panel">
        <img src={stepImages[step]} alt="" className="panel-bg-image" key={step} />
        <div className="panel-overlay"></div>
        <div className="panel-content">
          <div className="step-display"><span className="step-number">{step}</span><span className="step-total">/ {TOTAL_STEPS}</span></div>
          <div className="step-info-anim key-{step}">
            <div className="step-icon">{stepDetails[step].icon}</div>
            <h2 className="step-title-large">{stepDetails[step].title}</h2>
            <p className="step-subtitle">{stepDetails[step].subtitle}</p>
          </div>
          <div className="progress-bar-vertical"><div className="progress-fill-vertical" style={{ height: `${(step / TOTAL_STEPS) * 100}%` }}></div></div>
        </div>
      </div>

      {/* DROITE (SCROLLABLE) */}
      {/* Modification ICI : Ajout de la classe 'align-top' si step === 10 */}
      <div className={`right-panel ${step === 10 ? 'align-top' : ''}`}>
        
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            
            <div key={step} className="form-slide slide-in-up">
              
              {/* HEADER CYBER SSI */}
              {step !== 10 && (
                <div className="welcome-header">
                  <h2 className="cyber-brand-title">
                    CYBER SSI
                    <span className="title-icon">☁️</span>
                  </h2>
                  {step === 1 && (
                    <p className="welcome-msg">Bienvenue. Veuillez renseigner les informations du nouveau fournisseur.</p>
                  )}
                </div>
              )}

              {step === 1 && (<><Input label="Nom de l'entreprise" name="nomFournisseur" val={formData.nomFournisseur} change={handleChange} placeholder="Ex: Microsoft Corp" autoFocus /><Input label="Email de contact" name="email" type="email" val={formData.email} change={handleChange} placeholder="contact@entreprise.com" /></>)}
              {step === 2 && (<><Select label="Votre Entité" name="organisation" val={formData.organisation} change={handleChange} opts={["Afrique Globale", "Europe", "Asie"]} /><Input label="Numéro SIRET / ID" name="siret" val={formData.siret} change={handleChange} placeholder="Identifiant unique..." /></>)}
              {step === 3 && (<><Select label="Type de Prestataire" name="typePrestataire" val={formData.typePrestataire} change={handleChange} opts={["SaaS / Logiciel", "Cloud Provider", "Développement", "Matériel / IoT"]} /><Input label="Description du Service" name="typeServiceMateriel" val={formData.typeServiceMateriel} change={handleChange} placeholder="Ex: CRM Marketing..." /></>)}
              {step === 4 && (<><TextArea label="Objectif Business" name="butRequete" val={formData.butRequete} change={handleChange} placeholder="Pourquoi avons-nous besoin de ce fournisseur ?" /><Input label="Zone Géographique" name="zoneIntervention" val={formData.zoneIntervention} change={handleChange} placeholder="Ex: Monde, France..." /></>)}
              {step === 5 && (<><Select label="Accès Données Personnelles ?" name="accesDonneesPersonnelles" val={formData.accesDonneesPersonnelles} change={handleChange} opts={["NON - Aucune donnée", "OUI - Consultation", "OUI - Stockage"]} /><Select label="Conformité RGPD" name="conformiteRGPD" val={formData.conformiteRGPD} change={handleChange} opts={["Conforme (DPA signé)", "En cours", "Non Conforme"]} /></>)}
              {step === 6 && (<><Input label="Sensibilité Données Sortantes" name="natureDonneesSortantes" val={formData.natureDonneesSortantes} change={handleChange} placeholder="Ex: Bancaires, Santé, Publiques..." /><Select label="Pays d'Hébergement" name="hebergementDonnees" val={formData.hebergementDonnees} change={handleChange} opts={["France", "Union Européenne", "USA", "Autre"]} /></>)}
              {step === 7 && (<><Input label="Actifs & Connexions" name="actifsRelai" val={formData.actifsRelai} change={handleChange} placeholder="VPN, API, Bastion..." /><Input label="Email CISO (Sécurité)" name="destinataireFormulaireSecurite" type="email" val={formData.destinataireFormulaireSecurite} change={handleChange} placeholder="security@fournisseur.com" /></>)}
              {step === 8 && (<><Input label="Certifications (ISO, HDS)" name="certificationISO" val={formData.certificationISO} change={handleChange} placeholder="Ex: ISO 27001" /><Select label="NDA Signé ?" name="ndaSigne" val={formData.ndaSigne} change={handleChange} opts={["OUI", "NON"]} /></>)}
              {step === 9 && (<><Input label="Action Sécurité Requise" name="actionCISO" val={formData.actionCISO} change={handleChange} placeholder="Audit, PAS, Questionnaire..." /><Input label="Continuité (RTO/RPO)" name="planReprise" val={formData.planReprise} change={handleChange} placeholder="Ex: RTO < 4h" /></>)}

              {/* ETAPE 10 : SCORING AVEC ASSISTANT IA */}
              {step === 10 && (
                <div className="scoring-wrapper">
                  {/* Bouton pour lancer l'évaluation assistée */}
                  <div style={{textAlign: 'center', marginBottom: '25px'}}>
                    <button type="button" onClick={() => setShowScoreCalc(true)} style={{
                      background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', color: 'white', border: 'none',
                      padding: '14px 28px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold',
                      cursor: 'pointer', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
                    }}>
                      Lancer l'Evaluation Assistee (DORA + ISO)
                    </button>
                    <p style={{color: '#94a3b8', fontSize: '0.85rem', marginTop: '10px'}}>Calcule automatiquement Confiance, DORA Readiness et Maturite ISO 27001</p>
                  </div>

                  {/* Affichage des scores calculés (si remplis) */}
                  {formData.niveauConfiance && (
                    <div style={{display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap'}}>
                      <div style={{background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '15px 25px', textAlign: 'center'}}>
                        <div style={{color: '#94a3b8', fontSize: '0.8rem'}}>Confiance</div>
                        <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: Number(formData.niveauConfiance) >= 4 ? '#10b981' : Number(formData.niveauConfiance) >= 3 ? '#f59e0b' : '#ef4444'}}>{formData.niveauConfiance}/5</div>
                      </div>
                      <div style={{background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '15px 25px', textAlign: 'center'}}>
                        <div style={{color: '#94a3b8', fontSize: '0.8rem'}}>Dependance</div>
                        <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: Number(formData.niveauDependance) <= 2 ? '#10b981' : '#f59e0b'}}>{formData.niveauDependance}/4</div>
                      </div>
                      {formData.doraReadiness !== undefined && (
                        <div style={{background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '15px 25px', textAlign: 'center'}}>
                          <div style={{color: '#94a3b8', fontSize: '0.8rem'}}>DORA Readiness</div>
                          <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: formData.doraReadiness >= 70 ? '#10b981' : formData.doraReadiness >= 40 ? '#f59e0b' : '#ef4444'}}>{formData.doraReadiness}%</div>
                        </div>
                      )}
                      {formData.isoMaturity !== undefined && (
                        <div style={{background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '15px 25px', textAlign: 'center'}}>
                          <div style={{color: '#94a3b8', fontSize: '0.8rem'}}>ISO 27001</div>
                          <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: formData.isoMaturity >= 4 ? '#10b981' : formData.isoMaturity >= 3 ? '#f59e0b' : '#ef4444'}}>{formData.isoMaturity}/5</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback manuel */}
                  <div style={{borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '10px'}}>
                    <p style={{color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px'}}>Ou saisie manuelle :</p>
                    <div className="score-section">
                      <h3>Niveau de Confiance</h3>
                      <div className="cards-row">{[1, 2, 3, 4, 5].map(n => (<div key={n} className={`score-card c-${n} ${formData.niveauConfiance == n ? 'active' : ''}`} onClick={() => handleScoreSelect('niveauConfiance', n)}>{n}</div>))}</div>
                    </div>
                    <div className="score-section">
                      <h3>Niveau de Dependance</h3>
                      <div className="cards-row">{[1, 2, 3, 4].map(n => (<div key={n} className={`score-card d-${n} ${formData.niveauDependance == n ? 'active' : ''}`} onClick={() => handleScoreSelect('niveauDependance', n)}>{n}</div>))}</div>
                    </div>
                  </div>

                  {/* Modal ScoreCalculator */}
                  {showScoreCalc && (
                    <ScoreCalculator
                      onClose={() => setShowScoreCalc(false)}
                      onApply={(scores) => {
                        setFormData(prev => ({
                          ...prev,
                          niveauConfiance: scores.niveauConfiance,
                          niveauDependance: scores.niveauDependance,
                          niveauMaturite: scores.niveauMaturite,
                          niveauPenetration: scores.niveauPenetration,
                          doraReadiness: scores.doraReadiness,
                          isoMaturity: scores.isoMaturity,
                        }));
                        setShowScoreCalc(false);
                      }}
                    />
                  )}
                </div>
              )}

              {step === 11 && (
                <div className="recap-wrapper">
                  <h3>Récapitulatif</h3>
                  <div className="recap-grid">{Object.entries(formData).map(([k, v]) => (<div key={k} className="recap-item"><label>{k}</label><span>{v || "—"}</span></div>))}</div>
                </div>
              )}
            </div>

            <div className="form-actions">
              {step > 1 ? <button type="button" className="btn-ghost" onClick={prev}>Retour</button> : <div></div>}
              {step < TOTAL_STEPS ? (
                <button type="button" className="btn-primary" disabled={!isStepValid()} onClick={next}>Continuer →</button>
              ) : (
                <button type="submit" className="btn-submit" disabled={loading}>{loading ? "Envoi..." : "Valider le Dossier"}</button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, name, val, change, placeholder, type="text", autoFocus=false }) => (
  <div className="field-block"><label>{label}</label><input type={type} name={name} value={val} onChange={change} placeholder={placeholder} autoFocus={autoFocus} /></div>
);
const TextArea = ({ label, name, val, change, placeholder }) => (
  <div className="field-block"><label>{label}</label><textarea name={name} value={val} onChange={change} placeholder={placeholder} /></div>
);
const Select = ({ label, name, val, change, opts }) => (
  <div className="field-block"><label>{label}</label><select name={name} value={val} onChange={change}><option value="">Sélectionner...</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
);

export default AjouterFournisseur;
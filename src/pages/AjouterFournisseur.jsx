import React, { useState, useEffect, useMemo } from "react";
import "./AjouterFournisseur.css";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const TOTAL_STEPS = 6;

const EQUIPE_OPTIONS = [
  "Developpement/IT",
  "Finance/Comptabilite",
  "Marketing/Communication",
  "Compliance/Juridique",
  "RH",
  "Direction Generale",
  "Operations",
  "Autre",
];

const TYPE_PRESTATAIRE_OPTIONS = [
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
];

const DONNEES_PERSO_OPTIONS = [
  "Donnees des employes",
  "Donnees des clients",
  "Les deux",
  "Non",
];

const APPLICATION_ACTIVE_OPTIONS = [
  "Oui",
  "Non",
  "Fournisseur de substitution",
];

// EBIOS RM - Echelles 1-4
const DEPENDANCE_LEVELS = [
  { value: 1, label: "Faible", desc: "Service non critique, alternatives disponibles" },
  { value: 2, label: "Moderee", desc: "Service utile, remplacement possible sous 3 mois" },
  { value: 3, label: "Elevee", desc: "Service important, remplacement difficile" },
  { value: 4, label: "Critique", desc: "Service vital, pas d'alternative immediate" },
];

const PENETRATION_LEVELS = [
  { value: 1, label: "Faible", desc: "Aucun acces aux systemes internes" },
  { value: 2, label: "Moderee", desc: "Acces limite a des donnees non sensibles" },
  { value: 3, label: "Elevee", desc: "Acces a des donnees sensibles" },
  { value: 4, label: "Critique", desc: "Acces privilegie aux systemes critiques" },
];

const MATURITE_LEVELS = [
  { value: 1, label: "Faible", desc: "Mesures basiques, pas de certification" },
  { value: 2, label: "Partielle", desc: "Processus en cours de formalisation" },
  { value: 3, label: "Maitrisee", desc: "Politiques documentees, audits reguliers" },
  { value: 4, label: "Exemplaire", desc: "Certifications multiples, maturite avancee" },
];

const CONFIANCE_LEVELS = [
  { value: 1, label: "Faible", desc: "Fournisseur inconnu, pas de references" },
  { value: 2, label: "Moderee", desc: "Peu de visibilite, references limitees" },
  { value: 3, label: "Elevee", desc: "Partenaire reconnu, historique positif" },
  { value: 4, label: "Tres elevee", desc: "Partenaire strategique, certifie, audite" },
];

const stepImages = {
  1: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
  2: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1920&auto=format&fit=crop",
  3: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1920&auto=format&fit=crop",
  4: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1920&auto=format&fit=crop",
  5: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1920&auto=format&fit=crop",
  6: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1920&auto=format&fit=crop",
};

const stepDetails = {
  1: { title: "Demandeur", subtitle: "Qui effectue la demande ?", icon: "\u{1F464}" },
  2: { title: "Fournisseur", subtitle: "Identite du prestataire.", icon: "\u{1F3E2}" },
  3: { title: "Service", subtitle: "Application & service fourni.", icon: "\u{1F6E0}\uFE0F" },
  4: { title: "Donnees", subtitle: "Acces & flux de donnees.", icon: "\u{1F512}" },
  5: { title: "Remarques", subtitle: "Informations complementaires.", icon: "\u{1F4CB}" },
  6: { title: "Validation", subtitle: "Recapitulatif final.", icon: "\u2705" },
};

const computeRiskScore = (dep, pen, mat, conf) => {
  if (!mat || !conf) return { note: null, interpretation: "Non calculable", color: "gray" };
  const note = (dep * pen) / (mat * conf);
  let interpretation, color;
  if (note < 1) { interpretation = "FAVORABLE"; color = "green"; }
  else if (note === 1) { interpretation = "EQUILIBREE"; color = "amber"; }
  else if (note <= 2) { interpretation = "A RISQUE"; color = "orange"; }
  else { interpretation = "CRITIQUE"; color = "red"; }
  return { note: Math.round(note * 100) / 100, interpretation, color };
};

const AjouterFournisseur = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [isSuccess, setIsSuccess] = useState(false);

  const [dynamicOptions, setDynamicOptions] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "formOptions"));
        if (snap.exists()) setDynamicOptions(snap.data());
      } catch (e) { /* use defaults */ }
    };
    fetchOptions();
  }, []);

  const [formData, setFormData] = useState({
    // Step 1 - Demandeur
    emailDemandeur: "",
    equipUtilisatrice: "",
    detailDemande: "",
    integrationOuRetrait: "",
    dependance: "",
    // Step 2 - Identite Fournisseur
    nomFournisseur: "",
    emailFournisseur: "",
    typePrestataire: "",
    produitImpacte: "",
    // Step 3 - Service & Application
    typeServiceMateriel: "",
    nomApplication: "",
    applicationActive: "",
    donneesPersonnelles: "",
    // Step 4 - Donnees & Acces
    accesFournisseurSystemes: "",
    donneesEntrantes: "",
    donneesSortantes: "",
    actifsCommunicants: "",
    emailFormulaireSecurite: "",
    // Step 5 - Remarques
    remarques: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScoreSelect = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const triggerNotify = (msg, type = "success") => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 4000);
  };

  const requiredFieldsByStep = {
    1: ["emailDemandeur", "equipUtilisatrice", "integrationOuRetrait", "dependance"],
    2: ["nomFournisseur", "typePrestataire"],
    3: ["typeServiceMateriel", "applicationActive"],
    4: [],
    5: [],
    6: [],
  };

  const isStepValid = () => {
    const required = requiredFieldsByStep[step];
    return required.every((f) => formData[f] !== undefined && formData[f].toString().trim() !== "");
  };

  const next = () => { if (step < TOTAL_STEPS && isStepValid()) setStep(step + 1); };
  const prev = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "demandes"), {
        ...formData,
        dependance: Number(formData.dependance),
        status: "en_attente_rssi",
        demandeurEmail: formData.emailDemandeur,
        createdAt: serverTimestamp(),
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
          <div className="huge-icon">{"\u{1F389}"}</div>
          <h1>Demande Soumise !</h1>
          <p>Votre demande a ete transmise et est en attente de validation.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={resetForm}>Nouvelle Demande</button>
            <button className="btn-ghost" onClick={() => navigate("/gestion")}>Retour au tableau de bord</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="split-layout">
      {notification.show && <div className={`toast ${notification.type}`}>{notification.message}</div>}

      {/* LEFT PANEL */}
      <div className="left-panel">
        <img src={stepImages[step]} alt="" className="panel-bg-image" key={step} />
        <div className="panel-overlay"></div>
        <div className="panel-content">
          <div className="step-display">
            <span className="step-number">{step}</span>
            <span className="step-total">/ {TOTAL_STEPS}</span>
          </div>
          <div className="step-info-anim" key={`info-${step}`}>
            <div className="step-icon">{stepDetails[step].icon}</div>
            <h2 className="step-title-large">{stepDetails[step].title}</h2>
            <p className="step-subtitle">{stepDetails[step].subtitle}</p>
          </div>
          <div className="progress-bar-vertical">
            <div className="progress-fill-vertical" style={{ height: `${(step / TOTAL_STEPS) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={`right-panel ${step === 6 ? "align-top" : ""}`}>
        <div className="form-container">
          <div className="form-cancel-bar">
            <button type="button" className="btn-cancel-link" onClick={() => navigate("/gestion")}>
              &larr; Annuler
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div key={step} className="form-slide slide-in-up">

              {/* HEADER */}
              {step !== 6 && (
                <div className="welcome-header">
                  <h2 className="cyber-brand-title">
                    Demande Fournisseur
                    <span className="title-icon">{"\u{1F6E1}\uFE0F"}</span>
                  </h2>
                  {step === 1 && (
                    <p className="welcome-msg">Formulaire de referencement et d'evaluation des fournisseurs.</p>
                  )}
                </div>
              )}

              {/* STEP 1 - Demandeur */}
              {step === 1 && (
                <>
                  <Input label="Email du Demandeur" name="emailDemandeur" type="email" val={formData.emailDemandeur} change={handleChange} placeholder="prenom.nom@entreprise.com" autoFocus />
                  <Select label="Equipe Utilisatrice" name="equipUtilisatrice" val={formData.equipUtilisatrice} change={handleChange} opts={dynamicOptions?.equipeOptions || EQUIPE_OPTIONS} />
                  <Select label="Integration ou Retrait" name="integrationOuRetrait" val={formData.integrationOuRetrait} change={handleChange} opts={dynamicOptions?.integrationOptions || ["Integration", "Retrait"]} />
                  <TextArea label="Detail de la Demande (optionnel)" name="detailDemande" val={formData.detailDemande} change={handleChange} placeholder="Expliquez le besoin metier justifiant cette demande..." />

                  <div className="score-dimension">
                    <h3 className="dimension-label">Niveau de Dependance <span className="dimension-range">(1-4)</span></h3>
                    <div className="dimension-cards">
                      {DEPENDANCE_LEVELS.map((level) => (
                        <div key={level.value}
                          className={`dimension-card dep-${level.value} ${Number(formData.dependance) === level.value ? "active" : ""}`}
                          onClick={() => handleScoreSelect("dependance", level.value)}>
                          <div className="dc-value">{level.value}</div>
                          <div className="dc-label">{level.label}</div>
                          <div className="dc-desc">{level.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2 - Identite Fournisseur */}
              {step === 2 && (
                <>
                  <Input label="Nom du Fournisseur" name="nomFournisseur" val={formData.nomFournisseur} change={handleChange} placeholder="Ex: Microsoft Corp" autoFocus />
                  <Input label="Email du Fournisseur" name="emailFournisseur" type="email" val={formData.emailFournisseur} change={handleChange} placeholder="contact@fournisseur.com" />
                  <Select label="Type de Prestataire" name="typePrestataire" val={formData.typePrestataire} change={handleChange} opts={dynamicOptions?.typePrestataire || TYPE_PRESTATAIRE_OPTIONS} />
                  <Input label="Produit / Service Impacte" name="produitImpacte" val={formData.produitImpacte} change={handleChange} placeholder="Produit ou service interne concerne..." />
                </>
              )}

              {/* STEP 3 - Service & Application */}
              {step === 3 && (
                <>
                  <Input label="Type de Service / Materiel" name="typeServiceMateriel" val={formData.typeServiceMateriel} change={handleChange} placeholder="Ex: CRM, Serveur, Firewall..." autoFocus />
                  <Input label="Nom de l'Application" name="nomApplication" val={formData.nomApplication} change={handleChange} placeholder="Nom de l'application fournie..." />
                  <Select label="Application Active" name="applicationActive" val={formData.applicationActive} change={handleChange} opts={dynamicOptions?.applicationActive || APPLICATION_ACTIVE_OPTIONS} />
                  <Select label="Donnees Personnelles" name="donneesPersonnelles" val={formData.donneesPersonnelles} change={handleChange} opts={dynamicOptions?.donneesPerso || DONNEES_PERSO_OPTIONS} />
                </>
              )}

              {/* STEP 4 - Donnees & Acces */}
              {step === 4 && (
                <>
                  <TextArea label="Acces Fournisseur aux Systemes" name="accesFournisseurSystemes" val={formData.accesFournisseurSystemes} change={handleChange} placeholder="Decrivez les acces du fournisseur a vos systemes (VPN, API, Bastion...)" />
                  <TextArea label="Donnees Entrantes" name="donneesEntrantes" val={formData.donneesEntrantes} change={handleChange} placeholder="Description des donnees recues du fournisseur..." />
                  <TextArea label="Donnees Sortantes" name="donneesSortantes" val={formData.donneesSortantes} change={handleChange} placeholder="Description des donnees transmises au fournisseur..." />
                  <TextArea label="Actifs Communicants" name="actifsCommunicants" val={formData.actifsCommunicants} change={handleChange} placeholder="Serveurs, bases, applications communicant avec le fournisseur..." />
                  <Input label="Email Formulaire Securite" name="emailFormulaireSecurite" type="email" val={formData.emailFormulaireSecurite} change={handleChange} placeholder="security@fournisseur.com" />
                </>
              )}

              {/* STEP 5 - Remarques */}
              {step === 5 && (
                <>
                  <TextArea label="Remarques" name="remarques" val={formData.remarques} change={handleChange} placeholder="Commentaires additionnels, contexte, precisions..." />
                </>
              )}

              {/* STEP 6 - Recapitulatif */}
              {step === 6 && (
                <div className="recap-wrapper">
                  <h2 className="recap-main-title">Recapitulatif de la Demande</h2>

                  <div className="recap-sections">
                    <RecapSection title="Demandeur" fields={[
                      { key: "emailDemandeur", label: "Email" },
                      { key: "equipUtilisatrice", label: "Equipe" },
                      { key: "integrationOuRetrait", label: "Type" },
                      { key: "detailDemande", label: "Detail" },
                      { key: "dependance", label: "Dependance" },
                    ]} data={formData} />
                    <RecapSection title="Fournisseur" fields={[
                      { key: "nomFournisseur", label: "Nom" },
                      { key: "emailFournisseur", label: "Email" },
                      { key: "typePrestataire", label: "Type Prestataire" },
                      { key: "produitImpacte", label: "Produit Impacte" },
                    ]} data={formData} />
                    <RecapSection title="Service & Application" fields={[
                      { key: "typeServiceMateriel", label: "Service/Materiel" },
                      { key: "nomApplication", label: "Application" },
                      { key: "applicationActive", label: "Active" },
                      { key: "donneesPersonnelles", label: "Donnees Perso." },
                    ]} data={formData} />
                    <RecapSection title="Donnees & Acces" fields={[
                      { key: "accesFournisseurSystemes", label: "Acces Systemes" },
                      { key: "donneesEntrantes", label: "Donnees Entrantes" },
                      { key: "donneesSortantes", label: "Donnees Sortantes" },
                      { key: "actifsCommunicants", label: "Actifs Communicants" },
                      { key: "emailFormulaireSecurite", label: "Email Securite" },
                    ]} data={formData} />
                    <RecapSection title="Remarques" fields={[
                      { key: "remarques", label: "Remarques" },
                    ]} data={formData} />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="form-actions">
              {step > 1 ? (
                <button type="button" className="btn-ghost" onClick={prev}>Retour</button>
              ) : <div></div>}
              {step < TOTAL_STEPS ? (
                <button type="button" className="btn-primary" disabled={!isStepValid()} onClick={next}>Continuer {"\u2192"}</button>
              ) : (
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Envoi en cours..." : "Soumettre la Demande"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* Sub-components */
const Input = ({ label, name, val, change, placeholder, type = "text", autoFocus = false }) => (
  <div className="field-block">
    <label>{label}</label>
    <input type={type} name={name} value={val} onChange={change} placeholder={placeholder} autoFocus={autoFocus} />
  </div>
);

const TextArea = ({ label, name, val, change, placeholder }) => (
  <div className="field-block">
    <label>{label}</label>
    <textarea name={name} value={val} onChange={change} placeholder={placeholder} />
  </div>
);

const Select = ({ label, name, val, change, opts }) => (
  <div className="field-block">
    <label>{label}</label>
    <select name={name} value={val} onChange={change}>
      <option value="">Selectionner...</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const RecapSection = ({ title, fields, data }) => (
  <div className="recap-section">
    <h4 className="recap-section-title">{title}</h4>
    <div className="recap-grid">
      {fields.map(({ key, label }) => (
        <div key={key} className="recap-item">
          <label>{label}</label>
          <span>{data[key] !== "" && data[key] !== undefined ? String(data[key]) : "\u2014"}</span>
        </div>
      ))}
    </div>
  </div>
);

export default AjouterFournisseur;

import React, { useState } from 'react';
import './ScoreCalculator.css';

const ScoreCalculator = ({ onClose, onApply }) => {
  // Questions et pondération
  const [answers, setAnswers] = useState({
    certif: false,    // A-t-il ISO 27001 ? (+2)
    france: false,    // Hébergé en France ? (+1)
    rgpd: false,      // RGPD conforme ? (+1)
    critique: false,  // Service critique ? (Dépendance +2)
    backup: false,    // A-t-il des backups ? (+1)
    incident: false   // Incident récent ? (-2)
  });

  const toggle = (key) => setAnswers({ ...answers, [key]: !answers[key] });

  const calculate = () => {
    let confiance = 1; // Base
    if (answers.certif) confiance += 2;
    if (answers.france) confiance += 1;
    if (answers.rgpd) confiance += 1;
    if (answers.backup) confiance += 1;
    if (answers.incident) confiance -= 2;
    
    // Bornes 1 à 5
    if (confiance > 5) confiance = 5;
    if (confiance < 1) confiance = 1;

    let dependance = 1;
    if (answers.critique) dependance += 2;
    if (!answers.backup) dependance += 1; // Pas de backup = forte dépendance
    if (dependance > 4) dependance = 4;

    // Renvoie les résultats au parent
    onApply({
      niveauConfiance: confiance,
      niveauDependance: dependance,
      niveauMaturite: answers.certif ? 4 : 2, // Estimation simple
      niveauPenetration: 3 // Valeur moyenne par défaut
    });
  };

  return (
    <div className="calc-overlay">
      <div className="calc-modal">
        <h3>🤖 Assistant Scoring IA</h3>
        <p>Répondez aux critères pour calculer le risque.</p>
        
        <div className="calc-questions">
          <label className="switch-row">
            <span>Possède une certification (ISO 27001, HDS...)</span>
            <input type="checkbox" checked={answers.certif} onChange={() => toggle('certif')} />
          </label>
          <label className="switch-row">
            <span>Hébergement des données en France/UE</span>
            <input type="checkbox" checked={answers.france} onChange={() => toggle('france')} />
          </label>
          <label className="switch-row">
            <span>Conformité RGPD validée (DPA signé)</span>
            <input type="checkbox" checked={answers.rgpd} onChange={() => toggle('rgpd')} />
          </label>
          <label className="switch-row">
            <span>Plan de Continuité / Backups testés</span>
            <input type="checkbox" checked={answers.backup} onChange={() => toggle('backup')} />
          </label>
          <div className="divider"></div>
          <label className="switch-row">
            <span>Service critique pour l'entreprise (Arrêt bloquant)</span>
            <input type="checkbox" checked={answers.critique} onChange={() => toggle('critique')} />
          </label>
          <label className="switch-row danger">
     <label className="switch-row danger">
            <span>Incident de sécurité connu &lt; 12 mois</span>
            <input type="checkbox" checked={answers.incident} onChange={() => toggle('incident')} />
          </label>
            <input type="checkbox" checked={answers.incident} onChange={() => toggle('incident')} />
          </label>
        </div>

        <div className="calc-actions">
          <button onClick={onClose} className="btn-cancel">Annuler</button>
          <button onClick={calculate} className="btn-apply">Calculer & Appliquer</button>
        </div>
      </div>
    </div>
  );
};

export default ScoreCalculator;
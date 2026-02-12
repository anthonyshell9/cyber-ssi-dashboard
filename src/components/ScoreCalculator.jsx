import React, { useState } from 'react';
import './ScoreCalculator.css';

const ScoreCalculator = ({ onClose, onApply }) => {
  const [answers, setAnswers] = useState({
    certif: false,       // ISO 27001 / HDS / SecNumCloud (+2 confiance)
    france: false,       // Heberge en France/UE (+1)
    rgpd: false,         // RGPD conforme (+1)
    critique: false,     // Service critique (Dependance +2)
    backup: false,       // Plan de continuite / Backups (+1)
    incident: false,     // Incident recent (-2)
    nda: false,          // NDA signe (+1)
    audits: false,       // Audits reguliers (+1)
    exitStrategy: false, // Strategie de sortie DORA (+1)
  });
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores] = useState(null);

  const toggle = (key) => setAnswers({ ...answers, [key]: !answers[key] });

  const calculate = () => {
    // --- Confiance (1-5) ---
    let confiance = 1;
    if (answers.certif) confiance += 2;
    if (answers.france) confiance += 1;
    if (answers.rgpd) confiance += 1;
    if (answers.backup) confiance += 1;
    if (answers.nda) confiance += 1;
    if (answers.incident) confiance -= 2;
    confiance = Math.max(1, Math.min(5, confiance));

    // --- Dependance (1-4) ---
    let dependance = 1;
    if (answers.critique) dependance += 2;
    if (!answers.backup) dependance += 1;
    dependance = Math.max(1, Math.min(4, dependance));

    // --- DORA Readiness (0-100) ---
    let doraPoints = 0;
    const doraMax = 9;
    if (answers.certif) doraPoints += 2;
    if (answers.backup) doraPoints += 1;
    if (answers.exitStrategy) doraPoints += 2;
    if (answers.audits) doraPoints += 1;
    if (answers.nda) doraPoints += 1;
    if (!answers.incident) doraPoints += 1;
    if (!answers.critique || answers.backup) doraPoints += 1;
    const doraReadiness = Math.round((doraPoints / doraMax) * 100);

    // --- ISO 27001 Maturity (1-5) ---
    let isoScore = 1;
    if (answers.certif) isoScore += 2;
    if (answers.rgpd) isoScore += 0.5;
    if (answers.audits) isoScore += 0.5;
    if (answers.backup) isoScore += 0.5;
    if (answers.nda) isoScore += 0.5;
    if (answers.france) isoScore += 0.5;
    if (!answers.incident) isoScore += 0.5;
    isoScore = Math.max(1, Math.min(5, Math.round(isoScore)));

    const result = {
      niveauConfiance: confiance,
      niveauDependance: dependance,
      niveauMaturite: isoScore,
      niveauPenetration: 3,
      doraReadiness,
      isoMaturity: isoScore,
    };

    setScores(result);
    setShowResults(true);
  };

  const apply = () => {
    if (scores) onApply(scores);
  };

  return (
    <div className="calc-overlay">
      <div className="calc-modal">
        <h3>Assistant Scoring IA</h3>
        <p>Repondez aux criteres pour calculer les scores de risque.</p>

        {!showResults ? (
          <>
            <div className="calc-questions">
              <div className="calc-section-label">Securite & Conformite</div>
              <label className="switch-row">
                <span>Certification ISO 27001 / HDS / SecNumCloud</span>
                <input type="checkbox" checked={answers.certif} onChange={() => toggle('certif')} />
              </label>
              <label className="switch-row">
                <span>Hebergement des donnees en France/UE</span>
                <input type="checkbox" checked={answers.france} onChange={() => toggle('france')} />
              </label>
              <label className="switch-row">
                <span>Conformite RGPD validee (DPA signe)</span>
                <input type="checkbox" checked={answers.rgpd} onChange={() => toggle('rgpd')} />
              </label>
              <label className="switch-row">
                <span>NDA / Accord de confidentialite signe</span>
                <input type="checkbox" checked={answers.nda} onChange={() => toggle('nda')} />
              </label>
              <label className="switch-row">
                <span>Audits de securite reguliers</span>
                <input type="checkbox" checked={answers.audits} onChange={() => toggle('audits')} />
              </label>

              <div className="divider"></div>
              <div className="calc-section-label">Resilience & Continuite</div>
              <label className="switch-row">
                <span>Plan de Continuite / Backups testes</span>
                <input type="checkbox" checked={answers.backup} onChange={() => toggle('backup')} />
              </label>
              <label className="switch-row">
                <span>Strategie de sortie documentee (DORA)</span>
                <input type="checkbox" checked={answers.exitStrategy} onChange={() => toggle('exitStrategy')} />
              </label>

              <div className="divider"></div>
              <div className="calc-section-label">Risques</div>
              <label className="switch-row">
                <span>Service critique pour l'entreprise</span>
                <input type="checkbox" checked={answers.critique} onChange={() => toggle('critique')} />
              </label>
              <label className="switch-row danger">
                <span>Incident de securite &lt; 12 mois</span>
                <input type="checkbox" checked={answers.incident} onChange={() => toggle('incident')} />
              </label>
            </div>

            <div className="calc-actions">
              <button onClick={onClose} className="btn-cancel">Annuler</button>
              <button onClick={calculate} className="btn-apply">Calculer</button>
            </div>
          </>
        ) : (
          <>
            <div className="calc-results">
              <div className="score-card">
                <div className="score-label">Confiance</div>
                <div className={`score-value sc-${scores.niveauConfiance <= 2 ? 'red' : scores.niveauConfiance <= 3 ? 'yellow' : 'green'}`}>
                  {scores.niveauConfiance}/5
                </div>
              </div>
              <div className="score-card">
                <div className="score-label">DORA Readiness</div>
                <div className={`score-value sc-${scores.doraReadiness < 40 ? 'red' : scores.doraReadiness < 70 ? 'yellow' : 'green'}`}>
                  {scores.doraReadiness}%
                </div>
              </div>
              <div className="score-card">
                <div className="score-label">ISO 27001 Maturite</div>
                <div className={`score-value sc-${scores.isoMaturity <= 2 ? 'red' : scores.isoMaturity <= 3 ? 'yellow' : 'green'}`}>
                  {scores.isoMaturity}/5
                </div>
              </div>
            </div>

            <div className="calc-actions">
              <button onClick={() => setShowResults(false)} className="btn-cancel">Modifier</button>
              <button onClick={apply} className="btn-apply">Appliquer les Scores</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScoreCalculator;

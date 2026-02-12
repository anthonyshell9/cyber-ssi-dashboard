import React, { useState, useMemo } from 'react';
import './ScoreCalculator.css';

// EBIOS RM - Toutes les echelles 1-4
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

const ScoreCalculator = ({ onClose, onApply }) => {
  const [scores, setScores] = useState({
    dependance: "",
    penetration: "",
    maturite: "",
    confiance: "",
  });

  const select = (key, value) => setScores(prev => ({ ...prev, [key]: value }));

  const riskResult = useMemo(() => {
    const d = Number(scores.dependance);
    const p = Number(scores.penetration);
    const m = Number(scores.maturite);
    const c = Number(scores.confiance);
    if (!d || !p || !m || !c) return null;
    return computeRiskScore(d, p, m, c);
  }, [scores.dependance, scores.penetration, scores.maturite, scores.confiance]);

  const canApply = scores.dependance !== "" && scores.penetration !== "" && scores.maturite !== "" && scores.confiance !== "";

  const getColorClass = (color) => {
    if (color === "green") return "sc-green";
    if (color === "amber") return "sc-yellow";
    if (color === "orange") return "sc-orange";
    if (color === "red") return "sc-red";
    return "";
  };

  const apply = () => {
    if (!canApply) return;
    const risk = riskResult || computeRiskScore(
      Number(scores.dependance),
      Number(scores.penetration),
      Number(scores.maturite),
      Number(scores.confiance)
    );
    onApply({
      dependance: Number(scores.dependance),
      penetration: Number(scores.penetration),
      maturite: Number(scores.maturite),
      confiance: Number(scores.confiance),
      riskNote: risk.note,
      riskInterpretation: risk.interpretation,
      riskColor: risk.color,
    });
  };

  return (
    <div className="calc-overlay">
      <div className="calc-modal">
        <h3>Scoring EBIOS RM</h3>
        <p className="calc-formula">NOTE = (Dependance x Penetration) / (Maturite x Confiance)</p>

        <div className="calc-dimensions">
          <div className="calc-dim">
            <div className="calc-dim-label">Dependance (1-4)</div>
            <div className="calc-dim-row">
              {DEPENDANCE_LEVELS.map((l) => (
                <div key={l.value} className={`calc-chip ${Number(scores.dependance) === l.value ? "active chip-dep" : ""}`} onClick={() => select("dependance", l.value)} title={l.desc}>
                  <span className="chip-val">{l.value}</span>
                  <span className="chip-lbl">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="calc-dim">
            <div className="calc-dim-label">Penetration (1-4)</div>
            <div className="calc-dim-row">
              {PENETRATION_LEVELS.map((l) => (
                <div key={l.value} className={`calc-chip ${Number(scores.penetration) === l.value ? "active chip-pen" : ""}`} onClick={() => select("penetration", l.value)} title={l.desc}>
                  <span className="chip-val">{l.value}</span>
                  <span className="chip-lbl">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="calc-dim">
            <div className="calc-dim-label">Maturite (1-4)</div>
            <div className="calc-dim-row">
              {MATURITE_LEVELS.map((l) => (
                <div key={l.value} className={`calc-chip ${Number(scores.maturite) === l.value ? "active chip-mat" : ""}`} onClick={() => select("maturite", l.value)} title={l.desc}>
                  <span className="chip-val">{l.value}</span>
                  <span className="chip-lbl">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="calc-dim">
            <div className="calc-dim-label">Confiance (1-4)</div>
            <div className="calc-dim-row">
              {CONFIANCE_LEVELS.map((l) => (
                <div key={l.value} className={`calc-chip ${Number(scores.confiance) === l.value ? "active chip-conf" : ""}`} onClick={() => select("confiance", l.value)} title={l.desc}>
                  <span className="chip-val">{l.value}</span>
                  <span className="chip-lbl">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {riskResult && (
          <div className="calc-result-box">
            {riskResult.note !== null ? (
              <div className={`calc-result-display ${getColorClass(riskResult.color)}`}>
                <span className="calc-result-note">{riskResult.note}</span>
                <span className="calc-result-label">{riskResult.interpretation}</span>
              </div>
            ) : (
              <div className="calc-result-display sc-gray">
                <span className="calc-result-label">{riskResult.interpretation}</span>
              </div>
            )}
          </div>
        )}

        <div className="calc-actions">
          <button onClick={onClose} className="btn-cancel">Annuler</button>
          <button onClick={apply} className="btn-apply" disabled={!canApply}>Appliquer</button>
        </div>
      </div>
    </div>
  );
};

export default ScoreCalculator;

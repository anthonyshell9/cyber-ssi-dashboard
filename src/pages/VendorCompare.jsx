import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import './VendorCompare.css';

const RADAR_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b'];

const VendorCompare = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [selected, setSelected] = useState(['', '', '']);

  useEffect(() => {
    const q = query(collection(db, 'fournisseurs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFournisseurs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSelect = (index, id) => {
    const next = [...selected];
    next[index] = id;
    setSelected(next);
  };

  const vendors = selected
    .map(id => fournisseurs.find(f => f.id === id))
    .filter(Boolean);

  // Comparison criteria
  const criteria = [
    { key: 'nomFournisseur', label: 'Nom' },
    { key: 'niveauConfiance', label: 'Score Confiance', numeric: true, higherBetter: true },
    { key: 'niveauDependance', label: 'Score Dependance', numeric: true, higherBetter: false },
    { key: 'rgpd', label: 'RGPD', boolean: true },
    { key: 'certifications', label: 'Certifications' },
    { key: 'nda', label: 'NDA signe', boolean: true },
    { key: 'localisationDonnees', label: 'Localisation Donnees' },
    { key: 'status', label: 'Statut' },
  ];

  const getBestIndex = (key, higherBetter) => {
    if (vendors.length < 2) return -1;
    let bestIdx = 0;
    let bestVal = Number(vendors[0]?.[key]) || 0;
    vendors.forEach((v, i) => {
      const val = Number(v?.[key]) || 0;
      if (higherBetter ? val > bestVal : val < bestVal) {
        bestIdx = i;
        bestVal = val;
      }
    });
    return bestIdx;
  };

  const formatCell = (vendor, criterion) => {
    const val = vendor?.[criterion.key];
    if (criterion.boolean) return val ? 'Oui' : 'Non';
    if (criterion.numeric) return val !== undefined ? `${val}/5` : 'N/A';
    return val || 'N/A';
  };

  // Radar data
  const radarDimensions = [
    { name: 'Confiance', key: 'niveauConfiance', max: 5 },
    { name: 'Maturite', key: 'niveauMaturite', max: 5 },
    { name: 'Resilience', key: 'backup', max: 1, boolean: true },
    { name: 'Conformite', key: 'rgpd', max: 1, boolean: true },
    { name: 'Independance', key: 'niveauDependance', max: 4, invert: true },
  ];

  const radarData = radarDimensions.map(dim => {
    const entry = { dimension: dim.name };
    vendors.forEach((v, i) => {
      let val;
      if (dim.boolean) {
        val = v[dim.key] ? 100 : 0;
      } else if (dim.invert) {
        val = Math.round(((dim.max - (Number(v[dim.key]) || 0)) / dim.max) * 100);
      } else {
        val = Math.round(((Number(v[dim.key]) || 0) / dim.max) * 100);
      }
      entry[`vendor${i}`] = val;
    });
    return entry;
  });

  return (
    <div className="compare-page">
      <div className="cyber-bg-animation"></div>
      <div className="compare-content">
        <div className="compare-header">
          <h1>Comparaison Fournisseurs</h1>
          <button className="compare-back-btn" onClick={() => navigate('/gestion')}>Retour</button>
        </div>

        <div className="compare-selectors">
          {[0, 1, 2].map(i => (
            <div className="selector-box" key={i}>
              <label>Fournisseur {i + 1}</label>
              <select value={selected[i]} onChange={e => handleSelect(i, e.target.value)}>
                <option value="">-- Choisir --</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.nomFournisseur}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {vendors.length >= 2 ? (
          <>
            <div className="compare-table-panel">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Critere</th>
                    {vendors.map((v, i) => (
                      <th key={i} style={{ color: RADAR_COLORS[i] }}>{v.nomFournisseur}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map(c => {
                    const bestIdx = c.numeric ? getBestIndex(c.key, c.higherBetter) : -1;
                    return (
                      <tr key={c.key}>
                        <td className="criteria-col">{c.label}</td>
                        {vendors.map((v, i) => (
                          <td key={i} className={bestIdx === i ? 'compare-best' : ''}>
                            {formatCell(v, c)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="compare-radar-panel">
              <h3>Analyse Radar Multi-Dimensions</h3>
              <div className="compare-radar-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    {vendors.map((v, i) => (
                      <Radar
                        key={i}
                        name={v.nomFournisseur}
                        dataKey={`vendor${i}`}
                        stroke={RADAR_COLORS[i]}
                        fill={RADAR_COLORS[i]}
                        fillOpacity={0.15}
                      />
                    ))}
                    <Legend />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="compare-empty">
            Selectionnez au moins 2 fournisseurs pour lancer la comparaison.
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorCompare;

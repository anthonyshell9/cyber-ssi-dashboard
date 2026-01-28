import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "./db/firebase.jsx";

// --- IMPORT DU CONTEXTE (Chemin Racine) ---
import { NotificationProvider } from "./NotificationContext";

// --- IMPORTS DES PAGES ---
import Gestion from "./Gestion.jsx";
import AjouterFournisseur from "./AjouterFournisseur.jsx";
import DetailsFournisseur from "./DetailsFournisseur.jsx";
import ModifierFournisseur from "./ModifierFournisseur.jsx";
import IntelligenceFournisseur from "./IntelligenceFournisseur.jsx";

// MODULES AVANCÉS
import Incidents from "./Incidents.jsx"; // Salle de Crise
import AuditsGlobal from "./AuditsGlobal.jsx"; // Planning Audits
import ContactsGlobal from "./ContactsGlobal.jsx"; // <--- NOUVEAU (Annuaire)

import "./App.css";

function App() {
  const [connectedUser, setConnectedUser] = useState(null);
  const [checking, setChecking] = useState(true);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setConnectedUser(user);
      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!email || !password) { setErreur("Champs requis."); return; }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    } catch (error) {
      setErreur("Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="app-loader"><div className="spinner"></div></div>;

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          
          {/* INSCRIPTION PRESTATAIRE */}
          <Route path="/se-proposer-fournisseur" element={
             <div className="public-layout">
               <nav className="public-nav">
                 <div className="logo-container"><span className="logo-icon">☁️</span><h1 className="logo-text">CYBER-SSI</h1></div>
                 <Link to="/" className="nav-link-secondary">Connexion Admin</Link>
               </nav>
               <div className="public-content"><AjouterFournisseur /></div>
             </div>
          } />

          {/* LOGIN */}
          <Route path="/" element={
            connectedUser ? <Navigate to="/gestion" replace /> : (
              <div className="login-split-screen">
                 <div className="login-visual-side">
                    <div className="visual-content">
                      <div className="logo-display"><span className="logo-icon-lg">☁️</span><h1>CYBER-SSI</h1></div>
                      <h2>Sécurisez votre infrastructure Cloud.</h2>
                      <p>Plateforme de gestion des risques tiers et conformité.</p>
                    </div>
                 </div>
                 <div className="login-form-side">
                   <div className="form-wrapper">
                     <div className="form-header"><h2>Connexion Admin</h2><p>Accès réservé au service sécurité</p></div>
                     {erreur && <div className="alert-error">{erreur}</div>}
                     <form onSubmit={handleLogin}>
                       <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@cyber-ssi.com" /></div>
                       <div className="form-group"><label>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" /></div>
                       <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Authentification..." : "Accéder au Portail"}</button>
                     </form>
                     <div style={{marginTop: '30px', textAlign: 'center', borderTop: '1px solid #334155', paddingTop: '20px'}}>
                       <p style={{color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px'}}>Prestataire externe ?</p>
                       <Link to="/se-proposer-fournisseur" style={{color: '#06b6d4', textDecoration: 'none', fontWeight: 'bold'}}>Se référencer maintenant →</Link>
                     </div>
                   </div>
                 </div>
              </div>
            )
          } />

          {/* ROUTES PROTÉGÉES */}
          <Route path="/gestion" element={connectedUser ? <Gestion setConnectedUser={setConnectedUser} /> : <Navigate to="/" replace />} />
          <Route path="/fournisseur/:id" element={connectedUser ? <DetailsFournisseur /> : <Navigate to="/" replace />} />
          <Route path="/modifier/:id" element={connectedUser ? <ModifierFournisseur /> : <Navigate to="/" replace />} />
          <Route path="/intelligence/:id" element={connectedUser ? <IntelligenceFournisseur /> : <Navigate to="/" replace />} />
          
          {/* MODULES AVANCÉS */}
          <Route path="/crise" element={connectedUser ? <Incidents /> : <Navigate to="/" replace />} />
          <Route path="/audits" element={connectedUser ? <AuditsGlobal /> : <Navigate to="/" replace />} />
          <Route path="/annuaire" element={connectedUser ? <ContactsGlobal /> : <Navigate to="/" replace />} /> {/* <--- ROUTE AJOUTÉE */}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;
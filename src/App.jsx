import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase.jsx";

import { NotificationProvider } from "./hooks/NotificationContext";
import { UserProvider } from "./hooks/UserContext";

import DashboardLayout from "./components/DashboardLayout.jsx";
import Gestion from "./pages/Gestion.jsx";
import AjouterFournisseur from "./pages/AjouterFournisseur.jsx";
import DetailsFournisseur from "./pages/DetailsFournisseur.jsx";
import ModifierFournisseur from "./pages/ModifierFournisseur.jsx";
import IntelligenceFournisseur from "./pages/IntelligenceFournisseur.jsx";
import DemandesDashboard from "./pages/DemandesDashboard.jsx";
import MesDemandes from "./pages/MesDemandes.jsx";

import Incidents from "./pages/Incidents.jsx";
import AuditsGlobal from "./pages/AuditsGlobal.jsx";
import ContactsGlobal from "./pages/ContactsGlobal.jsx";
import VendorCompare from "./pages/VendorCompare.jsx";
import DoraRegister from "./pages/DoraRegister.jsx";
import ConcentrationRisk from "./pages/ConcentrationRisk.jsx";
import ExitStrategies from "./pages/ExitStrategies.jsx";
import ContractualCompliance from "./pages/ContractualCompliance.jsx";
import RiskMatrix from "./pages/RiskMatrix.jsx";
import IsoControls from "./pages/IsoControls.jsx";
import AuditProgram from "./pages/AuditProgram.jsx";
import SlaMonitoring from "./pages/SlaMonitoring.jsx";
import SoaDashboard from "./pages/SoaDashboard.jsx";
import Evaluations from "./pages/Evaluations.jsx";
import AdminParametres from "./pages/AdminParametres.jsx";
import AdminUtilisateurs from "./pages/AdminUtilisateurs.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminAuditLog from "./pages/AdminAuditLog.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

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
    <UserProvider>
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

          {/* ROUTES PROTÉGÉES - wrapped in DashboardLayout */}
          <Route path="/gestion" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><Gestion /></DashboardLayout></ProtectedRoute>} />
          <Route path="/fournisseur/:id" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><DetailsFournisseur /></DashboardLayout></ProtectedRoute>} />
          <Route path="/modifier/:id" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><ModifierFournisseur /></DashboardLayout></ProtectedRoute>} />
          <Route path="/intelligence/:id" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><IntelligenceFournisseur /></DashboardLayout></ProtectedRoute>} />

          {/* MODULES AVANCÉS */}
          <Route path="/crise" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><Incidents /></DashboardLayout></ProtectedRoute>} />
          <Route path="/audits" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><AuditsGlobal /></DashboardLayout></ProtectedRoute>} />
          <Route path="/annuaire" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><ContactsGlobal /></DashboardLayout></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><VendorCompare /></DashboardLayout></ProtectedRoute>} />
          <Route path="/evaluations" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><Evaluations /></DashboardLayout></ProtectedRoute>} />

          {/* DORA COMPLIANCE */}
          <Route path="/dora-register" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><DoraRegister /></DashboardLayout></ProtectedRoute>} />
          <Route path="/concentration-risk" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><ConcentrationRisk /></DashboardLayout></ProtectedRoute>} />
          <Route path="/exit-strategies" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><ExitStrategies /></DashboardLayout></ProtectedRoute>} />
          <Route path="/contractual-compliance" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><ContractualCompliance /></DashboardLayout></ProtectedRoute>} />

          {/* ISO 27001 COMPLIANCE */}
          <Route path="/risk-matrix" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><RiskMatrix /></DashboardLayout></ProtectedRoute>} />
          <Route path="/iso-controls" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><IsoControls /></DashboardLayout></ProtectedRoute>} />
          <Route path="/audit-program" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><AuditProgram /></DashboardLayout></ProtectedRoute>} />
          <Route path="/sla-monitoring" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><SlaMonitoring /></DashboardLayout></ProtectedRoute>} />
          <Route path="/soa" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><SoaDashboard /></DashboardLayout></ProtectedRoute>} />

          {/* DEMANDES / WORKFLOW */}
          <Route path="/demandes" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><DemandesDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/mes-demandes" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><MesDemandes /></DashboardLayout></ProtectedRoute>} />

          {/* ADMIN */}
          <Route path="/admin/utilisateurs" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><AdminLayout><AdminUtilisateurs /></AdminLayout></DashboardLayout></ProtectedRoute>} />
          <Route path="/admin/parametres" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><AdminLayout><AdminParametres /></AdminLayout></DashboardLayout></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute user={connectedUser}><DashboardLayout setConnectedUser={setConnectedUser}><AdminLayout><AdminAuditLog /></AdminLayout></DashboardLayout></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </NotificationProvider>
    </UserProvider>
  );
}

export default App;
// src/EmailClient.jsx
import React, { useState, useEffect } from "react";
import { functions, auth } from "./db/firebase"; // fonctions Firebase
import { httpsCallable } from "firebase/functions";
import "./emailpopup.css";

function EmailClient({ clientEmail, clientName, onClose }) {
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Pré-remplir l'expéditeur avec l'utilisateur connecté (pour affichage seulement)
  useEffect(() => {
    const userEmail = auth.currentUser?.email || "inconnu@exemple.com";
    setSender(userEmail);
  }, []);

  const handleSend = async () => {
    if (!clientEmail || !subject || !message) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);

    const sendEmail = httpsCallable(functions, "sendEmail");

    try {
      await sendEmail({
        to: clientEmail,
        subject,
        message,
        // Important : l'expéditeur doit être ton compte Gmail configuré dans Nodemailer
        from: "scottguimezap@gmail.com", 
      });

      alert("Email envoyé avec succès !");
      setSubject("");
      setMessage("");
      onClose();
    } catch (err) {
      console.error("Erreur Firebase Functions :", err);
      alert("Erreur lors de l'envoi : " + (err.message || "internal"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if ((subject || message) && !window.confirm("Vous avez un message non envoyé. Fermer quand même ?")) return;
    setSubject("");
    setMessage("");
    onClose();
  };

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <h2 className="popup-title">📧 Envoyer un email</h2>
        <button className="popup-close" onClick={handleClose}>✖</button>

        <div className="popup-content">
          <label>Expéditeur :</label>
          <input type="text" value={sender} disabled />

          <label>Destinataire :</label>
          <input type="text" value={clientEmail} disabled />

          <label>Objet :</label>
          <input
            type="text"
            placeholder="Sujet"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label>Message :</label>
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>

          <button
            className="popup-send-btn"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailClient;

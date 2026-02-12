import React, { createContext, useState, useContext, useCallback } from 'react';
import "./Notification.css";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Fonction pour ajouter une notification
  // types : 'success', 'error', 'warning', 'info'
  const addNotification = useCallback((type, message) => {
    const id = Date.now(); // ID unique basé sur l'heure
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Suppression automatique après 3 secondes
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      
      {/* LE CONTENEUR VISUEL DES NOTIFICATIONS */}
      <div className="notification-container">
        {notifications.map((notif) => (
          <div key={notif.id} className={`cyber-toast ${notif.type} slide-in`}>
            <div className="toast-icon">
              {notif.type === 'success' && '✅'}
              {notif.type === 'error' && '🚨'}
              {notif.type === 'warning' && '⚠️'}
              {notif.type === 'info' && 'ℹ️'}
            </div>
            <div className="toast-content">
              <span className="toast-title">SYSTÈME CYBER-SSI</span>
              <span className="toast-message">{notif.message}</span>
            </div>
            <button onClick={() => removeNotification(notif.id)} className="toast-close">×</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Le Hook personnalisé pour utiliser les notifs partout
export const useNotification = () => useContext(NotificationContext);
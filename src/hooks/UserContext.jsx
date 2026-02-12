import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const UserContext = createContext();

// Admin emails that get elevated role on first login
const ADMIN_EMAILS = ["ahassen@cyber-ssi.com"];

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileRef = doc(db, "users", firebaseUser.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setUserProfile({ id: profileSnap.id, ...profileSnap.data() });
          } else {
            // Auto-create profile - admin for admin emails, demandeur for others
            const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase());
            const newProfile = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              role: isAdmin ? "admin" : "demandeur",
              department: isAdmin ? "Securite" : "",
              createdAt: serverTimestamp(),
            };
            await setDoc(profileRef, newProfile);
            setUserProfile({ id: firebaseUser.uid, ...newProfile });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile({
            email: firebaseUser.email,
            displayName: firebaseUser.email.split("@")[0],
            role: "demandeur",
            department: "",
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

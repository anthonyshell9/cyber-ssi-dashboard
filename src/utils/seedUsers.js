import { db } from "../lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const SEED_USERS = [
  {
    email: "ahassen@cyber-ssi.com",
    displayName: "Anthony Hassen",
    role: "rssi",
    department: "Securite",
  },
  {
    email: "demo@cyber-ssi.com",
    displayName: "Marie Dupont",
    role: "demandeur",
    department: "IT",
  },
];

/**
 * Seeds user profiles into the Firestore "users" collection.
 * Uses email as a deterministic doc ID (sanitized) to prevent duplicates.
 * Only creates profiles that don't already exist.
 */
export const seedUserProfiles = async () => {
  const results = [];
  for (const user of SEED_USERS) {
    const docId = user.email.replace(/[.@]/g, "_");
    const ref = doc(db, "users", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...user,
        createdAt: serverTimestamp(),
      });
      results.push({ email: user.email, action: "created" });
    } else {
      results.push({ email: user.email, action: "already_exists" });
    }
  }
  return results;
};

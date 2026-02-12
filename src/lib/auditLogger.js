import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const logAudit = async (action, performedBy, targetType, targetId, details) => {
  try {
    await addDoc(collection(db, "auditLogs"), {
      action, performedBy, targetType, targetId, details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
};

const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");

// Récupérer la clé depuis les secrets Firebase
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(SENDGRID_API_KEY);

exports.sendEmail = functions.https.onCall(async (data, context) => {
  const { to, subject, message } = data;

  if (!to || !subject || !message) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Les champs to, subject et message sont requis."
    );
  }

  const email = {
    to: to,
    from: "scottguimezap@gmail.com", // ton adresse vérifiée SendGrid
    subject: subject,
    text: message,
    html: `<p>${message}</p>`,
  };

  try {
    await sgMail.send(email);
    return { success: true };
  } catch (error) {
    console.error("Erreur SendGrid:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de l'envoi de l'email."
    );
  }
});

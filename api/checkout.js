// /api/checkout.js
// Maakt een Mollie betaallink per formulierinzending.
// Form data wordt als metadata aan de payment gehangen,
// zodat de webhook (Fase 5) deze kan doorsturen naar Gumloop.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const formData = req.body || {};

    // Validatie: minimaal bedrijfsnaam en email vereist
    if (!formData.bedrijfsnaam || !formData.email) {
      return res.status(400).json({ error: "Bedrijfsnaam en email zijn verplicht" });
    }

    const description = `Webby website voor ${formData.bedrijfsnaam}`;

    // Mollie metadata heeft een limiet van ~1KB.
    // We slaan de essentiele velden op zodat de webhook (Fase 5)
    // ze kan doorsturen naar Gumloop.
    const metadata = {
      bedrijfsnaam: formData.bedrijfsnaam,
      email: formData.email,
      telefoon: formData.telefoon || "",
      kvk: formData.kvk || "",
      adres: formData.adres || "",
      omschrijving: (formData.omschrijving || "").slice(0, 300),
      doelgroep: (formData.doelgroep || "").slice(0, 150),
      cta: formData.cta || "",
      whatsapp: formData.whatsapp || "",
      stijl: formData.stijl || "",
      kleur: (formData.kleur || "").slice(0, 100),
      extra: (formData.extra || "").slice(0, 200)
    };

    const mollieResponse = await fetch("https://api.mollie.com/v2/payment-links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MOLLIE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: "250.00"
        },
        description: description,
        redirectUrl: "https://trywebby.nl/bedankt.html",
        webhookUrl: "https://trywebby.nl/api/mollie-webhook",
        metadata: JSON.stringify(metadata)
      })
    });

    const data = await mollieResponse.json();

    if (!mollieResponse.ok) {
      console.error("Mollie error:", data);
      return res.status(500).json({ error: "Kon betaallink niet aanmaken" });
    }

    return res.status(200).json({
      checkoutUrl: data._links.paymentLink.href
    });

  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

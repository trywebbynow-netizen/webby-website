// /api/checkout.js
// Maakt een Mollie betaallink per formulierinzending.
// LET OP: Mollie's Payment Links API accepteert geen metadata parameter.
// Form data koppeling regelen we in de webhook (Fase 5).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const formData = req.body || {};

    if (!formData.bedrijfsnaam || !formData.email) {
      return res.status(400).json({ error: "Bedrijfsnaam en email zijn verplicht" });
    }

    // Mollie description heeft max 255 chars. We zetten bedrijfsnaam + email
    // erin zodat je in je Mollie dashboard direct ziet wie betaalt.
    const description = `Webby website — ${formData.bedrijfsnaam} (${formData.email})`.slice(0, 255);

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
        redirectUrl: "https://trywebby.nl/bedankt.html"
        // webhookUrl bewust weggelaten — toevoegen in Fase 5
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

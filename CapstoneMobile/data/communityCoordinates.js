/**
 * Hardcoded coordinates for all PUAC communities in the Philippines.
 * This eliminates dependency on runtime geocoding, which fails for many
 * obscure barangay / sitio names.
 *
 * Keys MUST match the strings in the COMMUNITIES array exactly.
 */
const COMMUNITY_COORDINATES = {
  // ── Kalinga ────────────────────────────────────────────────
  "Kalinga - Tabuk":          { latitude: 17.4157, longitude: 121.4444 },
  "Kalinga - Zapote":         { latitude: 17.4600, longitude: 121.4300 },
  "Kalinga - Bliss":          { latitude: 17.4200, longitude: 121.4500 },
  "Kalinga - Libanon":        { latitude: 17.4700, longitude: 121.4100 },
  "Kalinga - Batong Buhay":   { latitude: 17.1228, longitude: 121.1019 },
  "Kalinga - Balatoc":        { latitude: 17.3800, longitude: 121.4000 },
  "Kalinga - Lat-nog":        { latitude: 17.4400, longitude: 121.4200 },

  // ── Isabela ────────────────────────────────────────────────
  "Isabela - Santiago City":   { latitude: 16.6892, longitude: 121.5486 },

  // ── Abra ───────────────────────────────────────────────────
  "Abra - Lamao":             { latitude: 17.5955, longitude: 120.7183 },
  "Abra - Lingey":            { latitude: 17.5800, longitude: 120.7000 },
  "Abra - Cabaruyan":         { latitude: 17.5700, longitude: 120.7100 },
  "Abra - Ducligan":          { latitude: 17.6000, longitude: 120.7300 },
  "Abra - Gangal":            { latitude: 17.5600, longitude: 120.6900 },
  "Abra - Bila-Bila":         { latitude: 17.5500, longitude: 120.7200 },
  "Abra - Naguillian":        { latitude: 17.6850, longitude: 120.6900 },
  "Abra - Ud-udiao":          { latitude: 17.5400, longitude: 120.7000 },
  "Abra - Villa Conchita":    { latitude: 17.5950, longitude: 120.7150 },
  "Abra - Ay-yeng":           { latitude: 17.5650, longitude: 120.7050 },

  // ── Manabo (municipality in Abra) ──────────────────────────
  "Manabo - Dao-angan":       { latitude: 17.4367, longitude: 120.7050 },
  "Manabo - Kilong-olao":     { latitude: 17.4400, longitude: 120.7100 },
  "Manabo - Bao-yan":         { latitude: 17.4300, longitude: 120.7000 },
  "Manabo - Amti":            { latitude: 17.4450, longitude: 120.7150 },
  "Manabo - Danac":           { latitude: 17.4350, longitude: 120.7200 },
  "Manabo - Bengued":         { latitude: 17.4250, longitude: 120.6950 },
  "Manabo - Sappaac":         { latitude: 17.4500, longitude: 120.7050 },
  "Manabo - Saccaang":        { latitude: 17.4420, longitude: 120.7000 },

  // ── Benguet ────────────────────────────────────────────────
  "Benguet - Baguio":         { latitude: 16.4023, longitude: 120.5960 },

  // ── NCR / Metro Manila & nearby ────────────────────────────
  "NCR - Valenzuela City":            { latitude: 14.6942, longitude: 120.9842 },
  "NCR - Tandang Sora, Quezon City":  { latitude: 14.6760, longitude: 121.0437 },
  "NCR - Coa, Quezon City":           { latitude: 14.6570, longitude: 121.0500 },
  "NCR - Payatas, Quezon City":       { latitude: 14.7100, longitude: 121.0980 },
  "NCR - Malaria Caloocan":           { latitude: 14.6500, longitude: 120.9670 },
  "NCR - Montalban":                  { latitude: 14.7320, longitude: 121.1465 },
  "NCR - Meycauayan City":            { latitude: 14.7370, longitude: 120.9610 },
  "NCR - Camalig":                    { latitude: 14.7200, longitude: 120.9500 },
  "NCR - San Jose Del Monte":         { latitude: 14.8139, longitude: 121.0453 },

  // ── Tarlac ─────────────────────────────────────────────────
  "Tarlac - Pacpaco, San Manuel":     { latitude: 15.7470, longitude: 120.6560 },
  "Tarlac - Victoria":                { latitude: 15.5790, longitude: 120.6805 },

  // ── Nueva Ecija ────────────────────────────────────────────
  "Nueva Ecija - Bambanaba, Cuyapo":  { latitude: 15.7680, longitude: 120.6620 },

  // ── Pangasinan ─────────────────────────────────────────────
  "Pangasinan - Dagupan":             { latitude: 16.0433, longitude: 120.3374 },
  "Pangasinan - Mangatarem":          { latitude: 15.7880, longitude: 120.2935 },
  "Pangasinan - Laoak Langka":        { latitude: 15.8500, longitude: 120.3100 },
  "Pangasinan - Orbiztondo":          { latitude: 15.9000, longitude: 120.2800 },
  "Pangasinan - Malasique, Bolaoit":  { latitude: 15.8600, longitude: 120.2700 },
  "Pangasinan - Taloyan":             { latitude: 15.8200, longitude: 120.3300 },
  "Pangasinan - Binmaley":            { latitude: 16.0324, longitude: 120.2695 },
  "Pangasinan - San Carlos":          { latitude: 15.9254, longitude: 120.3482 },
  "Pangasinan - Manaoag":             { latitude: 16.0440, longitude: 120.4860 },
  "Pangasinan - Pozorrobio":          { latitude: 16.1128, longitude: 120.5481 },
  "Pangasinan - Alcala":              { latitude: 15.8470, longitude: 120.5210 },

  // ── Agusan Del Norte ───────────────────────────────────────
  "Agusan Del Norte - Butuan City":           { latitude: 8.9475,  longitude: 125.5406 },
  "Agusan Del Norte - RTR":                   { latitude: 8.5025,  longitude: 125.4725 },
  "Agusan Del Norte - Jabonga, Bangonay":     { latitude: 9.3400,  longitude: 125.5100 },
  "Agusan Del Norte - Kasiklan":              { latitude: 8.6000,  longitude: 125.5000 },
  "Agusan Del Norte - San Mateo":             { latitude: 8.5780,  longitude: 125.5170 },
  "Agusan Del Norte - Fatima Kim.13":         { latitude: 8.5200,  longitude: 125.4800 },
  "Agusan Del Norte - Bayugan":               { latitude: 8.7131,  longitude: 125.7677 },
  "Agusan Del Norte - Ibuan":                 { latitude: 8.5500,  longitude: 125.5200 },
  "Agusan Del Norte - Balubo":                { latitude: 8.5100,  longitude: 125.4600 },

  // ── Cebu ───────────────────────────────────────────────────
  "Cebu - Mandaue":           { latitude: 10.3236, longitude: 123.9223 },
  "Cebu - Li-loan":           { latitude: 10.4084, longitude: 123.9994 },
  "Cebu - Calero":            { latitude: 10.3100, longitude: 123.9300 },
  "Cebu - Compostela":        { latitude: 10.4550, longitude: 124.0118 },

  // ── Surigao Del Norte ──────────────────────────────────────
  "Surigao Del Norte - Alegria":      { latitude: 9.7668,  longitude: 125.5898 },
  "Surigao Del Norte - Bonifacio":    { latitude: 9.6819,  longitude: 125.5642 },
  "Surigao Del Norte - Matin-ao":     { latitude: 9.7200,  longitude: 125.5500 },
  "Surigao Del Norte - Ipil":         { latitude: 9.7500,  longitude: 125.5700 },

  // ── Surigao Del Sur ────────────────────────────────────────
  "Surigao Del Sur - Kinabigtasan":   { latitude: 8.6600,  longitude: 126.0500 },
  "Surigao Del Sur - Tago":           { latitude: 8.9500,  longitude: 126.2333 },
};

export default COMMUNITY_COORDINATES;

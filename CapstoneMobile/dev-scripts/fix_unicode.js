const fs = require('fs');
const path = 'c:/Users/gabri/OneDrive/Desktop/Capstone_Mobile/CapstoneMobile/screens/LoansScreen.jsx';
let f = fs.readFileSync(path, 'utf8');

f = f.replace(/ÃƒÂ¢Ã‚Â — ÃƒÂ¯Ã‚Â¸Ã‚Â/g, '🔒');
f = f.replace(/Ã¢â€ â€™/g, '→');
f = f.replace(/Ã¢â‚¬Â¢/g, '•');
f = f.replace(/ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“/g, '✔');
f = f.replace(/ÃƒÂ¢Ã¢â‚¬Â Ã¢â€šÂ¬/g, '▬');

fs.writeFileSync(path, f, 'utf8');
console.log("Done");

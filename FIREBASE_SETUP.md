# 🔥 Firebase Setup για Duck Strike Multiplayer

## Βήμα 1: Δημιούργησε Firebase Project

1. Πήγαινε στο [Firebase Console](https://console.firebase.google.com/)
2. Κλικ **"Add Project"** / **"Προσθήκη Έργου"**
3. Όνομα: `duck-strike-multiplayer`
4. Ακολούθησε τα βήματα (Google Analytics: Προαιρετικό)

## Βήμα 2: Ενεργοποίησε Realtime Database

1. Στο αριστερό μενού → **"Realtime Database"**
2. Κλικ **"Create Database"**
3. Διάλεξε **location**: `europe-west1` (για Ελλάδα)
4. Security rules: Διάλεξε **"Start in test mode"** (προσωρινά)

## Βήμα 3: Πάρε το Firebase Config

1. Στο Project Overview (⚙️) → **"Project Settings"**
2. Scroll κάτω → **"Your apps"**
3. Κλικ το **</> Web** icon
4. Δώσε όνομα: `Duck Strike Web`
5. Αντίγραψε το **firebaseConfig** object

## Βήμα 4: Ενημέρωσε το index.html

Άντε το config στο `index.html` (γραμμή ~413):

```javascript
const firebaseConfig = {
    apiKey: "ΤΟ_ΔΙΚΟ_ΣΟΥ_API_KEY",
    authDomain: "ΤΟ_ΔΙΚΟ_ΣΟΥ_AUTH_DOMAIN",
    databaseURL: "ΤΟ_ΔΙΚΟ_ΣΟΥ_DATABASE_URL",
    projectId: "duck-strike-multiplayer",
    storageBucket: "ΤΟ_ΔΙΚΟ_ΣΟΥ_STORAGE_BUCKET",
    messagingSenderId: "ΤΟ_ΔΙΚΟ_ΣΟΥ_SENDER_ID",
    appId: "ΤΟ_ΔΙΚΟ_ΣΟΥ_APP_ID"
};
```

## Βήμα 5: Security Rules (Προαιρετικό για production)

Στο Realtime Database → **"Rules"** tab:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["status", "createdAt"]
      }
    }
  }
}
```

## Βήμα 6: Test!

1. Commit & Push στο GitHub
2. Άνοιξε το site σε 2 tabs/devices
3. Κλικ **"Ιδιωτικό Δωμάτιο"** → **"Δημιούργησε Δωμάτιο"**
4. Στο άλλο tab: Εισάγαγε τον κωδικό!

## 🎮 Πώς Λειτουργεί

### Local Game (Bot)
- Κλικ **"Παίξε με Bot"** → Κανονικό offline game

### Random Match
- Κλικ **"Τυχαίος Αντίπαλος"** → Αναζητά διαθέσιμο δωμάτιο
- Αν δεν βρει, δημιουργεί νέο και περιμένει

### Private Room
- **Δημιουργία**: Φτιάχνει 6-digit code, περιμένει guest
- **Είσοδος**: Εισάγεις τον κωδικό, μπαίνεις απευθείας

### Real-time Sync
- **Host**: Στέλνει game state κάθε 50ms (20 FPS)
- **Guest**: Λαμβάνει και ενημερώνει την μπάλα/παίκτες
- Ομαλό sync χωρίς lag!

## 🐛 Troubleshooting

**"Permission denied"**: Τσέκαρε Security Rules  
**"Room not found"**: Βεβαιώσου ότι ο κωδικός είναι σωστός  
**Lag**: Τσέκαρε internet connection - χρειάζεται stable connection

## 📱 Mobile

Και το multiplayer δουλεύει στο PWA mode!

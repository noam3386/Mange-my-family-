#!/bin/bash
# ============================================================
# Family Manager App - One-click setup for Google Cloud Shell
# ============================================================
# Run: bash setup.sh
# ============================================================

set -e
PROJECT_ID="famliy-app-planning"

echo ""
echo "🏠 Family Manager App - Setup"
echo "================================"
echo ""

# Step 1: Install Firebase CLI if missing
if ! command -v firebase &> /dev/null; then
  echo "📦 Installing Firebase CLI..."
  npm install -g firebase-tools --quiet
else
  echo "✅ Firebase CLI already installed ($(firebase --version))"
fi

# Step 2: Login check
echo ""
echo "🔑 Checking Firebase login..."
if ! firebase projects:list &> /dev/null; then
  echo "Logging in to Firebase..."
  firebase login --no-localhost
fi

# Step 3: Set project
echo ""
echo "🔗 Setting project to: $PROJECT_ID"
firebase use "$PROJECT_ID"

# Step 4: Enable required Firebase services
echo ""
echo "⚙️  Enabling Firebase services..."

# Enable Firestore
echo "  → Enabling Firestore..."
gcloud firestore databases create --location=europe-west1 --project="$PROJECT_ID" 2>/dev/null || echo "  (Firestore already enabled)"

# Enable Authentication
echo "  → Enabling Authentication..."
gcloud services enable identitytoolkit.googleapis.com --project="$PROJECT_ID" 2>/dev/null

# Step 5: Create web app and get config
echo ""
echo "📱 Creating Firebase Web App..."
APP_ID=$(firebase apps:list WEB --project "$PROJECT_ID" --json 2>/dev/null | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  apps = data.get('result', [])
  if apps:
    print(apps[0].get('appId', ''))
except:
  pass
")

if [ -z "$APP_ID" ]; then
  echo "  Creating new web app..."
  firebase apps:create WEB "Family Manager" --project "$PROJECT_ID" 2>/dev/null || true
  sleep 3
  APP_ID=$(firebase apps:list WEB --project "$PROJECT_ID" --json 2>/dev/null | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  apps = data.get('result', [])
  if apps:
    print(apps[0].get('appId', ''))
except:
  pass
")
fi

# Step 6: Get SDK config and write .env.local
echo ""
echo "📝 Writing .env.local..."
if [ -n "$APP_ID" ]; then
  CONFIG=$(firebase apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json 2>/dev/null)

  API_KEY=$(echo "$CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('apiKey',''))" 2>/dev/null)
  AUTH_DOMAIN=$(echo "$CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('authDomain',''))" 2>/dev/null)
  APP_ID_VAL=$(echo "$CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('appId',''))" 2>/dev/null)
  MESSAGING_ID=$(echo "$CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('messagingSenderId',''))" 2>/dev/null)
  STORAGE=$(echo "$CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('sdkConfig',{}).get('storageBucket',''))" 2>/dev/null)

  cat > .env.local << ENV
VITE_FIREBASE_API_KEY=$API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=$STORAGE
VITE_FIREBASE_MESSAGING_SENDER_ID=$MESSAGING_ID
VITE_FIREBASE_APP_ID=$APP_ID_VAL
ENV

  echo "  ✅ .env.local written successfully!"
  echo ""
  echo "  Project: $PROJECT_ID"
  echo "  Auth Domain: $AUTH_DOMAIN"
else
  echo "  ⚠️  Could not get config automatically."
  echo "  Please fill in .env.local manually from:"
  echo "  https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
  cp .env.example .env.local
fi

# Step 7: Enable Email/Password auth via gcloud
echo ""
echo "🔐 Enabling Email/Password authentication..."
curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/v2/projects/$PROJECT_ID/config?updateMask=signIn.email.enabled" \
  -H "Authorization: Bearer $(gcloud auth print-access-token 2>/dev/null)" \
  -H "Content-Type: application/json" \
  -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}' > /dev/null 2>&1 && \
  echo "  ✅ Email/Password auth enabled!" || \
  echo "  ⚠️  Enable manually: Firebase Console → Authentication → Sign-in method → Email/Password"

# Step 8: Deploy Firestore rules
echo ""
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules --project "$PROJECT_ID" 2>/dev/null && \
  echo "  ✅ Firestore rules deployed!" || \
  echo "  ⚠️  Run manually: firebase deploy --only firestore:rules"

# Step 9: Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install --silent

# Step 10: Build
echo ""
echo "🏗️  Building app..."
npm run build

# Step 11: Deploy to Firebase Hosting
echo ""
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting --project "$PROJECT_ID"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  🎉 Family Manager App is LIVE!          ║"
echo "╠══════════════════════════════════════════╣"
echo "║  🌐 https://$PROJECT_ID.web.app          ║"
echo "║  🌐 https://$PROJECT_ID.firebaseapp.com  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📱 To install as mobile app:"
echo "   Open the URL on your phone → 'Add to Home Screen'"
echo ""

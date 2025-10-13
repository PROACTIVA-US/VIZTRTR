# Google Cloud Setup for Gemini Computer Use

**Goal:** Enable Gemini 2.5 Computer Use Preview model with billing-enabled API key

## Prerequisites

- ✅ Google Cloud project created
- ⏳ Billing enabled on project
- ⏳ Gemini API enabled
- ⏳ API key generated

---

## Step 1: Access Google Cloud Shell

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the **Cloud Shell** icon (terminal icon) in top-right
3. Wait for shell to initialize

---

## Step 2: Enable Required APIs

```bash
# Set your project ID (replace with your actual project ID)
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable Generative AI API
gcloud services enable generativelanguage.googleapis.com

# Enable AI Platform API (for Computer Use)
gcloud services enable aiplatform.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled | grep -E "generativelanguage|aiplatform"
```

---

## Step 3: Enable Billing

```bash
# Check billing status
gcloud beta billing projects describe $PROJECT_ID

# If billing is not enabled, link billing account:
# 1. Go to https://console.cloud.google.com/billing
# 2. Select your project
# 3. Click "Link a billing account"
# 4. Choose existing billing account or create new one
```

---

## Step 4: Create API Key

```bash
# Create API key for Generative AI
gcloud alpha services api-keys create \
  --display-name="VIZTRTR Gemini Computer Use" \
  --api-target=service=generativelanguage.googleapis.com

# Get the API key value
gcloud alpha services api-keys list --format="value(name,keyString)"
```

### Alternative: Create via Console

1. Go to [API Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **API Key**
3. Copy the key value
4. Click **Restrict Key** → Add `generativelanguage.googleapis.com`

---

## Step 5: Test the API Key

Create a test script in Cloud Shell:

```bash
cat > test-gemini.sh << 'EOF'
#!/bin/bash

API_KEY="$1"
MODEL="gemini-2.5-computer-use-preview-10-2025"

if [ -z "$API_KEY" ]; then
  echo "Usage: ./test-gemini.sh YOUR_API_KEY"
  exit 1
fi

echo "Testing Gemini Computer Use model..."
echo ""

curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Can you see this text? Respond with a simple yes or no."
      }]
    }]
  }' | jq '.'

echo ""
echo "If you see a valid response (not quota/permission error), API key works!"
EOF

chmod +x test-gemini.sh
```

Run the test:

```bash
# Replace with your actual API key
./test-gemini.sh "YOUR_API_KEY_HERE"
```

**Expected Success Response:**

```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "Yes" }]
      }
    }
  ]
}
```

**Error Responses:**

- **Quota Error:** Billing not enabled or quota exceeded
- **Permission Error:** API not enabled on project
- **Invalid Key:** API key incorrect or restricted

---

## Step 6: Update VIZTRTR Configuration

Once API key is validated:

```bash
# On your local machine (not Cloud Shell)
cd /Users/danielconnolly/Projects/VIZTRTR

# Update .env file
echo "GOOGLE_API_KEY=your-new-api-key" >> .env

# Update centralized config
echo "GOOGLE_API_KEY=your-new-api-key" >> ~/.config/api-keys/.env.api-keys
```

---

## Step 7: Run VIZTRTR Test

```bash
# Ensure frontend is running
cd ui/frontend && npm run dev &

# Run Gemini Computer Use test
npm run build
node dist/examples/gemini-computer-use-simple.js
```

---

## Troubleshooting

### "Quota exceeded" Error

**Cause:** Free tier limits exhausted
**Solution:**

1. Enable billing on project
2. Wait 24 hours for quota reset
3. Request quota increase at [Quotas page](https://console.cloud.google.com/iam-admin/quotas)

### "API not enabled" Error

**Cause:** Generative Language API not enabled
**Solution:** Run `gcloud services enable generativelanguage.googleapis.com`

### "Permission denied" Error

**Cause:** API key doesn't have access to Computer Use model
**Solution:**

1. Check API key restrictions
2. Ensure billing is enabled
3. Try creating new unrestricted API key

### Model Not Found

**Cause:** Computer Use preview model not available in your region
**Solution:**

1. Check [model availability](https://ai.google.dev/gemini-api/docs/models)
2. Try alternative model: `gemini-2.5-pro-preview` or `gemini-2.5-flash-preview`

---

## Checking Quotas

```bash
# View current quotas
gcloud compute project-info describe --project=$PROJECT_ID

# View API usage
gcloud alpha monitoring dashboards list
```

Or via Console:

- [IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)
- Filter by "Generative Language API"

---

## Cost Estimates

**Gemini 2.5 Computer Use Pricing** (as of Oct 2025):

- Input: ~$0.001 per 1K characters
- Output: ~$0.002 per 1K characters
- Images: ~$0.0025 per image

**Estimated Cost per Test:**

- 1 screenshot analysis: ~$0.01
- 5 browser actions: ~$0.05
- **Total per iteration:** ~$0.06

**Monthly estimate (100 iterations):** ~$6.00

---

## Next Steps

1. ✅ Enable billing
2. ✅ Enable APIs
3. ✅ Create API key
4. ✅ Test with curl
5. ✅ Update VIZTRTR config
6. ✅ Run test script
7. 📊 Monitor usage and costs

---

**Created:** October 13, 2025
**Status:** Setup Guide
**Project:** VIZTRTR Gemini Computer Use Integration

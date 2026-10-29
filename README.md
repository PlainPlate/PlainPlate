# Plain Plate v0.1

Grams-first food tracker. Official food data (Ciqual 2025), Greek and English, no accounts. Everything stays on the phone.

## Put it online (GitHub Pages, ~10 min)

1. Sign in at github.com → **+** (top right) → **New repository**.
2. Name: `plain-plate`. Set **Public**. Click **Create repository**.
3. On the new page click **uploading an existing file**.
4. Unzip `plain-plate.zip` on your computer. Open the `plain-plate` folder, select **everything inside it** (not the folder itself) and drag it into the browser. Folders `fonts` and `icons` must come along.
5. Click **Commit changes**. Wait for the upload to finish.
6. **Settings** → **Pages** (left menu) → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → **Save**.
7. Wait 1–2 minutes. Refresh the Pages screen. The address appears at the top: `https://YOUR-NAME.github.io/plain-plate/`.

## Install on a phone

- **Android (Chrome):** open the address → menu ⋮ → **Add to Home screen** / **Install app**.
- **iPhone (Safari):** open the address → Share → **Add to Home Screen**.

After the first visit it works offline. Barcode lookups need internet.

## Updating later

Upload the changed files the same way (they replace the old ones). Then open `sw.js`, change `pp-v0.1.0` to a new number (e.g. `pp-v0.1.1`) and commit. Phones pick up the new version on the next open or the one after.

## Data and credits

- Food composition: **Ciqual 2025**, ANSES (French Agency for Food, Environmental and Occupational Health & Safety), version 2025-11-03. 3,304 foods. Greek names added for 1,906.
- Barcodes: **Open Food Facts** (Open Database License), fetched live, kept separate from official data.
- Equations: Mifflin–St Jeor; FAO/WHO/UNU 2004 activity levels; 2024 Adult Compendium of Physical Activities.
- Reference values: WHO and EFSA, shown side by side.
- Fonts: Commissioner, JetBrains Mono (SIL Open Font License).

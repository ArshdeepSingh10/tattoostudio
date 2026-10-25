# Tattoo Studio Catalog (flash designs & portfolio) – Setup Guide (no coding needed)

## 1. Google Sheet + Apps Script
1. Create a new Google Sheet. Rename the first tab to **Products** (any name works; setup creates it).
2. Menu **Extensions > Apps Script**. Delete the sample code, paste all of `Code.gs`, click Save.
3. In Apps Script: **Project Settings (gear) > Script Properties > Add**:
   `ADMIN_PASSWORD` (your choice), `CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (from Cloudinary dashboard).
4. Pick function **setup** in the toolbar, click **Run**, approve permissions. Headers + 3 sample rows appear.

## 2. Deploy the Web App
1. **Deploy > New deployment > type: Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy.
2. Copy the **Web app URL** (ends in /exec).
3. **After ANY change to Code.gs:** Deploy > Manage deployments > pencil icon > Version: **New version** > Deploy. (The URL stays the same.)

## 3. Cloudinary
1. Sign up at cloudinary.com. Copy your Cloud name, API Key, API Secret.
2. **Settings > Upload > Upload presets > Add**: Signing mode **Unsigned**, Folder **catalog**, Allowed formats **jpg,png,webp,gif**. Save and note the preset name.
   (The 5 MB limit is enforced by the admin page; you can also lower the max file size in your Cloudinary security settings.)

## 4. Configure + host
1. Edit `config.js`: paste Web App URL, Cloud name, preset name, shop name, WhatsApp number (e.g. 919876543210).
2. Upload `index.html, admin.html, app.js, admin.js, style.css, config.js` to a GitHub repo, then **Settings > Pages > Deploy from branch**; or drag the folder onto netlify.com/drop.
3. Public catalog: `your-site/`  Admin: `your-site/admin.html`

## Notes
- Editing the Sheet by hand shows on the site within ~60 seconds (cache). Keep Status as Active/Hidden.
- 5 wrong passwords lock login for 10 minutes. Sessions last 6 hours.
- Import/Export CSV uses the same columns as the Sheet. Use "Template" for the format.
- Deleting a product removes its Cloudinary images first; if that fails the product is kept and an error shows.

## Tattoo studio field mapping
Sheet columns are unchanged. In the admin form they now mean: Category = Style, Brand = Artist, Model = Size / Placement, Price = Starting price, Discount Price = Offer price, Stock = Slots available (0 shows "Booked"), Specifications = Details.
Upload `shop.css` and `admin.css` too (style.css is no longer used).

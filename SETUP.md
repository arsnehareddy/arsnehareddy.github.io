# Google login for Sneha's portfolio

The site and its original photos are prepared. Google login and online publishing
become active only after the following one-time account setup. They are not active
in this download yet. No account has been created and nothing has been deployed.

Owner: **snehareddypatlolla05@gmail.com**

## 1. Create the backend

1. Open https://supabase.com/dashboard and create a NEW project.
2. Select a plan yourself. The free plan currently has 1 GB storage, 5 GB egress,
   a 50 MB individual upload limit, and can pause after one week of inactivity.
   Original photos use substantial bandwidth. Check usage as your portfolio grows.
3. Open SQL Editor. Paste the contents of `backend.sql` and run it.
4. In the project settings, find the project URL and **publishable key**
   (or legacy `anon` key). Set these in `config.js`, or use `configure.html`
   to generate the configuration file without editing code.
5. Never place a `service_role`, `sb_secret_...`, or Google client secret in
   `config.js`. The website needs only the public project URL and publishable key.

## 2. Connect your Google account

1. In Supabase, open Authentication → Sign In / Providers → Google.
2. Copy the callback URL shown there. It normally looks like
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
3. Open https://console.cloud.google.com/auth/overview and create/select a project.
4. Configure the Google Auth Platform branding and audience. For a private owner
   login you can initially use Testing and add **snehareddypatlolla05@gmail.com**
   as a test user. Use only the standard email, profile and openid scopes.
5. Create a Web application OAuth client. Use
   `https://arsnehareddy.github.io` as an authorized JavaScript origin, and the
   Supabase callback URL from step 2 as the authorized redirect URI.
6. Paste the Google Client ID and Client Secret into the Supabase Google provider
   settings and enable it. Keep the client secret only in the provider settings.
7. Disable other sign-in providers if you do not need them. The database checks
   your verified Google identity, so other providers cannot gain editing access.
8. In Supabase Authentication → URL Configuration, set Site URL and the allowed
   redirect URL to **https://arsnehareddy.github.io/**, including its final slash.

Google/Supabase dashboard labels may change; use their official Google login guide:
https://supabase.com/docs/guides/auth/social-login/auth-google

## 3. Upload once

Keep the old private editor as your backup outside the GitHub repository.

Copy ONLY these files/folders into the root of your cloned GitHub repository:

- `index.html`
- `config.js`
- `editor.js`
- `gestures.js`
- `cloud.js`
- `cloud.css`
- `assets/` (the extracted original photos)

Use GitHub Desktop to commit and Push origin. Do not upload the whole ZIP through
GitHub's browser. `backend.sql`, this guide, `configure.html` and the test report
are setup materials; they are not needed in the live repository.

The compact update ZIP has all code but omits the 94 MB initial originals. If your
repository already contains these EXACT photos with the same filenames, you can
use that ZIP. Otherwise use the full package's assets folder. Your supplied editor
contained 31 unique originals; the manifest has their byte counts and SHA-256 hashes.

## 4. Change your site online

1. Visit https://arsnehareddy.github.io/ and select **Owner login** in the footer.
2. Select **Continue with Google** and your authorized Google account.
3. Select **Edit website**, then change text, project descriptions, covers, founder
   photo, hero image or intro video. Use **Add project** and **Add project photos**
   for new work. A project must be opened to edit its description and gallery.
4. **Save draft** stores changes online without changing the public portfolio.
5. **Publish** uploads new original photo/video files and saves the public content.
6. Visitors see published changes when they open or refresh the site. You do not
   need to upload website files again for these content edits.
7. **Open saved draft** retrieves the cloud draft on another device. Sign out when done.

New media is uploaded without resizing or JPEG recompression. HEIC/HEIF browser
support varies; JPG/PNG/WebP/AVIF are safer for viewers on different devices.
No image processing can restore detail missing from a low-resolution source.

Draft text is owner-only. Photo URLs uploaded while preparing drafts are public
media URLs, even before a draft is published. Do not use this public-portfolio
workflow for confidential client images. Removed photos remain stored; deleting
unused originals requires a deliberate cleanup in the Supabase Storage dashboard.

If Supabase is paused/unreachable, visitors see the initial static portfolio copy.
It can be older than the latest cloud version. Resume the project to restore the
current cloud content. Login/publishing requires HTTPS; use the hosted site, not
double-clicking a local HTML file.

## Verification still needed on your real accounts

JavaScript syntax checks passed, and all 31 extracted images were verified
byte-for-byte against the uploaded portfolio. Browser testing could not run in
this environment because the browser download failed. Google OAuth, editing,
publishing, mobile behavior, and Supabase access policies still need testing
after you connect your accounts. Before replacing your
live site, check that a different Google account and a logged-out visitor cannot
write a draft, publish content, or upload media. They should receive denied access.

Official references:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/pricing

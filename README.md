# Hymn Playlist: hosting on Firebase

This folder is ready to deploy. `public/index.html` is the whole app.

## One-time setup

1. Go to https://console.firebase.google.com and create a project (any name, e.g. `hymn-playlist`). Google Analytics is not needed. The free Spark plan is enough; Hosting does not need billing.
2. Install the Firebase tools if you don't have them: `npm install -g firebase-tools`
3. Sign in: `firebase login`
4. In `.firebaserc`, replace `YOUR-PROJECT-ID` with your project's ID (shown in the Firebase console under Project settings).

## Deploy (and redeploy after any update)

From this folder:

    firebase deploy --only hosting

Firebase prints a link like `https://hymn-playlist.web.app`. Bookmark it on the streaming computer.

## First use

1. Open the link in **Chrome or Edge** (folder linking does not work in Firefox or Safari).
2. Press **Choose music folder** and pick your music folder, for example the one in Google Drive for desktop (`G:\My Drive\...`). Allow the browser to view and edit files there.
3. The app plays straight from that folder. It writes one small file into it, `hymn-playlist-data.json`, holding your playlists, on-screen details, used dates and hymn numbers. Don't delete that file.

When you come back, Chrome may ask you to allow the folder again: press **Reconnect** in the Library. Choosing "Allow on every visit" stops the question.

New downloads: drag them onto the page (they're copied into the folder you have open in the Library), or put them in the folder yourself and press **Rescan**. Move or rename files on your computer or in Drive, then press **Rescan**.

The motion background and still graphic are still kept in the browser. Keep the original files in your Drive so you can pick them again if needed.

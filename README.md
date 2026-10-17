# Hymn Playlist: hosting on Firebase

This folder is ready to deploy. `public/index.html` is the whole app.

## One-time setup

1. Go to https://console.firebase.google.com and create a project (any name, e.g. `hymn-playlist`). Google Analytics is not needed. The free Spark plan is enough; Hosting does not need billing.
2. Install the Firebase tools if you don't have them: `npm install -g firebase-tools`
3. Sign in: `firebase login`
4. `.firebaserc` already points at the project `zoommedia-e2d78`. Only if you deploy to a different project, replace that ID with yours (shown in the Firebase console under Project settings).

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

### Scriptures on screen

Under **Your text on screen**, press **Add scriptures or a list**, choose **Scriptures**, and type or paste references such as `John 3:16, Moroni 10:4, D&C 4:2, Alma 32:21-23`. Full book names and the usual abbreviations both work. Choose **Whole range on one screen** to show a range as one item, or **One verse at a time** to give each verse its own item, one after another. Each item shows the verse with its reference on a line underneath. A reference with a typo is listed with the reason and left in the box to fix; the others are still added.

### Tap to place

In the same panel, press **Add to the tap queue** instead of **Put on the timeline**. You can also queue your own messages: choose **My own text, one per line**. Then play the mix and press **Enter** (or **Place next**) at each moment you want the next item to appear. Playback keeps going. If the item before is still showing, it fades out as the new one fades in. **Backspace** undoes the last tap and puts that item back at the front of the queue. When the preview is floating, it has its own **Place next** button.

### Reading time

Tick **Show for as long as it takes to read** on any text item to make it stay up just long enough to read: at least 4 seconds, plus its fades. Set how fast people read with **Reading speed for on-screen text** in Mix settings. Scriptures and tapped items use reading time automatically. Dragging the end of an item on the timeline switches reading time off for that item.

## Scripture text

The files in `public/scriptures/` hold the verse text. They are built from the public-domain data at https://github.com/bcbooks/scriptures-json by running, from this folder:

    node tools/build-scriptures.mjs

Run it again only to refresh the text. The app loads each volume the first time it's needed, so it needs an internet connection to show scriptures.

## Tests

From this folder, with Node 22 or newer:

    node --test "tests/*.test.mjs"

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

### Placing text

Every text item sits in a box. Select a text, then drag inside its box in the preview to move it, or drag an edge or corner to resize it. Lines wrap at the box edges. **Line up** sets left, centered or right, and **Up and down** sets top, middle or bottom. Text shrinks to fit the box, down to a smallest readable size; **Largest size** is as big as it gets. The **Top**, **Upper third**, **Center** and **Lower third** buttons move the box without resizing it.

### The text list

Each row in **Your text on screen** shows one line. The arrow on the right shows the whole text, and **Collapse all** closes every row you opened. Clicking a row opens its settings right under it, with **Done** at the top and the bottom.

To remove several at once, tick their rows (or **Select all**) and press **Remove selected**. Ctrl+click (⌘+click on a Mac) a row, or a text block on the timeline, to tick it. While anything is ticked, clicking a row ticks it instead of opening it. **Delete** removes the ticked items and **Esc** clears the ticks. Removing always asks first. To remove a single item, open it and press **Remove this text**.

**Moving several at once.** Tick the items, then drag any ticked block on the timeline, or use the arrow keys or the **‹ 1 s** / **0.1 ›** buttons. They all move by the same amount, so the gaps between them stay the same. Locked items, items shown for the whole video, items that start at 0:00 and items tied to a song or talk stay put, and the bar under the timeline says how many stayed and why. Nothing moves before 0:00.

**Hiding.** Press the eye on a row (or **Hide selected**) to hide an item. It stays on the timeline, dimmed with a dashed edge, and keeps its place in the timing, but it isn't shown in the preview or the video. Press the eye again to show it.

**Groups.** Tick items and press **Group selected**, then type a name and press Enter. A group is a heading in the list that you can open and close, with an eye to hide or show the whole group. On the timeline, drag the group's bar to move all of it, or click the bar to tick its items. **Duplicate** makes a copy at the same times (for example "take 3" from "take 2") and hides the original, so you can try a different set and switch between them. **Ungroup** keeps the items; **Remove group and its items** deletes them (it asks first). Inside a group, "Start right after the previous text" and "Keep showing until the next text starts" look only at texts in the same group. To take one item out, open it and press **Take it out of the group**.

### Scriptures on screen

Under **Your text on screen**, press **Add scriptures or a list**, choose **Scriptures**, and type or paste references such as `John 3:16, Moroni 10:4, D&C 4:2, Alma 32:21-23`. Full book names and the usual abbreviations both work. Each reference becomes one block on the timeline, and you choose how it plays:

- **All at once** shows every verse together.
- **One verse at a time** shows each verse in turn, crossfading from one to the next.
- **Build up verse by verse** adds each verse under the ones before, and the earlier ones stay.

You can change this later in the text editor. Each verse starts on its own line with a small raised verse number (a single verse has none). The full reference, for example `Luke 3:10–15`, shows at the bottom or, if you choose **Reference at the top**, above the verses. Selecting a one-verse-at-a-time passage shows its longest verse in the preview, so you size the box for the worst case. A reference with a typo is listed with the reason and left in the box to fix; the others are still added. Playlists made before this keep their separate verse items.

### Tap to place

In the same panel, press **Add to the tap queue** instead of **Put on the timeline**. You can also queue your own messages: choose **My own text, one per line**. Then play the mix and press **Enter** (or **Place next**) at each moment you want the next item to appear. Playback keeps going. If the item before is still showing, it fades out as the new one fades in. **Backspace** undoes the last tap and puts that item back at the front of the queue. When the preview is floating, it has its own **Place next** button. A scripture passage is one entry in the queue, and one **Enter** places the whole passage.

### Reading time

Tick **Show for as long as it takes to read** on any text item to make it stay up just long enough to read: at least 4 seconds, plus its fades. Set how fast people read with **Reading speed for on-screen text** in Mix settings. Scriptures and tapped items use reading time automatically. Dragging the end of an item on the timeline switches reading time off for that item.

## Scripture text

The files in `public/scriptures/` hold the verse text. They are built from the public-domain data at https://github.com/bcbooks/scriptures-json by running, from this folder:

    node tools/build-scriptures.mjs

Run it again only to refresh the text. The app loads each volume the first time it's needed, so it needs an internet connection to show scriptures.

## Tests

From this folder, with Node 22 or newer:

    node --test "tests/*.test.mjs"

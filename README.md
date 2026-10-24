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

Firebase prints the site link: `https://zoommedia-e2d78.web.app`. Bookmark it on the streaming computer.

## First use

1. Open the link in **Chrome or Edge** (folder linking does not work in Firefox or Safari).
2. Press **Choose music folder** and pick your music folder, for example the one in Google Drive for desktop (`G:\My Drive\...`). Allow the browser to view and edit files there.
3. The app plays straight from that folder. It writes one small file into it, `hymn-playlist-data.json`, holding your playlists, on-screen details, used dates and hymn numbers. Don't delete that file.

When you come back, Chrome may ask you to allow the folder again: press **Reconnect** in the Library. Choosing "Allow on every visit" stops the question.

**Saved playlists.** Type a name in the box at the top and the playlist is kept in the **Open** list. From then on it saves itself after every change; the note beside the name says **Saved**. An unnamed playlist is still kept in this browser, but it isn't in the list. Changing the name renames the saved playlist, and asks first if that name is already taken. **Save a copy** makes "<name> copy" and opens it, so the original stays as it was. **Delete saved** asks first, then leaves what's open without a name. Undo doesn't change the name. Saved playlists travel in `hymn-playlist-data.json` with everything else.

The folder can also hold videos (.mp4, .mov, .m4v, .webm) and pictures (.jpg, .png, .webp); see **Pictures and video clips** below.

New downloads: drag them onto the page (they're copied into the folder you have open in the Library), or put them in the folder yourself and press **Rescan**. When you switch back to the app, it checks your music folder again on its own, so files you added, moved or removed show up without pressing anything. **Rescan** still does the same by hand.

The motion background and still graphic are still kept in the browser. Keep the original files in your Drive so you can pick them again if needed.

**Background.** Under **Background**, **Color** is a plain color behind the titles (it replaces Plain dark, and older playlists keep the same look). Choose **Fade, top to bottom** to go from a top color to a bottom color, or **Flat** for one color. Pick a color with the color box, a ready-made swatch, or **Recent** (your last 8 colors, which travel with your music folder). Swatches and recent colors go to the color box you clicked last, which has a colored outline. The color is saved with each playlist and in the exported video. When a motion background or graphic isn't available, the Color background is used. On a light color, give your text a **Dark box** or **Soft outline** so it stays readable.

**On-screen details.** **On-screen details** sets what shows on screen while a song or talk plays. It's saved with the recording, so it carries over to future mixes. Use **Previous**, **Next** or the list at the top of the window to go through every song, talk and video clip on the timeline, songs first, then talks, each from left to right. Moving to another recording saves the one you were on. **Cancel** only throws away changes to the recording showing now.

### Source links and missing files

Every recording in the library can keep the web link it came from. Press ⋯ on its row, paste the address into **Source link**, and **Open** takes you back there. A talk with an on-screen **Link** uses that link when it has no source link of its own.

This lets you delete large files, such as Conference videos, to save space. A recording whose file is gone but has a link is listed under **Missing files** at the bottom of the library, with the folder it was in and **Open link**. Download it again into the same folder and it comes back with its link, on-screen details, used dates and trims. If the new download's size is a little different, the app asks "Is this the same recording?" Press **Yes, same recording** to reconnect it, then check its trim. **Don't list** takes a recording off the Missing files list without losing its details.

### Placing text

Every text item sits in a box. Select a text, then drag inside its box in the preview to move it, or drag an edge or corner to resize it. Lines wrap at the box edges. **Line up** sets left, centered or right, and **Up and down** sets top, middle or bottom. Text shrinks to fit the box, down to a smallest readable size; **Largest size** is as big as it gets. The editor shows the size it's actually showing at, for example "Showing at 58 px", so you can match items by number. Tick **Fixed size** to keep the text at exactly the size you set: it still wraps at the box edges but never shrinks. If the text is then too long for its box, it runs past the box and both the editor and the item's row in the list say **Doesn't fit**. The **Top**, **Upper third**, **Center** and **Lower third** buttons move the box without resizing it. **Left**, **Top**, **Width** and **Height** under **Place on screen** set the box exactly, in % of the screen.

**Behind the text** sets what's drawn behind the letters: **Nothing**, a **Soft shadow**, a **Soft outline** (an even glow around every letter that keeps light text readable on a bright background; set its color, opacity, width and softness) or a **Dark box** (set its color and opacity). New text starts with the look of the last text you edited.

**Fonts.** The **Font** menu has eight fonts chosen to read well on a stream: Clean (Figtree), Atkinson Hyperlegible, Source Sans and Montserrat, and Classic (Libre Caslon), Lora, Merriweather and Libre Baskerville. Tick **Bold** or **Italic** under it. A box is greyed out when the font doesn't come in that style (Libre Caslon has no bold italic, for example). To use another font, find it on [fonts.google.com](https://fonts.google.com), choose **Add a font…** at the bottom of the menu, and type its name as shown there, or paste its link. It's added to the menu under **Your fonts** and saved in your music folder's data file, so it's there on any computer that uses that folder. **Remove** takes it out of the menu; texts that used it switch to Clean. Fonts need an internet connection the first time they're used, and an export stops with a message if a font can't be loaded.

While you drag or resize a box, faint blue outlines show every other text, scripture and song or talk title that will be on screen at any point during that item's time, so you can keep them apart. Dragging the song and talk title position shows the outlines of the texts that overlap any title. The outlines go away when you let go and never show in the video.

### The text list

Each row in **Your text on screen** shows one line. The arrow on the right shows the whole text, and **Collapse all** closes every row you opened. Clicking a row opens its settings right under it, with **Done** at the top and the bottom. The list is in the same order as the text rows on the timeline, and a new text slots in by its start time, both in the list and on the timeline.

To remove several at once, tick their rows (or **Select all**) and press **Remove selected**. Ctrl+click (⌘+click on a Mac) a row, or a text block on the timeline, to tick it. While anything is ticked, clicking a row ticks it instead of opening it. **Delete** removes the ticked items and **Esc** clears the ticks. Removing always asks first. To remove a single item, open it and press **Remove this text**.

**Moving several at once.** Tick the items, then drag any ticked block on the timeline, or use the arrow keys or the **‹ 1 s** / **0.1 ›** buttons. They all move by the same amount, so the gaps between them stay the same. Locked items, items shown for the whole video, items that start at 0:00 and items tied to a song or talk stay put, and the bar under the timeline says how many stayed and why. Nothing moves before 0:00.

**Rows on the timeline.** Drag a text block or a group's bar up or down to put it on another row. The other rows shift to make room, and a line shows where it lands. Ctrl+click (⌘+click) several texts first to move them together; they land side by side. A group moves as one block. Inside an open group, dragging one of its texts up or down only reorders the group. Holding **Shift** while dragging locks the drag to one direction, rows only or time only, and also turns snapping off. Locked texts can still change rows; only their time is fixed. **Sort by start** (next to the zoom buttons) lines the rows up with the earliest start on top. Rows only change how the timeline and the list are laid out: which text is drawn on top in the video stays the same. One **Undo** reverses a row drag or a sort.

**Editing several at once.** Tick the items and press **Edit selected** (above the list, or in the bar under the timeline). The settings open above the list, and only what you change is copied to all of them; everything else stays as it was on each item. Where the ticked items differ, the setting says **Mixed**. The text itself, **Starts at** and **Show during** are set one item at a time. Timing changes skip locked items, items shown for the whole video, items tied to a song or talk, and items where another setting already decides that timing, and a note says how many stayed and why. Look and box changes apply to all of them. Scripture settings are off when scriptures and plain text are ticked together. The **Tick:** buttons replace the ticks with **All scriptures**, **All my own text**, **Hidden**, **Showing**, or **Same look as the open one** (the same font, bold and italic, size, Fixed size, color and what's behind the text). One **Undo** reverts a whole bulk change.

**Hiding.** Press the eye on a row (or **Hide selected**) to hide an item. It stays on the timeline, dimmed with a dashed edge, and keeps its place in the timing, but it isn't shown in the preview or the video. Press the eye again to show it.

**Groups.** Tick items and press **Group selected**, then type a name and press Enter. A group is a heading in the list that you can open and close, with an eye to hide or show the whole group. On the timeline, drag the group's bar to move all of it, or click the bar to tick its items. **Duplicate** makes a copy at the same times (for example "take 3" from "take 2") and hides the original, so you can try a different set and switch between them. **Ungroup** keeps the items; **Remove group and its items** deletes them (it asks first). Inside a group, "Start right after the previous text" and "Keep showing until the next text starts" look only at texts in the same group. To take one item out, open it and press **Take it out of the group**.

**Collapsing a group.** Press the arrow on the group's heading in the list, or on its bar on the timeline, to collapse it. The list then shows just the heading, and on the timeline the whole group fits on one row with all its texts on a single lane. The arrow does the same in both places. Clicking a text in a collapsed group opens its settings under the heading, and the group stays collapsed. Drag the bar to move a collapsed group; its texts can still be dragged left or right in time. Collapsed groups are remembered with the playlist and aren't an **Undo** step.

**Stretch or squeeze a group.** Drag either end of a group's bar on the timeline to make the group start earlier or later, or end earlier or later. The texts rearrange to fill the new length, following the group's **Fill** choice in its heading in the list:

- **Evenly spaced**: the first starts at the start, the last ends at the end, with equal gaps of at least 2 seconds.
- **One after another, finish early**: back to back, each crossfading into the next. Any time left at the end stays empty.
- **One after another, stretched to fill**: back to back with crossfades, and each stays on screen longer so they fill the whole length. This turns off "Show for as long as it takes to read" on those texts. Squeezing the group again, or picking another choice, gives them back their own length.

A group can't be squeezed shorter than its texts need, and it can't start before 0:00. Changing **Fill** or pressing **Reset** arranges the texts once. After that you can nudge any text by hand and it stays put. Texts that are locked, show for the whole video, start at 0:00, or are tied to a recording stop the group from being arranged, and a note says which. "Start right after the previous text" and "Keep showing until the next text starts" are turned off inside the group when it's arranged, because the group's choice now decides the timing. Hidden texts keep their place. One **Undo** reverses a whole drag, Fill change or Reset.

### Scriptures on screen

Under **Your text on screen**, press **Add scriptures or a list**, choose **Scriptures**, and type or paste references such as `John 3:16, Moroni 10:4, D&C 4:2, Alma 32:21-23`. Full book names and the usual abbreviations both work. Each reference becomes one block on the timeline, and you choose how it plays:

- **All at once** shows every verse together.
- **One verse at a time** shows each verse in turn, crossfading from one to the next.
- **Build up verse by verse** adds each verse under the ones before, and the earlier ones stay.

You can change this later in the text editor. Each verse starts on its own line with a small raised verse number (a single verse has none). The full reference, for example `Luke 3:10–15`, shows at the bottom or, if you choose **Reference at the top**, above the verses. It's the same size as the verses and shrinks with them, and a long reference wraps onto a second line. Selecting a one-verse-at-a-time passage shows its longest verse in the preview, so you size the box for the worst case. A reference with a typo is listed with the reason and left in the box to fix; the others are still added. Tick **Add them as a group** to put them on the timeline as one new group, back to back with crossfades, ready to stretch. Type a name, or leave it empty for "Scriptures 1" (or "Text 1" for your own lines). The box starts unticked each time you open the panel, and **Add to the tap queue** ignores it. Playlists made before this keep their separate verse items.

### Tap to place

In the same panel, press **Add to the tap queue** instead of **Put on the timeline**. You can also queue your own messages: choose **My own text, one per line**. Then play the mix and press **Enter** (or **Place next**) at each moment you want the next item to appear. Playback keeps going. If the item before is still showing, it fades out as the new one fades in. **Backspace** undoes the last tap and puts that item back at the front of the queue. When the preview is floating, it has its own **Place next** button. A scripture passage is one entry in the queue, and one **Enter** places the whole passage.

**Preview sizes.** When the preview is floating, **Phone** shrinks or grows it to about the size of the video on a phone turned sideways, so you can check the text is readable for people watching on a phone. To match your own phone, hold it up to the screen, drag the preview to the same size, then press **Save…** and **Phone**. Phone remembers that size, also after closing the browser; to change it, save again. **1** and **2** remember other sizes you like: press **Save…** then **1** or **2** to store the current size, and press **1** or **2** later to go back to it. An empty **1** or **2** saves on the first click. Sizes change the width only, and the preview stays where it is. The buttons sort themselves from the smallest size to the biggest, so you can see where Phone falls between 1 and 2; a 1 or 2 with nothing saved yet comes last.

### Scripture collection

**Scripture collection** keeps the references you'd like to use again. Type or paste one or more, such as `Alma 32:21-23, John 3:16`, and press **Add to collection**. A reference that's already there is refused. One that only overlaps another, such as Alma 32:21 next to Alma 32:21–23, is fine. After adding, the app suggests tags from your own tags on nearby verses and from words in the verse text. Click a suggestion to keep it, or **No thanks**.

Click a reference to read its verses, add or remove tags, and see **Used in**: each video it was in, when, and how long ago. A use of a longer passage counts for every verse in it. **Tag** at the top shows only the references with that tag.

**Random pick** chooses one for you, from the tag you picked if there is one. It picks never-used references first, then the ones used longest ago, and never one that overlaps a scripture already in this video. **Put on the timeline** places the open reference at the playhead, and asks first if it overlaps a scripture already there.

A use is recorded when you export with **Mark these recordings and scriptures as used on** ticked, for every scripture showing in the video. **Remove from collection** asks first. Where a removed reference was used is kept, so adding it back brings its history with it. The collection is saved in your music folder's data file, like your playlists. Undo doesn't cover changes to the collection.

### Filling a stretch with scriptures

Press **Choose a stretch** in the Scripture collection, then click a gap between texts on the timeline, or drag across the stretch you want. **Esc** cancels. Choose how the passages show (**One verse at a time** to start with), then tick references. Each shows how long it takes to read. Ones that no longer fit are greyed out, and a warning shows when one overlaps a scripture in the video or another tick. **Random fill** ticks more for you by the same rules as Random pick.

**Place** spaces them evenly: the first starts where the stretch starts, the last ends where it ends, with equal gaps of at least 2 seconds. A single passage is centred. They become ordinary scripture blocks, and one **Undo** takes them all away. If the stretch you dragged across already has texts, **Space evenly** spreads them out the same way, keeping their order and length. Locked texts, texts tied to a song or talk, and texts that follow the one before can't be moved, so it tells you and leaves everything as it was.

### Pictures and video clips

**Video clips.** A video in the library has a **Video** tag, and its second button reads **Clip**. Press **Clip** and it goes into **Spoken clips over the music**, and Trim opens so you can pick the part you want. The clip plays in a window in the lower right of the screen, over your background, and the music steps aside while it talks, just like a spoken clip. Its row has **Show the picture** (untick it to hear the talk with no picture) and a **Picture** button that opens its settings. Talks you added as spoken clips before this change stay sound-only until you tick **Show the picture**.

**Picture only.** In a clip's picture settings, untick **Play its sound** to show the picture with no sound. The music doesn't dip under a clip that has no sound. A video with no sound track at all shows a **No sound** tag and is always picture only; its **Add** button (for the music lane) is off.

**Pictures.** A picture in the library (.jpg, .png, .webp) has one **Add** button. It puts the picture on the timeline at the playhead for 8 seconds, filling the screen with a slow zoom. If a picture is already showing there, the new one starts as that one fades out, so pressing **Add** on several pictures in a row makes them crossfade one into the next. Pictures sit on their own rows on the timeline, under the spoken clips: drag a block to move it, or drag its right edge to change how long it shows.

**The picture settings.** Click a picture or clip in **Pictures and video on screen** (or on the timeline) to open its settings:

- **Where**: **Full screen**, the four corners, or **Center**. **Left**, **Top**, **Width** and **Height** set the box exactly, in % of the screen. **Match the picture's shape** makes the box the same shape as the picture, keeping its width and center.
- **Fit**: **Fill the box** crops the edges so there are no bars; **Show the whole picture** fits all of it inside the box.
- **Rounded corners** and **Soft shadow**: on for the window positions, off for **Full screen**. Tick them to change that.
- **Fade in** and **Fade out**, in seconds.
- For pictures: **Starts at**, **Shows for**, **Motion** (None, Slow zoom in, Slow zoom out, Drift left, Drift right, Drift up, Zoom and drift, Slight turn) and **Strength** (**Subtle** or **Medium**). The motion runs over the picture's whole time on screen, fades included, and the picture is always made just big enough that its edges never show.

**Moving boxes in the preview.** Select a picture or clip, then drag inside its box in the preview to move it, or drag an edge or corner to resize it, the same as text. It snaps to the center and the text place lines; hold **Shift** to place it freely.

**What's on top.** Titles and your own text are always on top of pictures. Among pictures, the one that starts later is on top. Several pictures can show at once, and their boxes can overlap.

**Exporting.** With video clips or moving pictures, the video is built at 30 frames a second, so it takes longer: 10 minutes or more for a full mix.

**Large videos.** A clip's sound is read from the whole file the first time you use it, so a smaller download (720p or 360p) is quicker and uses less memory than 1080p. The picture is read a little at a time. Some downloads use a "streaming" MP4 format the app can't read; it says so, and a regular MP4 download works. If a video or picture can't be read, its row says why, and an export stops with the reason instead of leaving it out.

### Undo and redo

Press **Undo** and **Redo** at the top, or **Ctrl+Z** and **Ctrl+Y** (**⌘Z** and **⌘⇧Z** on a Mac). You can go back up to 50 steps. Undo covers everything in the open playlist: text items, pictures and video clips, songs and talks, mix settings and the tap queue. A whole drag counts as one step. While you are typing in a box, Ctrl+Z undoes your typing as usual. Some things are not undone: copying files into the music folder, Rescan, reconnecting a missing recording, choosing a folder, the motion background and still graphic, and opening another playlist. Undo history starts fresh when you open the app or switch playlists. **Backspace** still undoes the last tap while placing.

### Reading time

Tick **Show for as long as it takes to read** on any text item to make it stay up just long enough to read: at least 4 seconds, plus its fades. Set how fast people read with **Reading speed for on-screen text** in Mix settings. Scriptures and tapped items use reading time automatically. Dragging the end of an item on the timeline switches reading time off for that item.

## Scripture text

The files in `public/scriptures/` hold the verse text. They are built from the public-domain data at https://github.com/bcbooks/scriptures-json by running, from this folder:

    node tools/build-scriptures.mjs

Run it again only to refresh the text. The app loads each volume the first time it's needed, so it needs an internet connection to show scriptures.

The verse text is checked against the Church's published list of changes in the 2013 edition (`tests/scripture-2013.test.mjs`, with the list in `tests/scripture-2013-changes.json`). Official Declarations 1 and 2 aren't included, because they're documents rather than numbered verses.

## Tests

From this folder, with Node 22 or newer:

    node --test "tests/*.test.mjs"

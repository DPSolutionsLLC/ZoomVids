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

**Behind the text** sets what's drawn behind the letters: **Nothing**, a **Soft shadow**, a **Soft outline** (an even glow around every letter that keeps light text readable on a bright background; set its color, opacity, width and softness), a **Solid outline** (a crisp edge around every letter, like classic karaoke; set its color and **Thickness**) or a **Dark box** (set its color and opacity). New text starts with the look of the last text you edited. In karaoke, new lyric slides use the song's own look instead (see Song settings).

**Fonts.** The **Font** menu has eight fonts chosen to read well on a stream: Clean (Figtree), Atkinson Hyperlegible, Source Sans and Montserrat, and Classic (Libre Caslon), Lora, Merriweather and Libre Baskerville. Tick **Bold** or **Italic** under it. A box is greyed out when the font doesn't come in that style (Libre Caslon has no bold italic, for example). To use another font, find it on [fonts.google.com](https://fonts.google.com), choose **Add a font…** at the bottom of the menu, and type its name as shown there, or paste its link. It's added to the menu under **Your fonts** and saved in your music folder's data file, so it's there on any computer that uses that folder. **Remove** takes it out of the menu; texts that used it switch to Clean. Fonts need an internet connection the first time they're used, and an export stops with a message if a font can't be loaded.

While you drag or resize a box, faint blue outlines show every other text, scripture and song or talk title that will be on screen at any point during that item's time, so you can keep them apart. Dragging the song and talk title position shows the outlines of the texts that overlap any title. The outlines go away when you let go and never show in the video.

### The text list

Each row in **Your text on screen** shows one line. The arrow on the right shows the whole text, and **Collapse all** closes every row you opened. Clicking a row opens its settings right under it, with **Done** at the top and the bottom. The list is in the same order as the text rows on the timeline, and a new text slots in by its start time, both in the list and on the timeline.

To remove several at once, tick their rows (or **Select all**) and press **Remove selected**. Ctrl+click (⌘+click on a Mac) a row, or a text block on the timeline, to tick it. While anything is ticked, clicking a row ticks it instead of opening it. **Delete** removes the ticked items and **Esc** clears the ticks. Removing always asks first. To remove a single item, open it and press **Remove this text**.

**Moving several at once.** Tick the items, then drag any ticked block on the timeline, or use the arrow keys or the **‹ 1 s** / **0.1 ›** buttons. They all move by the same amount, so the gaps between them stay the same. Locked items, items shown for the whole video, items that start at 0:00 and items tied to a song or talk stay put, and the bar under the timeline says how many stayed and why. Nothing moves before 0:00.

**Changing when a text starts.** Drag the left end of a text block to make it start earlier or later; its end stays where it is. Texts that are locked, show for the whole video, start at 0:00, are tied to a song or talk, or start right after the previous text have no left grip. One **Undo** puts it back.

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

### Floating panels

Every main section has a **Float** button: the timeline (at the end of its zoom buttons), the library, order of music, spoken clips, on-screen text, your text on screen, pictures and video, song and talk titles, talk references, scripture collection, mix settings and export. A floating section stays where you put it while you scroll the page, and keeps working as usual: you can still drag, select and play on a floating timeline, and keyboard shortcuts still work.

- **Move** a panel by dragging its header bar. **Resize** it from the bottom-right corner (or focus the corner and use the arrow keys).
- Panels **snap** to the window edges and to each other when they come within 12 px. Keep dragging past that and they let go, so panels can overlap.
- **Click** a panel to bring it to the front.
- **Put back** in a panel's header returns it to its place in the page. **Reset layout**, at the top next to Undo, puts every floating panel back at once. It only shows while something is floating.
- A section that floats out of another one (for example Your text on screen out of On-screen text) leaves a small note behind, and Put back always returns it to the right place.

The preview floats the same way and keeps its own controls and sizes (see Preview sizes above).

The layout is saved in this browser and comes back when you open the app again. It belongs to this computer only: it's not copied into the music folder's data file, and moving panels never counts as a change to undo. If the window is smaller than your layout, panels are shrunk and nudged into view without losing their saved spots; make the window bigger again and they go back where they were.

### Karaoke workspace

The same app has a second workspace for sing-along videos at `https://zoommedia-e2d78.web.app/karaoke`. The **Karaoke** button at the top of the hymn side takes you there, and **Hymn Playlist** takes you back. Your work on each side is saved before you switch.

Karaoke keeps its own music folder, library, saved projects and settings. Link a different folder there with **Choose music folder**. Karaoke saves into `karaoke-data.json` in that folder, next to your songs. Don't delete it: it holds your karaoke projects. The hymn side keeps using `hymn-playlist-data.json` in its own folder, and neither side ever reads the other's file.

Added Google Fonts, recent background colors and the floating panel layout are also separate for each side. Backgrounds, pictures and video clips, text boxes, Undo and Redo and floating panels all work the same in both.

Karaoke hides the parts that only make sense for sacrament meeting: the Hymn checklist, Talk references to send, the Scripture collection, Mark as used on export, the library's Show filter and the two "used" sorts. Exports are named `karaoke-` and today's date.

You can have both open in two tabs at once. Each keeps its own work. Two tabs on the *same* side still share one working copy, as before.

**Song tracks.** In karaoke, each song in **Order of music** can have two tracks that play together, usually the version with vocals and the instrumental. Press **Tracks** on a song to open its Tracks window. **Track 1** is the song you added. For **Track 2**, choose another file from your library under **Add a second track…** and press **Add**.

- **Lining up.** Adding Track 2 lines it up with Track 1 automatically, usually to within about 20 ms. If it can't find a match, it says so and leaves the offset as it was. That can happen when the two files are different edits or in different keys. **Line up automatically** tries again at any time.
- **Fine-tuning by ear.** Press **Play** and nudge Track 2 with **−0.1 s**, **−0.01 s**, **+0.01 s** and **+0.1 s**, or type the offset in seconds (such as `1.234` or `-0.5`) and press Enter. You hear each change straight away. The sentence under the offset says what it means, such as "Track 2 is moved 1.234 s earlier". **Hear** plays Both, Track 1 or Track 2, only in this window, and doesn't change the song.
- **Waveforms.** Track 1 is drawn on top and Track 2 below, shifted by the offset, so matching beats line up. **Whole song**, **10 s** and **2 s** zoom in. Click the waveforms to listen from there.
- **Each track has its own settings.** **Sound** turns its sound on or off, and **Volume** turns it up or down in dB. **Vocal / Instrumental / Not set** marks which is which. A file with "instrumental", "karaoke", "accompaniment", "backing" or "no vocals" in its name is marked for you. The marks decide what goes into each version when you export (see Two versions).
- **Music videos.** A video added to Order of music fills the screen behind the words. On a video track, **Show the picture** turns its picture on or off, and **Picture…** opens it in Pictures and video clips to move or resize it. If Track 1 already shows a picture, a video added as Track 2 starts with its picture off, so two full-screen pictures don't stack. You can show one track's picture while hearing only the other.
- **Swap tracks** makes Track 2 the main track, so you can trim the song from that track's point of view. The song sounds the same after a swap.
- The two tracks always move together. Moving the song, reordering, changing a crossfade, trimming and swapping all keep them in sync. On the timeline, a song with two tracks shows **+ 2** and a stripe along the bottom, and a song whose Track 1 sound is off looks faded.
- Each change in the Tracks window is one step for Undo.

**Song lyrics.** In karaoke, each song keeps its words in one place: **Song settings → Lyrics**. Pick the song at the top, paste the whole song's words into the box and press **Make slides**. You get one slide per verse or chunk. A few simple marks shape the slides:

- A **blank line** starts a new slide. A single line break stays a new line on the same slide.
- **`Glo-ri-a`** splits a word into syllables. On screen it still reads "Gloria". The syllables will be used later to time and highlight the words.
- **`well--known`** (two hyphens) keeps a real hyphen: "well-known". A hyphen at the start or end of a word, or on its own, stays as you typed it.
- **`High:`** at the start of a line puts that line's words in the part "High". A part name is one word of letters and numbers, up to 15 characters. A tag on a line by itself, such as `Low:`, covers the lines under it until the slide ends. In the middle of a line, `Low:` switches part only when the song already has a part called Low, and **`-:`** means "no part" from there on.
- **`[Chorus]`** on a line by itself names the verse under it (and starts a new verse). Verses without a name are numbered Verse 1, Verse 2…

The slides land back to back as one group named after the song: from the playhead if it's inside the song, otherwise from the song's start. Each starts as long as it takes to read, in the song's look for new slides (see Song settings). Drag each slide to where it's sung, or stretch it to fit.

**Changing the lyrics.** The words stay in **Song settings → Lyrics**, with the same marks. Change them there and press **Update** (or Ctrl+Enter). The song's slides are rebuilt to match, and one Undo puts everything back. Words you didn't change keep their timing, so fixing a typo or adding syllable marks doesn't lose any.

- Clicking a lyric slide highlights its verse in the box and scrolls to it. The slide editor says which slide of the song it is; **Edit the lyrics** jumps to that verse in Song settings. Word timing stays in the slide editor.
- A new **blank line** splits a verse. The new slide shares the time of the one it came from, in the same group, with the song's look for new slides. **Join with next**, above each verse's words, removes the blank line after that verse; the joined slide covers the time of both.
- Deleting a verse's words removes its slides. If they have word timing, it asks first; Cancel keeps everything, including your typing.
- Until you press Update, a note says **Not applied yet**, and **Undo my typing** puts the box back. Typing you haven't applied isn't saved: it's gone after a reload. Each song keeps its own unapplied typing while you switch between songs.
- A verse whose slide you removed stays in the lyrics and shows **(not on the timeline)**. Update doesn't bring it back.
- Duplicated slides and duplicated groups follow the lyrics too: an Update changes every copy, and each keeps its own timing.
- The box, Update, Set part and Join are off while you're recording.
- Projects made before this open with their lyrics already in Song settings, built from their slides. Nothing on screen or in the timing changes.

**Parts.** Under the Lyrics box in Song settings, each word is a chip, grouped by slide, with dots between its syllables and a stripe in its part's color. Click words to pick them (Shift+click picks a run, and **Line** picks a whole line). Then choose a part and press **Set part**. **New part…** asks for a name. Each part gets a color, which you can change in **Song settings**. Picking words waits until you've pressed Update. Each of these is one step for Undo.

**Timing the words.** Open a slide and find **Word timing** in its editor. Each syllable gets its own time, so `Glo-ri-a` is three presses.

- **Record this slide** plays from a few seconds before the slide. **Record the whole song** plays from the start of the song and moves from slide to slide by itself.
- Hold **Space** while each syllable is sung, and let go when it ends. A quick tap counts as at least 0.15 s. The bar above the timeline shows the line, with the next syllable in bold.
- **Backspace** takes back the last syllable and jumps back a moment. **Esc** (or the Stop button) stops and keeps what you've recorded.
- Recording over a slide replaces its old timing as soon as you press its first syllable. One Undo puts back the whole recording.
- **Speed** lets you record at 0.75× or 0.5×. Slower speeds sound lower, but the times still land right at full speed.
- You hear whatever tracks are switched on. If the vocal track's sound is off, a note says so; turn it on in **Tracks** to hear the words.
- After recording, each slide fits itself around its words: it starts 1 s before the first and ends 0.5 s after the last. Its reading time and links are turned off so it keeps that window.

To fix mistakes:

- **On the timeline**, the selected slide's syllables show as small blocks under its row. Drag a block to move it, or drag either end to change it. Click a block, then use the arrow keys: 0.05 s, with Alt 0.01 s, with Shift 0.25 s. Esc lets go of it. A syllable never moves past its neighbours.
- **In the word list**, type a start time (like `1:02.35`) or a length. Empty the start to clear that syllable's timing. Click a syllable to jump the playhead to it.
- **Fit the slide to its words** shows up when words fall outside the slide's time on screen.
- Dragging a slide's left end keeps its words where they are in the song; words that end up outside the slide show the Fit button.

**Copying to repeats.** When other slides of the song have the same words (capitals and punctuation don't count), the slide offers **Copy this timing to them**. You can also pick one slide in **Copy timing to**. If the other slide's first syllable is already timed, the copy lines up on it. Otherwise it lands at the same place in that slide, and you drag the slide to line it up. Each copy is one Undo step.

Dragging a slide or its group moves its words with it. **Fill**, **Reset** and stretching a group re-arrange its slides, so the words move with them too; Undo puts them back. Moving a song in Order of music doesn't move its slides.

**Song settings.** In karaoke, the **Song settings** section (above Your text on screen) holds everything that's for a whole song. Pick the song at the top. Opening a lyric slide switches it to that slide's song. Each change is one step for Undo.

**Highlighting while it's sung.** Once a slide has word timing, its words light up as they're sung, in the preview and in the video. These settings are under **While it's sung** in Song settings.

- **Highlight**: **Syllable by syllable** fills each syllable with color from left to right while it's held. **Whole word** lights each syllable all at once as it's sung, and the syllables build up until the word's last syllable ends, when the whole word goes back to the normal color (or stays lit to the end of the line with Keep sung words lit). A word timed with one press lights all at once. Older projects that used Color sweep open as Syllable by syllable.
- **Keep sung words lit until the line ends** keeps what's been sung in the highlight color until the line is finished. With it off, a word goes back to the normal text color once it's sung.
- A word in a part lights in that part's color. A word with no part uses **Color for words with no part** (yellow to start with). Change the part colors there too.
- **Show part names on screen** prints "High: " before each run of words in that part. It's off to start with.
- When two parts sing at the same time on one line, they show on their own rows, one above the other.
- Lines that haven't been reached yet are dimmed. On a slide's last line, the next slide's first line shows dimmed underneath. Room for it is always kept, so the text size doesn't jump.
- **Countdown after a break** shows **Dots** (one goes out each second) or a **Bar** that shrinks to nothing, or **Off**. It shows after a break of at least **5 s** to start with, and counts down for **3 s**. It also shows before the first words if the song starts with at least that much music.

Slides without word timing look as they did before.

**Rolling lines.** At the top of Song settings, **Show the lyrics as** picks **Slides** or **Rolling lines** for each song. In Rolling lines, every line of the lyrics is its own block on the timeline, in a group named "<song> lines", and clicking one jumps to its verse in Lyrics. On screen, one box shows the current line with a few lines above and below it, all at one fixed size.

- **Look for the lines** (in Song settings) sets the font, size, color and Behind the text for every line. The size is exact; lines never shrink. **Line up** is Centered or Left.
- **Lines above the current one** (0–4) and **Lines below** (0–6) set how many lines show. A line where two parts sing at once stacks on its own rows, as on slides, and still counts as one line.
- **Move on**: **Current line stays put** keeps the current line in one place and moves the others past it. **Page by page** keeps a whole screen still while the highlight moves down, then changes to the next screen.
- **Motion**: **Smooth scroll** slides to the next place over about 0.4 s. **Instant jump** changes at once.
- **Verse starts**: **Show a label** puts "Verse 2" (or the name typed as `[Chorus]`) above the verse's first line. **Start a fresh screen** never mixes two verses on screen. **Nothing** runs the lines straight on.
- The highlight, part colors and countdown settings under While it's sung work the same for slides and lines.
- Word timing is shared: a song timed as slides is already timed as lines, and the other way round. Each view keeps its own blocks on the timeline, so switching back puts every slide (or line) where you left it. A hidden duplicate slide keeps its own timing. A switch is one Undo step.
- Lyrics edits (Update, Set part, Join) rebuild the lines and keep their timing.
- To move or resize the box, select a line on the timeline and drag the box in the preview, or type **Left / Top / Width / Height** in Song settings.
- The video shows whichever view is on when you export. To get both looks, export, switch, and export again.
- **Step aside for song and talk titles** doesn't apply to rolling lines.

**Look for new lyric slides.** Also in Song settings, each song has a font, Bold and Italic, size, text color and **Behind the text** for its new slides. A song starts with Montserrat Bold, 72 px, white, with a solid black outline. Slides made with Make slides, and slides split off by a blank line, start with this look. Changing it doesn't touch slides you've already made. **Use on every slide in this song** gives all of the song's slides this look, including ones you changed by hand. It asks first, and one Undo puts them all back.

**Two versions.** In karaoke, **Export** has a **Versions** choice: **Both, as two files**, **With vocals** or **Music only**. Both is the default, and each project remembers your choice. Both files have the same picture. In the music-only one, every track marked Vocal is silent and every track marked Instrumental plays, whatever their Sound ticks say. The files end in `-with-vocals` and `-music-only`. Both are built in one pass, so it takes about as long as one. Export shows when you last exported and which versions you made. If no track is marked Vocal, the choice is greyed out and you get one file, as before. Clips over the music keep their own sound in both versions.

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

Tick **Show for as long as it takes to read** on any text item to make it stay up just long enough to read: at least 4 seconds, plus its fades. Set how fast people read with **Reading speed for on-screen text** in Mix settings. Scriptures and tapped items use reading time automatically. Dragging either end of an item on the timeline switches reading time off for that item.

## Scripture text

The files in `public/scriptures/` hold the verse text. They are built from the public-domain data at https://github.com/bcbooks/scriptures-json by running, from this folder:

    node tools/build-scriptures.mjs

Run it again only to refresh the text. The app loads each volume the first time it's needed, so it needs an internet connection to show scriptures.

The verse text is checked against the Church's published list of changes in the 2013 edition (`tests/scripture-2013.test.mjs`, with the list in `tests/scripture-2013-changes.json`). Official Declarations 1 and 2 aren't included, because they're documents rather than numbered verses.

## Tests

From this folder, with Node 22 or newer:

    node --test "tests/*.test.mjs"

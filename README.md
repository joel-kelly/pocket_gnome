# Pocket Gnome 🍄

A typing game with a ceramic garden gnome that comes to life. It's a sister game to [Pocket Goblin](https://github.com/joel-kelly/pocket_goblin) (the math one): you practise typing to earn acorns, then spend them on snacks, hats, paint and garden decorations for your gnome.

The gnome has grandpa energy: wholesome, a bit pompous, and very fond of terrible puns. It likes being tidy, sneezes its hat off, and when you make a typo it tips over and wobbles back up with a *clink-clonk*. It never breaks.

See [DESIGN.md](DESIGN.md) for the ideas behind it and the list of games still to come.

## Running it

It's a plain web page with no build step. Browsers won't run it from a double-clicked file, so start a tiny local server from this folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

It needs a real keyboard (a laptop, a desktop, or a tablet with a keyboard attached). Phones aren't supported.

### Putting it online (free)

On GitHub, go to **Settings → Pages**, set **Source** to "Deploy from a branch", and pick the branch and `/ (root)`. The game will be live at `https://<user>.github.io/pocket_gnome/`.

Progress is saved in the browser on that computer. **Grown-ups → Download backup** saves a copy you can load somewhere else.

## What's in the game

| | |
|---|---|
| 🏪 **Gnome Depot intro** | The first time you play, an ordinary-looking gnome (red hat, blue shirt) is waiting in the clearance aisle. Pick a style (beard, braids or a bob), repaint its hat, shirt, hair and face (the first brushstroke wakes it up!), name it and take it home. |
| 🎯 **Placement check** | "Let's see what your fingers already know!" One short line per group of keys. Lines typed accurately and steadily mark those keys as already learned, so a kid who has practised at school doesn't start back at F and J. |
| ⌨️ **Type & Play** | Shows the stage, a little keyboard colored by how solid each key is, and progress toward the next keys. |
| ✨ **Meet your new keys** | When new keys unlock, a short three-line lesson: a drill, a mix of "gnome spells", then real words. |
| 📜 **Practice Scrolls** | Five calm lines of practice. No timer. |
| 🎈 **Astrognome** | The gnome rides a flowerpot carried by balloons. The balloons slowly lose air; every right key puffs them up and every finished word adds more (clean words in a row add the most). Typos make a balloon wheeze. Fly past rooftops, clouds, Gerald the heckling pigeon, jets, stars and the Moon. Run out of air and it's umbrella time. |
| 🥕 **Beet the Clock** | Unlocks at stage 6. 60 seconds in the veggie patch: every word plants a veggie. Quick words grow big ones, and 5 clean words in a row grow a golden beet. Fill the patch and the gnome harvests it so you can keep going. |
| 🐹 **Mole Patrol** | Unlocks at stage 10. An arcade-style mole board with 9 holes. Moles pop up with a word sign in front of their hole; the one that's been up longest glows, so there's never any choosing. Type its word and the squeaky mallet swings down and bonks it back into its hole. Moles left waiting too long nibble a carrot. Keep at least one of the 5 carrots for 2 minutes and the moles give up. Gets busier as the round goes on; on Auto pace it eases off after a rough round. |
| 🍓 **Feed** | Toss snacks and drinks to the gnome. Dandelion Pop gives it hiccups. |
| 🏪 **Gnome Depot** | Hats, glasses, scarves, things to hold, back items, snacks, garden decor and paint pots (new colors and polka dots, stripes and stars). Click anything to try it first. |
| 🎩 **Wardrobe** | Change style and paint any time, and put on or take off what you own. |
| 🌻 **Garden** | Put decor out in the garden (6 spots) or put it away. Click decor in the garden and it does something. The bird bath has a bubbling fountain, and every minute or so Gerald the pigeon drops in to sip, splash and coo (the gnome is NOT impressed). Click Gerald to shoo him. |
| 🧹 **Tidy Up** | Leaves pile up on the lawn and on the gnome's hat when it's untidy. The gnome *loves* tidying. |
| Grown-ups | Press and hold the button. A keyboard heatmap of which keys are solid or shaky, recent rounds, settings and save backups. |

Hunger, Thirst, Tidy and Joy slowly drop over real time, tuned so about 10-15 minutes a day keeps the gnome happy.

### How the typing practice works

It works like Pocket Goblin's times tables, with **keys instead of fact families**. Each key has a level from 0 to 5:

- **Right and faster than the target time** (1 second by default; change it in Grown-ups): the level goes up.
- **Right but slow**: the level stays the same. There's no punishment for being slow.
- **Wrong**: the level drops 1.

Weak and slow keys show up more often in the words and spells. Mistakes never need Backspace: a wrong key just doesn't count, and you press the right one.

**Keys unlock in stages**, following the fingers out from Gnome Row (the home row): F J → D K → S L → A ; (Gnome Row complete!) → G H → E I → R U → T O → N C → W M → Y P → B V → Q Z X → capitals (Shift) → periods and commas. The next stage unlocks when 70% of the unlocked keys are solid (level 3+) **and** every key in the newest stage is solid. Grown-ups can leave this on Auto or pin it to any stage.

**Hints fade.** The on-screen keyboard is colored by finger and the next key glows, with a note saying which finger to use. New keys glow right away. Solid keys wait a moment so she can try from memory first. Mastered keys only glow after a mistake. (Grown-ups can set hints to always on or mistakes only.)

**Early stages use "gnome spells"** (made-up words like `fjf dka`), since there aren't real words with only a few letters. Real words take over as soon as there are enough of them. The word list is in `src/typing/words.js`.

## Project layout

```
index.html, style.css      page + pixel-font garden UI
vendor/                    three.js r170 (3D engine, MIT) + two add-ons
fonts/                     Press Start 2P + Pixelify Sans, same as Pocket Goblin (OFL)
src/
  main.js                  startup, game loop, keyboard routing
  voxel.js                 block models: matte blocks for scenery, glazed blocks for the gnome and items
  gnomeModel.js            the gnome's body, hairstyles, paints and item slots
  gnome.js                 the gnome's moves (hop, spin, sneeze, tip over...) and blinking
  world.js                 renderer, the garden, cameras, item thumbnails
  items.js                 hats, outfits, snacks, garden decor and paint pots
  lines.js                 everything the gnome says  ← add puns here!
  state.js                 save data + stat decay
  audio.js                 all sound effects, made in code (lots of clinks)
  fx.js                    particles: sparkles, leaves, pollen, confetti
  veggies.js               veggie, mole and hole models for the garden games
  gerald.js                Gerald the pigeon's model
  birdbath.js              the bird bath fountain and Gerald's visits
  pace.js                  game pace (auto slows down after a rough round)
  ui.js                    small page helpers: panels, pop-ups, speech bubble
  typing/
    keys.js                stages, which finger presses which key, keyboard layout
    words.js               the word list and little sentences
    engine.js              key levels, unlocking, picking words and spells
    pad.js                 the typing card + on-screen keyboard used by every game
  screens/
    depot.js               first-time Gnome Depot intro
    placement.js           placement check
    home.js                the garden: stats, feeding, tidying, poking
    games.js               Type & Play menu + new-key celebrations
    lesson.js              new-key lessons and Practice Scrolls
    astro.js               Astrognome
    beet.js                Beet the Clock
    moles.js               Mole Patrol
    gardenRound.js         clears the garden for games played on the lawn
    shop.js, wardrobe.js, garden.js, parent.js
```

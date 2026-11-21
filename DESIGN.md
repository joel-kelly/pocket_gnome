# Pocket Gnome: design notes

A typing game for a 10-year-old who has had some typing practice at school but isn't a confident typist yet. It's a sister game to [Pocket Goblin](https://github.com/joel-kelly/pocket_goblin), the math game: you look after a pet, you practise to earn money, and the money buys snacks, clothes and decorations.

## The gnome

- **A ceramic garden gnome that comes to life.** You find it in the clearance aisle at **Gnome Depot**, paint it (hat, shirt, beard), name it and take it home to your garden.
- **Grandpa energy.** Wholesome, a bit pompous, loves terrible puns ("Lettuce celebrate!"). The goblin's humor is gross; the gnome's is dad jokes.
- **Tidy.** The gnome *likes* being tidy: sweeping leaves, polishing its glaze, dusting its hat. It sulks when the garden gets messy. (The opposite of the goblin, who hates baths.)
- **Any gnome you like.** Pick a style (beard, braids or a bob), paint the hat, shirt, hair and face, and name it.
- **Rigid body, lots of life.** No moving arms or legs. All the life comes from moving the whole figure: hops with squash and stretch, happy spins, shakes, a wobbly-toy tip-over, sneezes that launch the hat, blinking painted eyes.
- **It never breaks.** Mistakes make it tip over and wobble back up with a *clink-clonk*. Neglect makes it messy (leaves on the hat), never cracked.

### Stats

| Stat | Goes up with |
|---|---|
| 🍓 Hunger | Snacks (berry tart, mushroom soup, acorn cookies, crumpets, acorn muffins...) |
| 💧 Thirst | Drinks (dewdrop tea, lemonade, dandelion pop, which gives hiccups) |
| 🧹 Tidy | Tidy Up (sweep, polish, dust) |
| 🌼 Joy | Playing games, poking the gnome, garden decor |

Stats drop slowly in real time, tuned so 10-15 minutes a day keeps the gnome happy (same as the goblin).

### Wholesome stand-ins for the goblin's gross stuff

| Goblin | Gnome |
|---|---|
| Farts | Sneezes (pollen). Big ones launch the hat. |
| Burps | Hiccups from dandelion pop |
| Faints on a wrong answer | Tips over, rocks, wobbles back up |
| Hates baths | Loves tidying. Sulks when messy. |
| Gross jokes | Terrible puns |
| Recurring chaos | **Gerald the pigeon**, who heckles and keeps landing on the gnome's hat |

## Look

**Glazed blocks:** the same voxel (block) style as Pocket Goblin, but each block has softened edges and a shiny glaze, so it reads as painted ceramic. Chosen over smooth ceramic because it keeps a Workshop (build-your-own items) possible later. No Classic 90s mode. Not built for phones or tablets: typing practice needs a real keyboard.

## Puns

Gnome Row (home row), Gnome Depot (shop), Gnome Sweet Gnome (the garden), Astrognome, Gnomework, Metrognome, Gnome Away From Gnome (vacation), Gnomemade (workshop), Ergognomics (posture tips), Gnomebody's Perfect, I Gnome You Can Do It, There's No Place Like Gnome, Hoe Hoe Hoe.

## Typing progression

Works like Pocket Goblin's times tables, with **keys instead of fact families**.

- **Each key has a level, 0 to 5.** A right key pressed faster than the target time moves it up. A right key that's slow doesn't change it. A wrong key moves it down 1. (Typing mistakes are very common, so this is gentler than the goblin's -2.)
- **Weak and slow keys come up more often** in the words and spells the game picks.
- **Unlocking:** the next stage unlocks when 70% of the unlocked keys are *solid* (level 3+) **and** every key in the newest stage is solid.
- **Stages** follow the fingers, not letter frequency:

| Stage | New keys | Notes |
|---|---|---|
| 1 | f j (+ space) | find the bumps |
| 2 | d k | |
| 3 | s l | first real words ("sad", "lad", "fall") |
| 4 | a ; | **Gnome Row complete!** |
| 5 | g h | |
| 6 | e i | lots of real words open up |
| 7 | r u | |
| 8 | t o | |
| 9 | n c | |
| 10 | w m | |
| 11 | y p | |
| 12 | b v | |
| 13 | q z x | all letters |
| 14 | Shift | capital letters |
| 15 | . , | sentences |
| later | ' ? ! and the number row | |

- **Gnome spells:** with only a few keys there are no real words, so drills like `fjf jjf` are called gnome spells. Real words take over as soon as there are enough of them.
- **Placement check** at the start: a quick run through the stages. Any stage she types accurately and steadily is marked solid, so she doesn't start back at `fjfj`.
- **Hints fade:** an on-screen keyboard shows finger colors, and the next key glows. Once a key is solid, the glow waits a moment so she can try from memory. Mastered keys only glow after a mistake.
- **Mistakes don't need Backspace** (early on): a wrong key just doesn't count, and she presses the right one. Backspace becomes its own skill in Gnomework.
- **Accuracy first.** Words per minute is shown, but rewards lean on clean streaks.

## Games

| Game | Unlocks | Idea |
|---|---|---|
| 🎈 **Astrognome** | From the start (MVP) | The gnome sits in a flowerpot carried by balloons. The balloons slowly lose air; every right key puffs them up, and finished words add more. Mistakes make a balloon wheeze. Garden → rooftops → clouds → Gerald's sky → jets → stars → the Moon. Height is the score. |
| 🥕 **Beet the Clock** | Stage 6 (E and I) | 60 seconds in the veggie patch. Every word plants a veggie; quick words grow big ones, 5 clean words in a row grow a golden beet. A full patch gets harvested so you can keep going. |
| 🏎️ **Grand Gnome Prix** | Stage 8 (T and O) | A pure speed test, homage to 90s typing-tutor racing. One minute on a race track; the car moves one step per right key, so car speed = typing speed. Rivals (hedgehog, squirrel, bunny) race at 0.75×, 1× and 1.15× your best WPM. Critters cheer from the grandstand. Your WPM is right keys ÷ 5 over the full minute. Trophies (garden decor that can't be bought) at 10, 15, 20, 30, 40, 50 and 60 WPM, for races with 85%+ accuracy. A copyable brag line for showing off. |
| 🐹 **Mole Patrol** | Stage 10 (W and M) | Arcade-style board with 9 holes (close-up, no garden). Moles pop up with word signs; the oldest glows. Type its word and a squeaky mallet bonks it down. Moles left waiting nibble a carrot. Keep a carrot for 2 minutes and the moles give up. |
| ☕ **Crumpet Café** | Stage 13 (all letters) | The gnome runs a café under a giant toadstool. Woodland critters (squirrel, hedgehog, bunny, frog, mouse) line up and say their order ("two acorn muffins please"); type it and the gnome serves it on a tray. Quick, clean orders earn tips; critters who wait too long leave grumpy. Orders get longer (two items) as the day gets busy, and pick up capitals and commas once those keys unlock. Serve as many as you can in 2 minutes. |
| ✏️ Gnomework | Simple sentences (capitals, periods, Backspace) | The gnome wrote a letter to Grandgnome full of typos. Find and fix them. |
| 🥁 Metrognome | ? | Type along to a beat, for steady rhythm. |
| 🧊 Freeze! | ? (maybe) | Type while the homeowner's back is turned; stop when they look. |
| 💡 *Her ideas* | | *(ask her!)* |

## MVP scope

1. Gnome Depot intro: paint the gnome (hat, shirt, beard), name it, take it home.
2. Placement check.
3. Typing engine: per-key levels, stages, word/spell picker, fading hints.
4. The garden: the gnome hops around and tells puns. Hunger, Thirst, Tidy, Joy. Spots for garden decor.
5. Astrognome.
6. Gnome Depot shop: hats and outfits, paints, snacks, garden decor.
7. Grown-ups: keyboard heatmap, stage pinning, save backup.

Later: Workshop, device sync, play counts, the other games, vacation postcards.

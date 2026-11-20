// Everything the gnome says. Grandpa energy: every line is a chance for a
// terrible pun. The worse the better. {kid} = the kid's name, {gnome} = the gnome's.
// Add more jokes here! (Groaning is the correct response.)

export function pick(list, vars = {}) {
  if (!list || !list.length) return '';
  const s = list[Math.floor(Math.random() * list.length)];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export const LINES = {
  greet: [
    "{kid}! There's no place like gnome!", 'Welcome gnome, {kid}! Get it? Gnome? Like home? ...I\'ll wait.',
    "Oh, it's you! You're a sight for sore eyes. And I've got painted eyes, so that's saying something.",
    "{kid}! I missed you like a garden misses rain. Which is a LOT. Have you seen the petunias?",
    "Hello, {kid}! I've been standing here all day. I'm outstanding in my field!",
    "Ah, {kid}! Lettuce begin! Sorry, I just love lettuce puns. Romaine calm.",
    "You're back! I'm so happy I could wet my plants!",
  ],
  greetHungry: [
    "{kid}! I'm so hungry I could eat a horse-radish!", "Snack time? My tummy's rumbling like a wheel-BARROW full of rocks.",
    "Is it lunch? I'm starving. I could eat a whole PEA-zza.",
  ],
  idle: [
    "What do you call a gnome who tells jokes? A gnome-edian!",
    "Why did the gnome go to school? To get a little gnome-ledge!",
    "What's a gnome's favorite music? Gnome and bass!",
    "Why do gnomes make great friends? We're always down to earth!",
    "I tried to grow a beard of flowers once. It was a bit bushy.",
    "Did you hear about the gnome who couldn't stop telling jokes? Me. It's me. Hello.",
    "Why did the tomato turn red? It saw the salad dressing!",
    "What did the big flower say to the little flower? Hey there, bud!",
    "I'm reading a book about garden hoses. I just can't put it down. It's too long!",
    "How do you fix a broken pumpkin? With a pumpkin patch!",
    "What do you call a stolen yam? A hot potato!",
    "Why are peas so bad at sneaking? They're always in a pod-cast!",
    "My doctor says I'm short on vitamins. I said, I'm short on EVERYTHING, I'm a gnome!",
    "What did the gnome say when it lost its hat? Oh gnome! Gnome, gnome, GNOME!",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "Why did the scarecrow win an award? He was outstanding in his field! ...We're cousins.",
    "What do you call a sleeping garden gnome? A gnome-nap!",
    "What's a gnome's favorite letter? The letter G. It's silent, just like me when people are watching.",
    "Why did the keyboard go to the garden? To find the SPACE bar! ...Gardens have a lot of space.",
    "What's the best key for a gnome? The F key. It has a bump, like my nose!",
    "Why is a keyboard like a garden? Both are full of ROWS!",
    "Knock knock. Who's there? Lettuce. Lettuce who? Lettuce in, it's cold out here!",
    "Knock knock. Who's there? Gnome. Gnome who? Gnome-atter what, I'll always be your friend!",
    "How does a gnome cut the grass? With a lawn GNOME-er!",
    "Why did the mushroom go to the party? Because he was a fun-gi!",
    "Why did the mushroom get invited back? He had lots of room! A mush-room!",
    "What do you call a bee that can't make up its mind? A maybe!",
    "What did the tree say to the wind? Leaf me alone!",
    "Why did the snail paint an S on his car? So people would say, look at that S-car go!",
    "Why did the gardener plant light bulbs? To grow a power plant!",
    "What do you get when you plant kisses? Tu-lips!",
    "Why couldn't the flower ride its bike? It lost its petals!",
    "What's green and sings? Elvis Parsley!",
    "I used to be a statue. Now I'm just a little bit stuck in my ways.",
    "Watch out for Gerald. That pigeon is a real cheep-skate.",
    "My beard is 10 years old. I've been growing it for a hairy long time.",
    "Want to hear a joke about paper? Never mind, it's tearable.",
    "I'd tell you a joke about a garden fence, but I don't want to get you on edge.",
    "Practice makes progress, {kid}. And progress makes acorns!",
  ],
  happy: [
    "I'm feeling grape! Grape-ful, even!", "I'm so happy I'm beet-ing with joy!", "Life is gnome-tastic!",
    "Everything's coming up roses! And tulips! And one very confused cabbage.", "I'm having a gnome-nominal day!",
  ],
  poke: [
    'Hey! That tickles! Are you a tickle-weed?', "Boop! Gnome-body pokes me like you do!", "Careful, I'm ceramic! Handle with clay-re!",
    "Ouch! Just kidding. I'm tough as a garden rock.", "Poke me again and I'll tell another pun. ...Wait, that's not a threat for you, is it?",
    "Who goes there? Oh, it's you! Gnome-sweet-gnome.", "*clink!* That's ceramic for hello!",
  ],
  pokeOops: ["Whoa! I'm fine! Gnome harm done!", "I meant to do that. I was testing gravity. It works!", "Don't worry, I've fallen for you before! ...That's a joke. Mostly.", "I'm okay! Just taking a little GROUND-break!"],
  pokeSneeze: ["Sorry! I'm a little hay-fevered.", 'Achoo! Bless me! I must be allergic to pun-dust.', "Excuse me. Too much pollen. I'm a bit of a pollen-tician."],
  hungry: [
    "My tummy is rumbling louder than a lawnmower!", "I'm so hungry I could eat a horse-radish!",
    "Feed me, {kid}! I'm a growing gnome! ...Well, I'm not growing. But I'm hungry.", "I've got a hollow feeling. Probably because I'm ceramic. And hungry.",
  ],
  thirsty: [
    "I'm thirstier than a cactus at a sandcastle contest!", "Water you waiting for? I'm parched!",
    "I need a drink! I'm drier than a joke about sand!", "Some dewdrop tea would be tea-riffic right now.",
  ],
  untidy: [
    "Look at these leaves! This garden is a mess. A real leaf-tastrophe!", "There's a leaf on my hat! This is un-be-LEAF-able!",
    "Time for a tidy-up? I'm itching to sweep. I'm a sweep-heart like that.", "This mess is driving me up the garden wall!",
  ],
  bored: [
    "I'm bored as a plank. Let's play a game! Any game! Preferably with balloons!", "Let's fly, {kid}! I'm feeling a little deflated.",
    "Want to type something? My fingers are itching. Well, my statue fingers. Metaphorically.",
  ],
  eat: [
    "Delicious! My compliments to the chef! That's you!", "Yum! That was berry nice!", "Mmm! That was un-BEET-able!",
    "Scrumptious! I'm full of beans now! Well, full of tart.", "Delightful! I'm feeling grape-ful.",
  ],
  drink: ["Ahh! Tea-riffic!", "Refreshing! That really wet my whistle!", "Thanks! I was dry as a bone. A ceramic bone.", "Ahh, water-ful drink!"],
  full: ["Oof! I'm stuffed like a pepper!", "No more! I'm so full I'll need a wheelbarrow to move!"],
  tidyStart: ["Tidy time! This is going to be a clean sweep!", "Out come the brooms! Sweep dreams are made of these!", "Let's tidy up! I'm feeling very broom-antic."],
  tidyDone: ["Spick and span! That's a clean getaway!", "Look how I shine! I can see my reflection in my belly!", "All clean! Now that's what I call a mess-terpiece. Wait, the opposite.", "Neat as a pin! I'm feeling very well-swept."],
  tidyAlready: ["It's already spotless! I'll just polish my hat. Gotta keep a good head on my shoulders.", "Clean as a whistle! I'm sparkling like a dew drop!"],
  buy: ["Gnome Depot! Where every day is a shopping spree!", "Ooh, shopping! Let's acorn-ulate some new things!", "Let's see what's in stock! Hopefully not a stock-pot."],
  broke: ["We're a few acorns short. We're NUTS about saving up!", "Not enough acorns! Time to type up some more.", "Our wallet is looking a little shell-shocked."],
  newOutfit: ["How do I look? Dashing! Positively gnome-geous!", "Snazzy! I'm the gnome of the town!", "Lookin' sharp! Sharper than a garden rake!", "Fancy! Gerald will be so jealous he'll fly into a flap!"],
  newDecor: ["That looks gnome-tastic in the garden!", "Perfect spot! You've got a green thumb!", "The garden's looking grow-geous!"],
  gardenFull: ["The garden's full! Use Garden to put something away first."],
  decorPoke: ["Lovely, isn't it? It really grows on you.", "A fine addition! I've taken a shine to it.", "Ooh, pretty! It's the cream of the crop!"],
  painted: ["A fresh coat of paint! I feel like a whole new gnome!", "Ooh, that color suits me! I'm tickled pink! Or whatever color that is.", "Wet paint! Don't touch! ...Okay, it dried. That was fast-drying gnome paint."],
  // typing
  typeWrong: ["Oopsie! Gnome-body's perfect!", "Whoops! Butterfingers! ...Do I even have fingers?", "Close! Just a little typo-tamus!", "Wobbly! Steady as a garden rock!", "Mistakes help us grow! Like fertilizer!"],
  typeGreat: ["Brilliant! You're typing up a storm!", "Gnome-tastic! Those fingers are on fire! Not literally. Please don't.", "Wow! You're a real key-player!", "You're on a roll! A spring roll!", "Splendid! You've got the knack, and the knick-knack!"],
  newKeys: ["New keys! You're un-LOCK-able!", "More letters! I gnome you could do it!", "New keys unlocked! You really hold the key to success!"],
  gnomeRow: ["GNOME ROW COMPLETE! Get it? Gnome row? Home row? I've been waiting SO LONG to say that!"],
  // Astrognome
  astroStart: ["Up, up and away! Hold onto your hat! Actually, hold onto MY hat.", "Balloons ready! This is going to be up-lifting!", "To the moon! I've always wanted to see if it's made of cheese. I'm a little cheesy myself."],
  astroZone: ["Wheee! I'm on cloud nine!", "Look how small the garden is! It's a mini-ature!", "I'm high as a kite! Higher, actually!", "This is the high-light of my life!"],
  astroLow: ["The balloons are getting droopy! Type, type, type!", "We're losing air! This is deflating!", "Uh oh, we're going down! Pump it up!"],
  astroWrong: ["Wobbly!", "Steady!", "Whoa there!"],
  astroLand: ["Good thing I brought my umbrella! I'm a fall-er of style!", "What a ride! I'm head over heels! Well, hat over boots.", "Again! Again! That was up-lifting!"],
  newBest: ["A NEW RECORD! Call the Gnome-ness Book of World Records!", "Highest ever! That's a sky-high score!"],
  // Beet the Clock
  beetStart: ["Ready, set, GROW! Let's beet the clock!", "Time to turnip the heat!", "Lettuce get planting! Every word is a seed!"],
  beetGrow: ["Look at it grow! It's un-BEET-able!", "Grow-tastic!", "That's a big dill!", "Squash-tastic!", "You've got a green thumb! Ten green thumbs!"],
  beetGolden: ["A GOLDEN BEET! That's the root of all success!", "Golden! You're on a roll! A golden roll!"],
  beetEnd: ["What a harvest! You really beet it!", "Look at all those veggies! I'm so proud I could turnip!", "Time's up! That's a hoe-down showdown!"],
  // Mole Patrol
  moleStart: ["Moles ahead! Boop them back down before they nibble our carrots!", "Holy moley! Here they come!", "Guard the carrots! This is a mole-y serious mission!"],
  moleBoop: ["Boop!", "Holy moley!", "Mole-y cow!", "Back you go! Burrow-ly a problem!", "Guaca-mole!", "Nice! That's how you dig it!"],
  moleStole: ["Hey! That was my favorite carrot!", "Oh no! A carrot-napping!", "That mole's a real carrot-tops thief!", "Drat! They're digging into our snacks!"],
  moleEnd: ["The moles got all the carrots! Well, they DID dig their way in fair and square.", "No carrots left! Time to dig in to a new round?"],
  moleWin: ["The moles gave up! You out-dug them! Holy moley!", "Victory! The moles are throwing in the trowel!"],
  // Crumpet Café
  cafeStart: ["The Crumpet Café is open! Let's get this tea party started!", "Aprons on! It's time to make some dough. Get it? Dough?", "Customers coming! Let's make this a brew-tiful day!"],
  cafeServe: ["Order up!", "One order, served with a smile!", "Tea-rrific!", "That's crumpet-ly perfect!", "Enjoy! It's the best thing since sliced bread!", "Bon appé-tea!"],
  cafeStreak: ["You're on a roll! A cinnamon roll!", "What a streak! You really take the cake!", "Five in a row! You're one smart cookie!"],
  cafeGrumpy: ["Oh dear, they got tired of waiting. Never mind, they'll be back for crumpets!", "Grumpy customer! Tea-rrible! Next one will be happier.", "They left in a huff! A huff-and-puff pastry!"],
  cafeEnd: ["Closing time! What a busy day! I'm bushed. Like a hedgehog. Bush-ed.", "We did it! The café was a hot cross bun-anza!", "Time to put the kettle on and put our feet up! If I could lift my feet."],
  // Gerald visits the bird bath
  geraldArrive: ["Gerald! That's MY bird bath! ...Well. It IS a bird bath. Fine.", "Oh no, it's Gerald. Act natural. Be a statue.", "Gerald! Coo-ldn't you go splash somewhere else?", "Here comes trouble. Feathered trouble.", "Gerald, that bath is for NICE birds!"],
  geraldShoo: ["Shoo, Gerald! Shoo!", "And stay out! ...Until next time.", "Bye, Gerald! Don't let the bird bath hit you on the way out!"],
  geraldLeave: ["Bye, Gerald. ...I'll miss him a little. Don't tell him.", "Good riddance! Well, good bird-dance.", "He's gone. Now I have to wash the bird bath. Again."],
  // Gerald the pigeon (he heckles)
  gerald: ["Coo. Nice hat, nerd.", "Coo coo. Type faster, I'm bored.", "Coo. I've seen snails type faster.", "Coo. Gonna sit on your hat later.", "Coo. ...Okay, that was pretty good.", "Coo. You're in MY sky now.", "Coo. Your puns are for the birds. And I'M the bird."],
};

// Astrognome altitude zones (meters).
export const ASTRO_ZONES = [
  { alt: 0, name: 'The Garden' },
  { alt: 60, name: 'Rooftops' },
  { alt: 140, name: 'Treetops' },
  { alt: 260, name: 'Cloud Meadow' },
  { alt: 400, name: "Gerald's Sky" },
  { alt: 560, name: 'Jet Lane' },
  { alt: 760, name: 'Starry Night' },
  { alt: 1050, name: 'The Moon' },
  { alt: 1400, name: 'Beyond the Moon' },
];

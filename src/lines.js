// Everything the gnome says. Grandpa energy: wholesome, a little pompous,
// and very fond of terrible puns. {kid} = the kid's name, {gnome} = the gnome's.
// Add more jokes here!

export function pick(list, vars = {}) {
  if (!list || !list.length) return '';
  const s = list[Math.floor(Math.random() * list.length)];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export const LINES = {
  greet: [
    "Ah, {kid}! There's no place like gnome.", 'Welcome back, {kid}! I kept the garden warm for you.',
    "Hello hello! I've been standing very still all day. Very. Still.", "{kid}! You're a sight for sore eyes. Painted eyes, but still.",
    "Good to see you, {kid}. I've been practicing my puns. Brace yourself.",
  ],
  greetHungry: ["{kid}! Thank goodness. My tummy is rumbling like a wheelbarrow.", "Is it snack o'clock? It feels like snack o'clock."],
  idle: [
    "Why did the gnome get a job at the bank? He wanted to make a little gnome-y.", 'I told a joke to a sunflower. It was a bit corny.',
    'What do you call a gnome who tells stories? A gnome-ad. ...No wait, that was a different one.', "I'm not short. I'm fun-sized.",
    'Did you hear about the garden that won a prize? It was out-standing in its field.', "Lettuce celebrate! For no reason. I just like lettuce.",
    "The early gnome catches the worm. I don't WANT a worm, but I catch it anyway.", 'Fun fact: I am 87% glaze.',
    "I'm reading a book about garden hoses. I can't put it down. It's too long.", 'Hoe hoe hoe!',
    'Why are gnomes so good at gardening? We have the knack of it. And tiny shovels.', "What do you call a gnome in a pea pod? A little pea-son.",
    'I once tried to stand still for a whole day. Nailed it. Every day, actually.', 'Watch out for Gerald. That pigeon is up to something.',
    "I like my garden like I like my jokes. A little cheesy.", "Why did the tomato blush? It saw the salad dressing!",
    'Practice makes progress, {kid}. Not perfect. Progress!', "My favorite key? The F key. It's got a bump, like my nose.",
  ],
  happy: ['What a day! The flowers are blooming and so am I.', "I'm so happy I could hop. *hops*", 'Everything is coming up roses!', 'Life is grand. Well, gnome-sized grand.'],
  poke: ['Hee hee! That tickles!', 'Boop!', "Careful, I'm fragile! ...Just kidding. Mostly.", 'Ooh, a poke! Hello to you too!', 'Who goes there?! Oh, it is you.', '*clink*'],
  pokeOops: ['Whoa whoa WHOA. ...I meant to do that.', "I'm okay! Gnome harm done!", 'Wheee! ...ow. Good as new!'],
  pokeSneeze: ['Sorry! Pollen.', 'Bless me! Thank you.', 'Excuse me. Hay fever. Every day. Forever.'],
  hungry: ["My tummy is making noises like a lawnmower.", 'Is there a berry tart around here? Asking for me.', "I'm so hungry I could eat a whole radish patch."],
  thirsty: ["I'm thirstier than a cactus at a beach party.", 'A sip of dewdrop tea would be lovely right now.', 'Water, please! I feel like a dried-up daisy.'],
  untidy: ['Oh dear, look at these leaves. A gnome has standards!', "There's a leaf on my hat. A LEAF. On my HAT.", 'This garden needs a good tidy. Shall we?'],
  bored: ['I could use some fun. Shall we play a typing game?', "It's quiet. Too quiet. Let's go fly some balloons!", "I'm as bored as a garden hose in winter."],
  eat: ['Mmm! Delicious!', 'That hit the spot!', 'Scrumptious! My compliments to the chef. That is you.', 'Yum! A gnome could get used to this.'],
  drink: ['Ahh, refreshing!', 'Lovely. Simply lovely.', 'That really wet my whistle!'],
  full: ["Oof. I'm stuffed. I'm as round as a pumpkin.", "No more! I'll pop off my base."],
  tidyStart: ['Tidy time! My favorite!', 'Out come the brooms! Hee hee!', "Let's make this garden sparkle."],
  tidyDone: ['Ahh. Spick and span!', 'Look at that shine! I can see my own reflection in my belly!', 'A tidy garden is a happy garden.', 'Neat as a pin!'],
  tidyAlready: ["It's already spotless! But I'll give my hat a polish anyway.", 'Clean as a whistle. A shiny ceramic whistle.'],
  buy: ['Ooh, shopping!', "Gnome Depot! My old stomping ground. Well, my old standing-still ground.", 'So many lovely things!'],
  broke: ["We don't have enough acorns for that one yet.", "Let's earn a few more acorns first!"],
  newOutfit: ['How do I look? Dashing, I bet.', 'Very snazzy!', "I'm the best-dressed gnome on the street!", 'Fancy! Gerald will be so jealous.'],
  newDecor: ['Oh, that looks wonderful in the garden!', 'Perfect spot for it!', 'The garden is looking lovelier every day.'],
  gardenFull: ["The garden's full! Use Garden to put something away first."],
  decorPoke: ['Lovely, isn\'t it?', 'A fine addition to the garden.', 'Ooh, pretty!'],
  painted: ['A fresh coat of paint! I feel brand new.', 'Ooh, that color suits me!', 'Wet paint! Don\'t touch! ...Okay, it dried. Touch away.'],
  // typing
  typeWrong: ['Oopsie!', 'Whoops!', 'Gnome-body is perfect!', 'Almost!', 'Wobbly!'],
  typeGreat: ['Brilliant!', 'Splendid!', "Now you're cooking!", 'Look at those fingers go!', 'Gnome-tastic!'],
  newKeys: ['New keys! My, how you grow.', 'You did it! More letters to play with!', "I gnome you could do it!"],
  gnomeRow: ['GNOME ROW COMPLETE! Get it? Gnome row! Home row! ...I\'ll be here all week.'],
  // Astrognome
  astroStart: ["Up, up and away! Gnome-ward bound!", 'Balloons ready! Hold onto your hat. Actually, hold onto MY hat.', "I've always wanted to see the moon. It looks like a big cheese."],
  astroZone: ['Wheee!', 'Look how small the garden is!', "I'm flying! I'm actually flying!", 'Higher! Higher!'],
  astroLow: ['The balloons are getting droopy! Type, type, type!', 'We need more air!', 'Uh oh, sinking!'],
  astroWrong: ['Wobbly!', 'Steady...', 'Whoa!'],
  astroLand: ['Good thing I packed an umbrella!', 'What a ride!', 'Again! Again!'],
  newBest: ['A NEW RECORD! Somebody call the Gnome-ness Book of Records!', 'Higher than ever! I can still see the clouds in my mind!'],
  // Gerald the pigeon (he heckles)
  gerald: ['Coo. Nice hat, nerd.', 'Coo coo. Type faster, I\'m bored.', "Coo. I've seen snails type faster.", 'Coo. Gonna sit on your hat later.', 'Coo. ...Okay, that was pretty good.', "Coo. You're in MY sky now."],
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

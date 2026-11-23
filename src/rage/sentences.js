// What you type in Gnomageddon (the grown-up race). Every line is a complete
// sentence (or several), with capitals and real punctuation.
//
// Keep everything plain ASCII: straight quotes (" and '), no curly quotes,
// no em dashes, so every character is one key on a normal keyboard.
//
// A series is { id, name, blurb, order, passages }. order 'book' plays the
// passages in order from the top every race (so everyone types the same text);
// 'shuffle' plays them in a random order. A passage is a string, or
// { text, src } to show where it's from.

const PRIDE_SRC = 'Pride and Prejudice, Jane Austen (1813)';
const pride = [
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
  '"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"',
  'Mr. Bennet replied that he had not.',
  '"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."',
  'Mr. Bennet made no answer.',
  '"Do you not want to know who has taken it?" cried his wife impatiently.',
  '"You want to tell me, and I have no objection to hearing it."',
  'This was invitation enough.',
  '"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."',
  '"What is his name?"',
  '"Bingley."',
  '"Is he married or single?"',
  '"Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!"',
  '"How so? How can it affect them?"',
  '"My dear Mr. Bennet," replied his wife, "how can you be so tiresome! You must know that I am thinking of his marrying one of them."',
  '"Is that his design in settling here?"',
  '"Design! Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes."',
  '"I see no occasion for that. You and the girls may go, or you may send them by themselves, which perhaps will be still better, for as you are as handsome as any of them, Mr. Bingley may like you the best of the party."',
  '"My dear, you flatter me. I certainly have had my share of beauty, but I do not pretend to be anything extraordinary now. When a woman has five grown-up daughters, she ought to give over thinking of her own beauty."',
  '"In such cases, a woman has not often much beauty to think of."',
  '"But, my dear, you must indeed go and see Mr. Bingley when he comes into the neighbourhood."',
  '"It is more than I engage for, I assure you."',
  '"But consider your daughters. Only think what an establishment it would be for one of them. Sir William and Lady Lucas are determined to go, merely on that account, for in general, you know, they visit no newcomers. Indeed you must go, for it will be impossible for us to visit him if you do not."',
  '"You are over-scrupulous, surely. I dare say Mr. Bingley will be very glad to see you; and I will send a few lines by you to assure him of my hearty consent to his marrying whichever he chooses of the girls; though I must throw in a good word for my little Lizzy."',
  '"I desire you will do no such thing. Lizzy is not a bit better than the others; and I am sure she is not half so handsome as Jane, nor half so good-humoured as Lydia. But you are always giving her the preference."',
  '"They have none of them much to recommend them," replied he; "they are all silly and ignorant like other girls; but Lizzy has something more of quickness than her sisters."',
  '"Mr. Bennet, how can you abuse your own children in such a way? You take delight in vexing me. You have no compassion for my poor nerves."',
  '"You mistake me, my dear. I have a high respect for your nerves. They are my old friends. I have heard you mention them with consideration these last twenty years at least."',
  '"Ah, you do not know what I suffer."',
  '"But I hope you will get over it, and live to see many young men of four thousand a year come into the neighbourhood."',
  '"It will be no use to us, if twenty such should come, since you will not visit them."',
  '"Depend upon it, my dear, that when there are twenty, I will visit them all."',
  'Mr. Bennet was so odd a mixture of quick parts, sarcastic humour, reserve, and caprice, that the experience of three-and-twenty years had been insufficient to make his wife understand his character. Her mind was less difficult to develop. She was a woman of mean understanding, little information, and uncertain temper. When she was discontented, she fancied herself nervous. The business of her life was to get her daughters married; its solace was visiting and news.',
].map((text) => ({ text, src: PRIDE_SRC }));

// Famous first lines, all old enough to be in the public domain.
// (Dashes in the originals are swapped for commas so there's nothing you can't type.)
const openings = [
  ['It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.', 'A Tale of Two Cities, Charles Dickens (1859)'],
  ['Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.', 'Moby-Dick, Herman Melville (1851)'],
  ['Happy families are all alike; every unhappy family is unhappy in its own way.', 'Anna Karenina, Leo Tolstoy (1878), tr. Constance Garnett'],
  ['All children, except one, grow up.', 'Peter and Wendy, J. M. Barrie (1911)'],
  ['There was no possibility of taking a walk that day.', 'Jane Eyre, Charlotte Bronte (1847)'],
  ['Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.', 'David Copperfield, Charles Dickens (1850)'],
  ['Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence; and had lived nearly twenty-one years in the world with very little to distress or vex her.', 'Emma, Jane Austen (1815)'],
  ['In my younger and more vulnerable years my father gave me some advice that I\'ve been turning over in my mind ever since.', 'The Great Gatsby, F. Scott Fitzgerald (1925)'],
  ['Mrs. Dalloway said she would buy the flowers herself.', 'Mrs. Dalloway, Virginia Woolf (1925)'],
  ['He was born with a gift of laughter and a sense that the world was mad.', 'Scaramouche, Rafael Sabatini (1921)'],
  ['Marley was dead: to begin with. There is no doubt whatever about that.', 'A Christmas Carol, Charles Dickens (1843)'],
  ['It was a dark and stormy night; the rain fell in torrents, except at occasional intervals, when it was checked by a violent gust of wind which swept up the streets (for it is in London that our scene lies), rattling along the housetops, and fiercely agitating the scanty flame of the lamps that struggled against the darkness.', 'Paul Clifford, Edward Bulwer-Lytton (1830)'],
  ['Robert Cohn was once middleweight boxing champion of Princeton. Do not think that I am very much impressed by that as a boxing title, but it meant a lot to Cohn.', 'The Sun Also Rises, Ernest Hemingway (1926)'],
  ['Stately, plump Buck Mulligan came from the stairhead, bearing a bowl of lather on which a mirror and a razor lay crossed.', 'Ulysses, James Joyce (1922)'],
  ['You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.', 'Frankenstein, Mary Shelley (1818)'],
  ['The Mole had been working very hard all the morning, spring-cleaning his little home.', 'The Wind in the Willows, Kenneth Grahame (1908)'],
  ['Mr. Sherlock Holmes, who was usually very late in the mornings, save upon those not infrequent occasions when he was up all night, was seated at the breakfast table.', 'The Hound of the Baskervilles, Arthur Conan Doyle (1902)'],
  ['To Sherlock Holmes she is always the woman.', 'A Scandal in Bohemia, Arthur Conan Doyle (1891)'],
  ['Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice, "without pictures or conversations?"', 'Alice\'s Adventures in Wonderland, Lewis Carroll (1865)'],
].map(([text, src]) => ({ text, src }));

const noir = [
  'The dame walked into my greenhouse like she owned the lease, and frankly, she might have.',
  'It was raining the way it only rains on gnomes: sideways, personally, and with intent.',
  'I had three problems, two slugs, and one very suspicious watering can.',
  'She said her name was Petunia, but her eyes said "annual, not perennial."',
  'The birdbath was empty, and somebody wanted it to look like an accident.',
  'In this garden, everybody has a secret; mine is that I\'m hollow inside. Literally.',
  'I reached for a cigarette, remembered I was made of clay, and settled for a long, meaningful stare.',
  'The pigeon knew something. Pigeons always know something, and they never pay their tab.',
  '"You\'re a hard gnome to find," she said. I told her that was the whole point of the shrubbery.',
  'The hedge had been trimmed with a precision that suggested either a professional or a grudge.',
  'Somewhere across town, a sprinkler hissed like it had something to hide.',
  'I don\'t trust a tomato that\'s red before July; it means somebody\'s been talking.',
  'The compost heap smelled like trouble, and also, to be fair, like compost.',
  'They found the flamingo face down in the koi pond, still pink and still smug.',
  'My client wanted answers, and I wanted a nap; neither of us was going to get one.',
  'Every garden has a gnome who knows too much. Tonight, that gnome was me.',
  'The squirrel\'s alibi was airtight, which is exactly what made me nervous.',
  'I\'ve seen a lot of things from this flowerbed, and very few of them were legal.',
  'She left the way she came: quietly, through the cat flap, with my last biscuit.',
  'The case was closed, but the shed door was still wide open.',
];

const memo = [
  'Per my last email, the stapler is not a communal stapler, and its name is Gerald.',
  'Just circling back to see whether you\'ve had a chance to read my email about reading emails.',
  'As previously discussed (twice, in writing), the office fridge is not a place for your sourdough experiments.',
  'I\'ve taken the liberty of scheduling a meeting to discuss why we have so many meetings.',
  'Friendly reminder: the "reply all" button is not a personality.',
  'Moving forward, please refrain from microwaving fish, opinions, or anything that screams.',
  'Thanks so much for your feedback; I have filed it carefully in the bin under my desk.',
  'Let\'s take this offline, preferably to a different building, or possibly a different country.',
  'I\'m not sure who keeps taking my yogurt, but I have started labeling it with threats.',
  'Apologies for any confusion; I assumed you could read, and that one is on me.',
  'Quick question: does anyone know why the printer is on fire, and is it in the budget?',
  'Going forward, all complaints about the thermostat must be submitted in triplicate and in person.',
  'Please find attached the document you claim you never received, for the fourth time.',
  'I\'ll be out of the office until Monday, by which time I hope this problem has solved itself.',
  'Kindly stop calling it a "quick sync" when it lasts ninety minutes and ends in tears.',
  'To whoever left the passive-aggressive note on the microwave: well played, but we know it was you.',
  'We are a family here, which explains the shouting, the grudges, and the potato salad.',
  'Per our conversation, I will be ignoring your suggestion with the utmost professionalism.',
  'Hope this helps! (It won\'t, but I\'ve done my bit, and I\'m going to lunch.)',
  'Could everyone please mute themselves? Somebody\'s parrot keeps approving the budget.',
];

const nature = [
  'Here, in the unforgiving wilderness of the compost heap, a lone slug contemplates its next terrible decision.',
  'The male pigeon puffs out his chest, hoping to impress a female who is, quite clearly, eating a chip.',
  'Few creatures are as patient as the garden snail; fewer still are as smug about it.',
  'The squirrel buries four hundred acorns each autumn and remembers the location of almost eleven.',
  'Under cover of darkness, the hedgehog emerges to do what it does best: snuffle loudly and judge you.',
  'This young robin has left the nest, and already it regrets every choice that led to this moment.',
  'The ants have formed an orderly queue, which is more than can be said for the people at the post office.',
  'Watch closely as the earthworm performs its ancient ritual: wriggling, for no reason, forever.',
  'A garden gnome stands motionless for hours, waiting for the perfect moment to do absolutely nothing.',
  'The wasp, nature\'s middle manager, arrives uninvited and immediately starts making demands.',
  'Sadly, the moth has mistaken the porch light for the moon again, and it will never learn.',
  'The fox moves silently through the suburbs, carrying a single shoe for reasons known only to itself.',
  'For the frog, every day is leg day, and every pond is a nightclub.',
  'The bumblebee looks far too round to fly; nobody has told it, and nobody ever will.',
  'On the surface, the duck glides serenely; beneath the water, its feet are having a full panic attack.',
  'The cat surveys its kingdom from the windowsill, plotting the downfall of the cardboard box.',
  'Each spring, the daffodils return with the confidence of someone who has not checked the forecast.',
  'Gulls are opportunists by nature, and your sandwich is, frankly, an opportunity.',
  'The spider has spent all night weaving a masterpiece across the doorway, precisely at face height.',
  'And so, as the sun sets on the shed, the circle of life continues, mostly sideways.',
];

const trash = [
  'I have seen faster fingers on a sloth wearing oven mitts.',
  'Your car is so slow that the finish line has started sending you postcards.',
  'Please keep your hands inside the vehicle and your feelings outside it.',
  'I\'m not saying you\'re slow, but the snails just lapped you twice and stopped for lunch.',
  'Check your mirrors; that\'s me, and I\'m about to become a fond memory.',
  'My grandmother types faster than you, and she uses one finger and a grudge.',
  'You call that a spoiler? I\'ve seen more aerodynamic picnic tables.',
  'Nice of you to come out today; the spectators needed someone to feel sorry for.',
  'I\'d tell you to eat my dust, but you\'d need to catch up to it first.',
  'Every lap you drive is a beautiful gift to everyone who finishes ahead of you.',
  'Your pit crew has asked me to tell you that they\'ve found other work.',
  'If speed were a crime, you would be a remarkably law-abiding citizen.',
  'Don\'t worry about coming last; somebody has to hold the door for the winners.',
  'I polished my spikes for this occasion, and I\'d hate for them to go to waste.',
  'That\'s a lovely paint job; it\'ll look even better in my rear-view mirror.',
  'The crowd isn\'t cheering for you; they\'re cheering because you finally left.',
  'Bold strategy, braking on the straights. Let\'s see if it pays off.',
  'You\'re not losing; you\'re simply winning at a different, much slower game.',
  'Somewhere, a tortoise is reading about your performance and feeling very good about itself.',
  'When this is over, I\'ll sign your helmet, and I\'ll even spell your name correctly.',
];

const letters = [
  'Sir, I write to inform you that your hedge has once again encroached upon my dignity.',
  'Dear Neighbour, your rooster begins his performance at four, and I have not purchased tickets.',
  'Madam, it has come to my attention that your cat regards my vegetable patch as a public lavatory.',
  'To the Council: the pothole on Elm Street has grown large enough to require its own postcode.',
  'Dear Sir, I must protest, in the strongest possible terms, the length of your wind chimes.',
  'I remain, as ever, your most obedient servant, and your most furious neighbour.',
  'It is with the deepest regret that I must return your casserole, uneaten and slightly afraid.',
  'Kindly inform your son that the trombone is an instrument, not a weapon, and that he is losing.',
  'Your gnome has been staring into my kitchen window for six weeks; I demand that he look elsewhere.',
  'I shall not trouble you again, save for the matter of the trampoline, which is now in my pond.',
  'Dear Editor, I have never been so offended by a crossword in all my life, and I have done many.',
  'I trust you will treat this matter with the urgency it deserves, which is to say, immediately.',
  'It is not that I object to your bagpipes; it is that I object to them at dawn, and with such conviction.',
  'The fence is mine, the apples are mine, and the squirrel, regrettably, appears to be yours.',
  'Please be advised that my solicitor is a very large man named Doug, and he owns a ladder.',
  'Dear Madam, the sign on your lawn says "No Ball Games," yet your husband persists.',
  'I am writing to complain about your previous letter, which complained about the letter before that.',
  'With respect, sir, a leaf blower at midnight is not a hobby; it is a declaration of war.',
  'Yours sincerely, a gnome who has been very patient, and who is now running out of patience.',
  'P.S. I have kept a copy of this letter, and of the last forty, in a very large folder.',
];

const villain = [
  'Before I destroy you, allow me to explain my plan in exhausting detail.',
  'You fool! You\'ve fallen directly into my trap, which, I admit, was mostly a hole.',
  'Join me, and together we shall rule the garden as father and slightly confused son.',
  'Did you truly believe that a mere hedgehog could stop me? Well, yes, he did slow me down a bit.',
  'My lair has everything: a shark tank, a lava moat, and a surprisingly reasonable dental plan.',
  'Soon, every lawn in the land will bow before me, and they will all be mown in stripes.',
  'I could have been a hero, but the villains had better snacks and a more flexible schedule.',
  'You may have won this battle, but I still have your library card, and it is very overdue.',
  'Guards! Seize them! And somebody fetch me a cushion, because this throne is murder on my back.',
  'Once my doomsday device is ready, nobody will ever park outside my house again.',
  'Do you hear that? That is the sound of inevitability, and also my kettle.',
  'I didn\'t become an evil genius by playing fair; I became one by reading the terms and conditions.',
  'Release the hounds! No, not those hounds; the other ones, with the tiny helmets.',
  'The world laughed at my inventions, so I built a machine that laughs back, louder.',
  'Behold my ultimate weapon: a garden gnome with a grudge and a very pointy hat.',
  'You have exactly ten seconds to surrender, or I will start counting from ten again, very slowly.',
  'Mark my words: I shall return, possibly in a sequel, and almost certainly with better lighting.',
  'Of course I have a secret volcano base; I\'m a villain, not an amateur.',
  'Every hero needs a nemesis, and every nemesis needs a hobby; mine happens to be revenge.',
  'Curses! Foiled again, and by a pigeon, which is going to look terrible in the newsletter.',
];

export const SERIES = [
  { id: 'pride', name: 'Pride & Prejudice', blurb: 'Chapter one, from the top, every race. Same text for everyone, so it\'s the fairest fight.', order: 'book', passages: pride },
  { id: 'mix', name: 'Chaos Mix', blurb: 'A bit of everything below, shuffled.', order: 'shuffle', passages: null },
  { id: 'openings', name: 'Famous First Lines', blurb: 'Classic opening lines, all long out of copyright.', order: 'shuffle', passages: openings },
  { id: 'noir', name: 'Gnome Noir', blurb: 'A hard-boiled detective with a soft-glazed heart.', order: 'shuffle', passages: noir },
  { id: 'memo', name: 'Per My Last Email', blurb: 'Office memos, sharpened to a point.', order: 'shuffle', passages: memo },
  { id: 'nature', name: 'Nature Documentary', blurb: 'The garden, narrated with enormous gravitas.', order: 'shuffle', passages: nature },
  { id: 'trash', name: 'Trash Talk', blurb: 'Things to say while overtaking.', order: 'shuffle', passages: trash },
  { id: 'letters', name: 'Strongly Worded Letters', blurb: 'Complaints to the neighbours, with full Victorian outrage.', order: 'shuffle', passages: letters },
  { id: 'villain', name: 'Villain Monologues', blurb: 'Evil plans, explained in exhausting detail.', order: 'shuffle', passages: villain },
];
const MIX_FROM = ['openings', 'noir', 'memo', 'nature', 'trash', 'letters', 'villain'];

export function getSeries(id) { return SERIES.find((s) => s.id === id) || SERIES[0]; }

const asPassage = (p) => (typeof p === 'string' ? { text: p, src: null } : p);
function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function passagesOf(series) {
  if (series.id === 'mix') return MIX_FROM.flatMap((id) => getSeries(id).passages);
  return series.passages;
}

// Hands out lines of at most `width` characters, packing sentences end to end
// (like a typing test) and breaking only between words. The space at a line
// break is dropped: finishing a line counts as typing it.
export class SentenceFeed {
  constructor(seriesId, width = 44, rand = Math.random) {
    this.series = getSeries(seriesId);
    this.width = width;
    this.rand = rand;
    this.queue = [];
    this.words = [];   // [{ w, src }]
  }
  refill() {
    const all = passagesOf(this.series).map(asPassage);
    this.queue = this.series.order === 'book' ? all : shuffled(all, this.rand);
  }
  // { text, src }: the next line and where it's from (src of its first word).
  next() {
    if (!this.words.length) this.pull();
    const first = this.words[0];
    let line = '';
    while (this.words.length) {
      const w = this.words[0].w;
      if (line && line.length + 1 + w.length > this.width) break;
      line = line ? `${line} ${w}` : w;
      this.words.shift();
      // the feed never runs dry: top up with the next passage
      if (!this.words.length) this.pull();
    }
    return { text: line, src: first.src };
  }
  pull() {
    if (!this.queue.length) this.refill();
    const p = this.queue.shift();
    for (const w of p.text.split(/\s+/).filter(Boolean)) this.words.push({ w, src: p.src });
  }
}

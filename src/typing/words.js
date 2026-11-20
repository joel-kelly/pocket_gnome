// Words for typing practice: everyday words a 10-year-old knows, plus plenty of
// garden words. The engine only uses words made entirely of unlocked keys.
// Add more words here! (lowercase, letters only)

const RAW = `
a as ad add ads all alas fad fads fall falls flask flasks dad dads lad lads sad salad salads ask asks
lass glass glad flag flags gas hash dash lash sash shall half hall halls has had hag jag jags gag
lag lags slag slash flash clash shag slush gush hush lush mush rush
see seed seeds feed feeds deed sea seal seals sell sells shell shells she shed sheds lead leads leaf
fish dish dig digs fig figs gift gifts hike hikes hid hide side sides slide slides life like likes lie lies
die dies said aside idea ideas ill sick kid kids kiss lid lids his him hi hie jig jigs
fail fails hail sail sails snail snails jail kale field fields shield aisle easel ease
red reds read reads ride rides drive here hear heard her hers rake rakes rare rash fire fires hire
are art arts ear ears hare hares ride rug rugs rule rules ruler sure use used user fur fudge fresh
dear deer fear gear year rear grass gardener garden gardens rider spider sugar jar jars far
true rule hurt hurts sir stir fur surf turf fruit fruits suit suits glue clue
toad toads toast tree trees treat treats tail tails tale tall tea tooth roof roots root rot hot
foot feet food good road roads rose roses store story those other father fort forts hoot hoe
tire tired dirt dirty three stool stools stood shoot shoots tooth hut huts out outside door doors
otter otters rotor odd old older gold told hold holds fold soft loft lost lot lots tot goat goats
float floats flute fort turtle turtles little letter leather sheet street tight light lights sight
fight right tight night nights shirt short sort sorted tidy tide ride
and sand hand hands land lands stand plan can cone cones nice nice ice cake cakes cat cats
nest nests net nut nuts tin ten tent tents ant ants rain rains train trains chin chins
nose noses cotton candle candles cocoa coat coats cart carts card cards clean cleans cloud clouds
crane cranes corn cone dance dances once one ones none north notice nine friend friends
ocean oceans orange onion onions acorn acorns cocoon count counts
win wind winds window windows wood woods wool worm worms water waters wet wish wishes
was we well west word words world snow snowman swim swims sweet sweets swing swings
moon moons milk mint mice man men moss mole moles mud muddy meadow meadows mushroom mushrooms
mom mama warm worm smile smiles summer swim team time times home homes made make makes
come comes name names game games same some mouse whiskers
yes yard yarn yellow yummy you your happy puppy puppies pond ponds pea peas peach peaches pie pies
pot pots pots apple apples paper pencil pencils play plays pool pools party pear pears picnic
plant plants pumpkin pumpkins pansy poppy poppies petal petals pinecone pinecones type types
sky toy toys yay key keys spy hay day days may way play pray
bee bees bird birds bug bugs bunny bunnies bear bears book books boot boots berry berries bloom
blue boat boats bench bridge brown bubble bubbles butter butterfly basket baskets
vine vines vase vases van very violet violets veggie veggies vest even ever over cover river silver
brave blossom beaver beavers vole voles
quiet quick quiz queen queens zoo zoom zebra zebras fox foxes box boxes six taxi fix mix wax
zip zigzag zinnia buzz fizzy fuzzy puzzle lazy dozen breeze squeeze squirrel squirrels squash
quack quilt equal liquid frozen sneeze snooze cozy
gnome gnomes hat hats beard beards garden flower flowers sunflower sunflowers balloon balloons
pigeon pigeons cloud rocket teapot kettle cookie cookies radish radishes carrot carrots leek
lettuce tomato tomatoes cabbage hedge fence gate path stone stones pebble pebbles shovel
hose sprout sprouts seedling soil compost wheelbarrow watering lantern lanterns toadstool
puddle puddles froggy frog frogs lily ladybug ladybugs beetle beetles snail slug dragonfly
honey jam toast tart tarts muffin muffins scone scones crumb crumbs biscuit biscuits soup
grandpa grandma uncle aunt sister brother family friends neighbor kindness laugh laughs giggle
jump jumps hop hops skip skips run runs walk walks sit sits nap naps hug hugs wave waves
fly flies float drift swirl twirl spin spins giggle wiggle wobble tumble mumble rumble
the of to in it is that for on with this be at by from or an not but they all were what
there when up so if about which would their will how each she do many then them these
been more like into time has look two write go see number no could people my than first
been call who its now find long down get made may part over new sound take only little
work know place year live me back give most very after thing our just name good sentence
great think say help low line before turn cause much mean move right boy girl old too
does tell want air also show around form three small set put end why again kind big
went ask men need house picture try us animal point mother page letter answer found
study still learn should world high every near add food between own below country
plant last school keep tree never start city earth eye light thought head under story
saw left few while along might close something seem next hard open example begin life
always those both paper together got group often run important until children side feet
car mile night walk white began grow took river four carry state book hear stop
without second later miss idea enough eat face watch far really almost let above girl
sometimes mountain cut young talk soon list song being leave family
`;

export const WORDS = [...new Set(RAW.split(/\s+/).filter((w) => /^[a-z]+$/.test(w)))];

// Little sentences for later stages (capitals and periods). Gnome-flavored.
export const SENTENCES = [
  'The gnome has a red hat.', 'Gerald stole my snack.', 'I like to dig in the garden.', 'The frog sat on a lily pad.',
  'Grandgnome makes good soup.', 'We flew up to the moon.', 'A snail is very slow.', 'The sunflower is so tall.',
  'Look at the big balloon.', 'My hat fell in the pond.', 'Bees like the pink flowers.', 'Time for a cup of tea.',
  'The pigeon sat on my hat, again.', 'I can type with all ten fingers.', 'Please pass the berry tart.',
  'The moon looks like cheese.', 'Rain makes the garden grow.', 'Hop, hop, hop to the gate.', 'Let us plant some seeds.',
  'A tidy garden is a happy garden.', 'The flamingo is showing off.', 'Squirrels love acorns.', 'I see a ladybug.',
];

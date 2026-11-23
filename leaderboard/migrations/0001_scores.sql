-- Every finished Gnomageddon race.
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initials TEXT NOT NULL,          -- 1-3 letters or digits, upper case
  score INTEGER NOT NULL,          -- round(wpm * (acc / 100)^2)
  wpm INTEGER NOT NULL,
  acc INTEGER NOT NULL,            -- percent
  secs INTEGER NOT NULL,           -- race length: 30, 60 or 120
  series TEXT NOT NULL,            -- which sentences (pride, mix, noir...)
  place INTEGER,                   -- 1-4 against the critters
  at INTEGER NOT NULL              -- when, in ms since 1970
);
CREATE INDEX IF NOT EXISTS scores_top ON scores (secs, score DESC);
CREATE INDEX IF NOT EXISTS scores_who ON scores (initials, at DESC);

# Gnomageddon leaderboard (Cloudflare)

The shared high-score table for **Gnomageddon**, the secret grown-up race. It's a tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) with a [D1](https://developers.cloudflare.com/d1/) database (SQLite). The free plan is plenty for a few friends.

Until it's set up, the game keeps scores in each browser on its own, so you can try everything first.

## Setting it up (about 5 minutes)

You need a free Cloudflare account and Node.js. From this `leaderboard/` folder:

1. Log in to Cloudflare (opens a browser):

   ```bash
   npx wrangler login
   ```

2. Make the database:

   ```bash
   npx wrangler d1 create gnomageddon
   ```

   It prints a `database_id`. Paste it into `wrangler.toml` in place of `PASTE-YOUR-DATABASE-ID-HERE`.

3. Make the scores table:

   ```bash
   npx wrangler d1 migrations apply gnomageddon --remote
   ```

4. Put the Worker online:

   ```bash
   npx wrangler deploy
   ```

   It prints the Worker's address, something like `https://gnomageddon-leaderboard.<you>.workers.dev`. Open it in a browser and you should see `{"ok":true,...}`.

5. Tell the game where it is: in `src/rage/config.js`, set

   ```js
   export const LEADERBOARD_URL = 'https://gnomageddon-leaderboard.<you>.workers.dev';
   ```

   and commit/push so GitHub Pages picks it up.

Optional: in `wrangler.toml`, change `ALLOWED_ORIGIN` from `"*"` to your game's address (e.g. `"https://you.github.io"`) and deploy again, so only your page can post scores from a browser.

## What it stores

One row per finished race: initials, score, WPM, accuracy, race length, which sentences, finishing place and when. Quitting mid-race doesn't post anything.

**Score = WPM × (accuracy ÷ 100)²**, rounded. The Worker works the score out itself from the WPM and accuracy, rather than trusting the number it's sent.

There are no accounts or passwords: anyone can post as any initials, and anyone who knows the address could post a made-up score. That's fine for a game among friends. To wipe a bad score:

```bash
npx wrangler d1 execute gnomageddon --remote --command "DELETE FROM scores WHERE id = 123"
```

And to look at everything:

```bash
npx wrangler d1 execute gnomageddon --remote --command "SELECT * FROM scores ORDER BY score DESC LIMIT 20"
```

## The API

| | |
|---|---|
| `POST /api/scores` | `{ initials, wpm, acc, secs, series, place }` → `{ entry, rank, of, prevBest, isBest }` |
| `GET /api/top?secs=60&limit=15` | the best races at that length (`secs=0` for all lengths) → `{ rows }` |
| `GET /api/history?initials=ABC&limit=30` | one driver's races, newest first, plus their best at each length → `{ initials, rows, stats }` |

## Trying it on your own computer

```bash
npx wrangler d1 migrations apply gnomageddon --local
npx wrangler dev
```

Then set `LEADERBOARD_URL` to `http://localhost:8787` while you test (and set it back before you push).

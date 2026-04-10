# Engine Smoke Test for Integration

This folder contains a lightweight browser harness to validate the C++ WASM bridge.

## Files

- `../frontend/public/wasm/game.js` and `../frontend/public/wasm/game.wasm`: build artifacts copied from the engine build.
- `wasm-smoke-test.html`: manual bridge test page (loads runtime, calls `load_level`, reads debug exports).

## Run Locally

From the repository root:

Serve from repository root so the smoke page can access frontend artifacts:

```bash
cd /workspaces/wasm-rpg-neofuture
python3 -m http.server 4173
```

Open:

- `http://localhost:4173/engine/wasm-smoke-test.html`

## What To Verify

1. Runtime badge changes to `Runtime initialized`.
2. Canvas shows the engine rendering output.
3. `Load Sample JSON` updates the map and player start.
4. `Get Player Pos` returns a non-empty string from `get_player_pos`.
5. `Check Win Flag` returns `0` initially and `1` when objective is reached.

## Optional API Validation

If backend is running, keep the default API URL on the page and click `Fetch API + Load`.
The page will fetch JSON and call `load_level` automatically.

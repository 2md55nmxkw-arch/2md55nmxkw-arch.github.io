# 2md55.arch vs the binary

Personal site: <https://2md55nmxkw-arch.github.io>

The site is one annotated chess game, Légal's mate in seven moves. Scrolling plays the game on the small
board in the score sheet. White's moves are mine, black's replies are the binary's, and every half-move is
a scene. On wide screens the stage is pinned and the scenes cut into each other like shots of a film; on
small screens (and with reduced motion) the same scenes simply stack.

| move | scene |
| :-- | :-- |
| 1. e4 e5 | Title: a strobing chess diagram, then the focus pulls from the black king to the name. |
| 2. Nf3 d6 | About: a wall of text is typed by the scroll, a glitched pawn flies in and its trail is its own last frames. |
| 3. Bc4 Bg4 | LuauEmu, then how it runs: the command, the Instance tree, all 44 UNC functions as a ticker. |
| 4. Nc3 g6 | ModLoader, then its four files with a knight hopping from one to the next. |
| 5. Nxe5!! Bxd1 | il2dump, then a metadata header being read while `dump.cs` is written beside it. |
| 6. Bxf7+ Ke7 | The stack as a lineup of pieces (drag one), then material by language and the last 64 days as 64 squares. |
| 7. Nd5# | Mate. Contacts, with noise-filled hands closing in from the frame edges. |

Transitions: a push, a two-frame flash cut, hard cuts with a strobe burst, a blade wipe into each reply, a
whip pan, a zoom through the lineup and one white frame on the mate.

## How it moves

The scroll position is a playhead. Every frame it is eased towards the real scroll position and each scene
reads it to place itself, so motion stays smooth on a notchy wheel. Only transforms and opacity change
while scrolling; everything expensive (strobe fills, noise, glitch blocks, tinted silhouettes) is drawn
once up front and then just blitted.

Live data, each with a baked-in fallback: star counts (GitHub API), material and the 64-day board (JSON in
the profile repository), ratings next to the chess.com link (chess.com public API).

## Run

No build step and no dependencies. Serve the folder with any static server:

    python3 -m http.server 8080   # then open http://localhost:8080

(Opening `index.html` straight from disk will not work: the page reads pixels from its own images,
which browsers only allow over http.)

## Files

    index.html   markup and copy
    style.css    both layouts (film and stacked) and type
    main.js      the playhead and the scenes (canvas 2D, no libraries)
    assets/      piece renders, hand silhouettes, font, favicon

## Credits

- Chess set 3D model by Riley Queen ([Poly Haven](https://polyhaven.com/a/chess_set), CC0).
- Type: Montserrat, SIL Open Font License (`assets/fonts/OFL.txt`).

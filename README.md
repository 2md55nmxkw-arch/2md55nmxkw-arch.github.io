# 2md55.arch

Personal site: <https://2md55nmxkw-arch.github.io>

One static page in the style of the profile header: pure black, heavy wide caps, chess pieces,
datamosh colour and tracker labels.

- **Title** – a strobing chess diagram, a hard cut, then the focus pulls from the black king to the name.
- **Wall** – a wall of text that types itself in; a glitched pawn follows the pointer and its trail is
  its own last 14 frames, coloured by age.
- **Pieces on the board** – three projects as a king, a queen and a rook; each figure strobes through
  fills (letters, dots, glyphs, mosaic, pixels, hatching, pink) and shows the real piece on hover.
- **Lineup** – the stack as a row of pieces that pop in on an uneven beat.
- **Your move** – contacts, with noise-filled hands closing in from the frame edges.

## Run

No build step and no dependencies. Serve the folder with any static server:

    python3 -m http.server 8080   # then open http://localhost:8080

(Opening `index.html` straight from disk will not work: the page reads pixels from its own images,
which browsers only allow over http.)

## Files

    index.html   markup and copy
    style.css    layout and type
    main.js      the animations (canvas 2D, no libraries)
    assets/      piece renders, hand silhouettes, font, favicon

Motion is reduced automatically for visitors who ask for it (`prefers-reduced-motion`).

## Credits

- Chess set 3D model by Riley Queen ([Poly Haven](https://polyhaven.com/a/chess_set), CC0).
- Type: Montserrat, SIL Open Font License (`assets/fonts/OFL.txt`).

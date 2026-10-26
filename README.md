# Mini Arcade Widget – Adventure Time themed

A tiny web widget that hosts two classic games (Snake and Breakout) inside a single 300 × 300 px canvas.  The UI is styled with a gradient inspired by **Adventure Time** and uses a retro "Press Start 2P" pixel font.

## Files
| File | Purpose |
|------|---------|
| `index.html` | Entry point – widget layout and buttons |
| `style.css` | Adventure Time‑themed styling |
| `arcade.js` | Game logic for Snake and Breakout |
| `README.md` | This file |

## How to run locally
1. Open `index.html` in any modern browser (Chrome, Edge, Firefox). No server is required.
2. Click **Snake** or **Breakout** to start a game. Use arrow keys to control:
   * Snake – arrow keys change direction.
   * Breakout – left/right arrows move the paddle.
3. Press **Reset** to restart the current game.

## Publish publicly (GitHub Pages)
1. **Create a new GitHub repository** – e.g. `mini-arcade-widget`.
2. Clone the repo locally or use the GitHub web UI to add files.
3. Copy the entire `mini_arcade_widget/` folder (or just the three files) into the repository root.
4. Commit and push:
   ```bash
   git init
   git add .
   git commit -m "Add Mini Arcade widget"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/mini-arcade-widget.git
   git push -u origin main
   ```
5. In the repo settings go to **Pages** → **Source** → select the `main` branch and `/ (root)` folder.
6. GitHub will publish the site at:
   ```
   https://<YOUR_USERNAME>.github.io/mini-arcade-widget/
   ```
   Share that URL – anyone can open the widget on Chrome.

## Customising the Adventure Time look
* The background gradient is defined in `style.css`. Change the colors to match any Adventure Time scene you like.
* To use a background image instead of the gradient, replace the `background-image` rule with:
  ```css
  background-image: url('assets/your_image.png');
  ```
  and place the image inside an `assets/` folder next to the other files.

## License
Feel free to use, modify, and share this widget for educational purposes. No external dependencies.

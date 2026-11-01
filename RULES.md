# UNO House Rules (v1)

A command-line UNO game for **2–4 players**. The first player to empty their hand wins.

## Terms

| Term | Meaning |
|---|---|
| **Draw pile** | Face-down pile that players draw from. |
| **Discard pile** | Face-up pile that cards are played onto. Its top card is the **top card**. |
| **Current color** | The color the next card must match. Usually the top card's color; after a Wild / Wild Draw Four, the color its player chose. |
| **Penalty stack** | The running total of cards owed after +2s or +4s are played in a row. |
| **UNO window** | The 30 seconds after a player gets down to one card (§8). |

## 1. Rooms & Lobby

### Creating and joining
- A player either **creates a room** or **joins an existing room** using its room key.
- The creator becomes the **host** and shares the room key with the other players.
- A room holds **2–4 players**. A join is rejected if the room is full or the game has already started.

### Settings
- The host chooses the settings on a settings screen **while creating the room**. They are **fixed** after that.

| Setting | Default | Allowed |
|---|---|---|
| Hand size | 7 | 1–20 |

The max of 20 guarantees the deal fits the deck: 4 players × 20 = 80 of the 108 cards.

### Starting
- Only the host can start the game, and only when the room has at least 2 players.
- Starting begins a **3-second countdown**. The cards are dealt when it ends.
  - Players can still join during the countdown, and they're dealt in.
  - If fewer than 2 players are left, the countdown is **cancelled**.
  - The host can't start a second countdown while one is running.

## 2. The Deck

108 cards:

| Card | Per color (red, yellow, green, blue) | Total |
|---|---|---|
| 0 | 1 | 4 |
| 1–9 | 2 each | 72 |
| Skip | 2 | 8 |
| Reverse | 2 | 8 |
| Draw Two (+2) | 2 | 8 |
| Wild | — | 4 |
| Wild Draw Four (+4) | — | 4 |

## 3. Setup

1. Shuffle the deck and deal each player **hand-size** cards.
2. Flip the top card of the draw pile onto the discard pile.
   - If it's an action card or a wild, put it back into the draw pile at a **random position** and flip again. Repeat until a number card comes up.
3. The turn order is the order in which players joined. The first player goes first.

## 4. Taking a Turn

### Playable cards
With **no penalty stack** pending, a card is playable if:
- it matches the **current color**, or
- it matches the top card's **number or symbol** (e.g. Skip on Skip), or
- it is a **Wild** or **Wild Draw Four**. A Wild Draw Four can be played **at any time**.

When a **penalty stack** is pending, see §6.

### Your options
On your turn, do exactly one of:
- **Play** a playable card, or
- **Draw** one card. You may draw even if you hold a playable card.
  - After drawing, you may **play any playable card** from your hand (not only the drawn one), or **pass**. You cannot draw again.
  - If you have no playable card after drawing, your **turn ends** automatically.
  - If you pass, your **turn ends**.

## 5. Action Cards

| Card | Effect |
|---|---|
| **Skip** | The next player loses their turn. |
| **Reverse** | Reverses the turn direction. When only **2 players** remain, it acts as a **Skip**. |
| **Wild** | You choose the current color. |
| **Draw Two (+2)** | Starts or adds to a +2 penalty stack (§6). |
| **Wild Draw Four (+4)** | You choose the current color, and it starts or adds to a +4 penalty stack (§6). |

## 6. Penalty Stacks

- When a +2 is played, the next player must either:
  - **stack** another +2 on it (adds 2 to the stack), or
  - **draw** the whole stack.
- +4 works the same way, but only another +4 can be stacked on it.
- **No mixed stacking:** +2 only goes on +2, and +4 only goes on +4.
- After drawing the stack, the player's **turn ends**. They cannot play any of the drawn cards.
- After a +4 stack is drawn, the next player plays to the **color chosen by the last +4 player**.

## 7. Draw Pile Runs Out

- The **top card stays** on the discard pile. Every card beneath it is shuffled to become the new draw pile.
- Wilds that go back into the draw pile lose their chosen color.
- If a draw still needs more cards than both piles hold, the player draws **as many as exist**.

## 8. Calling UNO

### The window
- When a player plays down to **one card**, their **UNO window** opens for **30 seconds**. Play continues during the window.
- During the **first 3 seconds**, only that player can call `uno`. This makes up for the others being able to have `uno` already typed and ready. Calls from other players during these 3 seconds are **ignored**.
- You can only call UNO **after** playing down to one card, not before.

### Outcomes

| What happens | Result |
|---|---|
| The player types `uno` + Enter first | Safe. The window closes. |
| Another player types `uno` first (after the 3 seconds) | The player draws a **4-card penalty**. |
| Nobody calls it within 30 seconds | The player draws a **4-card penalty**. |
| The player's turn comes up and they try to play their last card without having called | The card is **not played** and stays in their hand. They draw a **4-card penalty** (plus any pending +2/+4 stack) and **lose their turn**. You cannot win without calling UNO. |

The window also closes when a penalty is given, or if the player's hand goes above one card for any other reason.

### Multiple windows and who a call affects
Several UNO windows can be open at once. When a player types `uno`:
1. If they have their own open window, the call **saves them** and does nothing else.
2. Otherwise, it **catches every** other player whose window is past the 3-second head start. Each of them draws 4.
3. If windows are open but all are still within their head start, the call is **ignored**.
4. If no windows are open at all, it's a **false call**: the caller draws 4.

## 9. Winning

- The **first player to empty their hand wins**, and the game ends. The winning card can be any card, including an action card.
- If players are removed (§10) until only **one** remains, that player wins.

## 10. Disconnects

- A disconnected player keeps their seat and can **reconnect** to the same room within **30 seconds**.
- If it's their turn while they're disconnected, the game **waits** for them, for up to those 30 seconds.
- If they don't reconnect in time:
  - The other players are **notified**.
  - Their cards are **shuffled into the draw pile**.
  - They are **removed** from the turn order. If it was their turn, play passes to the next player.
  - If a penalty stack was waiting on them, it is **cleared**. It does not pass to the next player.
- **In the lobby**, a player who doesn't reconnect within 30 seconds is removed from the lobby.
- The **host**:
  - Before the room is created, a disconnect means no room is created.
  - After that, the host reconnects like any other player.
  - If the host is removed from the lobby, the **next player in join order** becomes the host. If nobody is left, the room is closed.

## 11. Timers

All timers are kept by the server.

| Timer | Length | Starts when | On expiry |
|---|---|---|---|
| UNO head start | 3 s | A player plays down to one card | Other players' calls are accepted |
| UNO window | 30 s | Same | Penalty of 4 cards (if no one called) |
| Reconnect grace | 30 s | A player disconnects | Player is removed (§10) |
| Start countdown | 3 s | The host starts the game | Cards are dealt (§3), or cancelled if fewer than 2 players are left |

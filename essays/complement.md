[Return to game](https://user670.github.io/tetris-trainer-tres-bien/)

# Complementary material (regarding the Guideline)

*(This is not a faithful translation of the original Japanese - Teatube ... and the Translator added a bunch of their own insights to it.)*

The techniques we learned so far are all based on Guideline rules (or "World rules").

The name "World rules" comes from the GBA game Tetris Worlds (2004), which has been officially licensed by The Tetris Company (TTC). (TL: and "Guideline" comes from the document called "Tetris Design Guideline") The rule later became well known in games like Tetris DS, Tetris Online Japan and Tetris Friends. All officially licensed games ("Official Tetris product" or have that Tetris copyright splash screen) released after 2005 follow the Guideline, including Puyo Puyo Tetris, Tetris 99, Tetris Effect and so on.

So, what rules are there in Guideline? What made it different from Tetris games before that? Here are some typical features:

> has HOLD, where you can hold onto one piece for later<br />
> has soft drop (increase falling speed), hard drop (instantly drop and lock), ghost block (preview of landing position)<br />
> has many NEXT previews, at least 3, usually 5-6<br />
> has "3-corner" T-Spin detection (last movement is rotation, 3 of 4 corners of the T occupied by blocks or out-of-bound)<br />
> has Super Rotation System, the thing that made the Spins possible<br />
> has standard piece colors (cyan I, purple T, blue J, orange L, yellow O, green S, red Z)<br />
> has "bag 7" randomizer (the first 7 pieces are the 7 different types without duplicates, same for next 7, and next 7, and so on. Imagine every 7 pieces being a "bag" of the 7 types of pieces)<br />
> has Combo system (though it's absent from Tetris DS)

... and so on. It's quite a system. There are other stuff which you can look up online.

At first, the rules aren't fully-defined, and there are variations between games. For example, in Tetris Party Deluxe (DS, Wii) and Tetris Axis (3DS), all pieces other than I and O have spin bonus, but other games only have bonus for T-Spins. However in recent years, it's more stable and consistent across games.

Of course, none of them apply to classic Tetris. You can't even spin a T into a T-Spin Triple, let alone whether you would be rewarded or not.

**Game over conditions**

The game would give you game over for either of these conditions:

1. a new piece spawns overlapping with existing blocks,
2. a piece locks completely outside of the field (above the skyline).

"Outside of the field" refers to the unseen areas above row 20.

In other words, even when you have blocks outside of the field, as long as the piece has at least one block within the field, and it isn't blocking spawning of the next piece (i.e. not in the middle), you still have a chance to dig back down. (See also: puzzle 30-6 "Ultimate Combo")

**Combo vs Ren**

That feature is called "Ren" in Japanese, and "Combo" in other languages. It's only a terminology difference, and refer to the same thing.

**Hold**

This Trainer didn't implement HOLD, so the puzzles didn't involve them. However, HOLD is actually quite an important feature. Please use it as needed.

The original intent of this feature is probably "temporarily keep unwanted blocks out of the way", which is still a valid way of thinking. But pieces like S, Z, O are kinda hard to use, so better off getting them out of the HOLD slot ASAP. On the other hand if you have an I or a T in HOLD, it could be handy in a tricky situation.

If you are already used to using HOLD, just use it as you wish. Probably keep a T for T-Spin, or use it to choose between your current and held piece.

**You can't do O-Spin?**

Nope, if you are on an official game.

Unless you change the rotation system, rotation of O doesn't change its position. No, that "rotate it 600 times per second" nonsense doesn't work.

If you really want to give O-Spin a try, you can try changing the kick table in Nullpomino, or find a game that implemented O-Spin as an easter egg / April fool feature.

[Return to game](https://user670.github.io/tetris-trainer-tres-bien/)

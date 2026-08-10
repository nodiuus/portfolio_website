---
title: Building an XMB in the Browser
summary: Recreating the rhythm of a console interface without turning the web into a costume.
published: August 9, 2026
readTime: 4 min read
category: Interface Notes
author: Nisan
tags: Design, SolidJS, Interaction
order: 1
---
The XMB works because it makes position meaningful. Horizontal movement changes context; vertical movement explores it. Rebuilding that pattern for the web meant treating navigation as a spatial system instead of a collection of unrelated screens.

## Start With Spatial Rules

The interface keeps one active point while categories and entries move around it. That creates a small set of rules users can learn immediately:

- **Left and right** change the current category.
- **Up and down** move through the category's entries.
- **Enter** opens the selected entry.
- **Escape** moves one level back.

Those rules matter more than any individual animation. They are the grammar that makes the interface feel coherent.

## Preserve the Anchor

The selected item should remain legible while neighboring content shifts around it. In practice, the state is small enough to describe directly:

```ts
const [activeCategory, setActiveCategory] = createSignal(0);
const [activeItem, setActiveItem] = createSignal(0);
const [childOpen, setChildOpen] = createSignal(false);
```

Each row derives its position from the difference between its index and the selected index. The result is predictable motion without maintaining a separate animation state machine.

> Motion is useful when it explains where content came from, what stayed selected, and how to get back.

## Keep the Surface Quiet

The final layer is restraint. Panels stay translucent, labels remain brief, and visual effects sit behind the information hierarchy. The interface should still make sense when reduced-motion preferences remove most of the transitions.

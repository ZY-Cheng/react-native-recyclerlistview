# React Native RecyclerListView

> 🚧 **WIP**

## What

The component is a high performance list view component by recycle mechanism. It is a pure JS implementation, inspired by [recyclerlistview](https://github.com/Flipkart/recyclerlistview).

If you are looking for recycle list view component, you can try [flash-list](https://github.com/Shopify/flash-list). It is based on [recyclerlistview](https://github.com/Flipkart/recyclerlistview)

### Feature

- [x] Specify dimension by item's `data` or `index`
- [x] `RecyclerImage` component for solving remote image recycle flashing
- [x] Auto update items after `ScrollView` container re-layout
- [x] Horizontal layout
- [x] Debug mode, like `VirtualizedList`
- [x] Multi-column layout
- [ ] Item dimension correction
- [ ] Masonry layout
- [ ] Support changeable item dimension
- [ ] Sticky header

## Why

[Recyclerlistview](https://github.com/Flipkart/recyclerlistview) has powerful futures and complex logic. I wonder there maybe a more simpler way to implement it. So, I try to re-implement one in my way.

## About recycle

Recycle means no mount-unmount and using offscreen item to render new item.

If you watch RN bridge messages by `MessageQueue.spy()`, you will see lots of `UIManager.update()` rather than `UIManager.create()` when scrolling.

**Pros**: more lower memory, more less GCs , more higher performance, even more faster initial render.

**Cons**: there has blank when quickly scrolling.

## About the component

### Principle

Calculating next screen (i.e. in the component, it's named **viewable window**, or **viewport**) items in real-time. Also, there has another concept, **render window**. The render window's dimension can be adjusted by `renderAheadOffset` prop to render a few elements ahead of time.

**Fast calculation**: calculating next screen doesn't mean re-calculating from beginning. It finds next render items ahead of current items from endpoint of current items according to scrolling direction (i.e. when scrolling down, looking for down).If you enable debug mode, you will see how to work.

**Skipping unnecessary items**: When quickly scrolling, there have a lot of next render items area. These areas may be not continuous. The component also will not make up lost items, because for users, the broken areas will not be seen. What's more, RN's communication with Native is asynchronous by bridge. Received scroll offset may be out of date. So, the broken areas is unnecessary.

**Progressive render**: After quickly scrolling, you will see fragmented items out of render window. The component doesn't remove them. Don't worry, as you continue to scroll, they will be recycled one by one from the farthest.

**Smooth traffic**: RN bridge is busy, so the component use `requestAnimationFrame()` to reduce the amount of messages when scrolling. In test, reducing about 16%. This also enhances blank slightly, but it's worth. This ensures JS-FPS keeps around 10 in extreme case, rather than goes down to single digits.

**Recycle same layout items**: If recycled item's layout is very different from next render item (e.g. different component), RN will call `UIManager.create()` instead of `UIManager.update()`. The former is more expensive than the latter. So, the component recycles same layout component as far as possible by `type`. The `type` is generated by `getItemType` prop.

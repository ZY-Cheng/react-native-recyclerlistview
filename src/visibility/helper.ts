export function getItemDim<T = any>(
  dimension: MixItemDimension<T>,
  data: T,
  index: number,
): number {
  return typeof dimension === 'function' ? dimension(data, index) : dimension;
}

export function getScrollDirection(
  prevOffset: number,
  offset: number,
  velocity?: number,
): ScrollDirection {
  if (velocity !== undefined) {
    if (velocity > 0) {
      return ScrollDirection.FORWARD;
    }
    if (velocity < 0) {
      return ScrollDirection.BACKWARD;
    }
    return ScrollDirection.NONE;
  }
  if (prevOffset !== offset) {
    return prevOffset < offset
      ? ScrollDirection.FORWARD
      : ScrollDirection.BACKWARD;
  }
  return ScrollDirection.NONE;
}

type WinRange = [number, number];

export function isInRange(
  position: number,
  dimension: number,
  range: WinRange,
) {
  const [start, end] = range;
  return (
    (position >= start && position < end) ||
    (position + dimension > start && position + dimension <= end)
  );
}

export function isContainRange(
  position: number,
  dimension: number,
  range: WinRange,
) {
  const [start, end] = range;
  return position >= start && position + dimension <= end;
}

export function isOutRange(
  position: number,
  dimension: number,
  range: WinRange,
) {
  const [start, end] = range;
  return position + dimension < start || position > end;
}

export const enum RangeBoundary {
  BEFORE,
  AFTER,
}
export function isOutRangeAt(
  boundary: RangeBoundary,
  position: number,
  dimension: number,
  range: WinRange,
) {
  const [start, end] = range;
  return boundary === RangeBoundary.BEFORE
    ? position + dimension < start
    : position > end;
}

export function getViewableRange(
  scrollOffset: number,
  scrollerDim: number,
): [number, number] {
  return [scrollOffset, scrollOffset + scrollerDim];
}

export function getRenderRange(
  scrollOffset: number,
  scrollerDim: number,
  buffer: number,
): [number, number] {
  return [scrollOffset - buffer, scrollOffset + scrollerDim + buffer];
}

export const enum ScrollDirection {
  FORWARD = 1,
  BACKWARD = -1,
  NONE = 0,
}
export const enum IterationDirection {
  FORWARD = ScrollDirection.FORWARD,
  BACKWARD = ScrollDirection.BACKWARD,
}
export function getAheadRange(
  direction: IterationDirection,
  scrollOffset: number,
  scrollerDim: number,
  buffer: number,
): [number, number] {
  return direction === IterationDirection.FORWARD
    ? [scrollOffset + scrollerDim, scrollOffset + scrollerDim + buffer]
    : [scrollOffset - buffer, scrollOffset];
}

/**
 * Whether or not the item is in the viewable window.
 */
export function isViewable(
  position: number,
  dimension: number,
  scrollOffset: number,
  scrollerDim: number,
): boolean {
  const range = getViewableRange(scrollOffset, scrollerDim);
  return (
    isInRange(position, dimension, range) ||
    isContainRange(position, dimension, range)
  );
}

/**
 * Whether or not the item is out of render window.
 */
export function isOutRenderWin(
  position: number,
  dimension: number,
  scrollOffset: number,
  scrollerDim: number,
  buffer: number,
): boolean {
  const range = getRenderRange(scrollOffset, scrollerDim, buffer);
  return isOutRange(position, dimension, range);
}

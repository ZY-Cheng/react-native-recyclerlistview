import {
  getAheadRange,
  getItemDim,
  getRenderRange,
  getScrollDirection,
  isInRange,
  isOutRange,
  isOutRangeAt,
  isOutRenderWin,
  isViewable,
  IterationDirection,
  RangeBoundary,
  ScrollDirection,
} from './helper';

class LineVisibilityManager<T> implements LineVisibilityManagerPublicAPI<T> {
  /**
   * Note: for performance (i.e. minimize the amount of update.),
   * the data isn't order by index of data item.
   * And operate the data in place, return the shallow copy.
   */
  private _renderItemInfos: RenderItemInfo<T>[] = [];
  /**
   * The endpoints of render window.
   *
   * Note: The items in the bothEnds are ordered by index of data item
   */
  private _bothEnds: BothEnds<T> = [null, null];
  /**
   * Inner array of each type is order by index of data item.
   */
  private _typedIndexesMap: Map<RenderType, number[]> = new Map();
  /**
   * Inner array of each type is order by index of data item.
   * Each array store item indexes that out of render window.
   *
   * When replacing typed item outside viewable window,
   * there may be the situation that someone item is a endpoint of render window,
   * and the item type doesn't match, so the item will become stale one that outside render window.
   * So that we can priority to replace it in the subsequent.
   */
  private _itemIdxToItemInfoIdxMap: Map<number, number> = new Map();
  private _scrollerDim = 0;
  private _renderAheadOffset = 0;
  private _scrollOffset = 0;
  private _line = 1;
  private _numLines = 1;
  private _getItemType: GetRenderType<T>;
  private _itemDim: MixItemDimension<T>;

  constructor(
    itemDim: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
    renderAheadOffset: number,
    numLines: number,
    line: number,
  ) {
    this._line = line;
    this._numLines = numLines;
    this._renderAheadOffset = renderAheadOffset;
    this._itemDim = itemDim;
    this._getItemType = getItemType;
  }

  getBothEnds() {
    return this._bothEnds;
  }
  getRenderItemInfos() {
    return this._renderItemInfos;
  }
  getScrollerDim() {
    return this._scrollerDim;
  }
  getRenderAheadOffset() {
    return this._renderAheadOffset;
  }
  getScrollOffset() {
    return this._scrollOffset;
  }

  resize(data: T[], dimension: number, scrollOffset: number) {
    this._scrollOffset = scrollOffset;
    this._scrollerDim = dimension;
    if (this._scrollerDim === 0) {
      this._clearRenderItemInfos();
      return [];
    }
    if (this._renderItemInfos.length === 0) {
      return this.render(data);
    } else {
      return this.forceUpdate(data, scrollOffset);
    }
  }

  /**
   * Update items only in the front of the endpoint.
   * (i.e. when scrolling forward, only update items in the front of render window,
   * and vice versa)
   */
  update(data: T[], scrollOffset: number) {
    const isScrolled = scrollOffset !== this._scrollOffset;
    if (
      data.length > this._renderItemInfos.length &&
      // Prevent unnecessary execution from async execution
      // (e.g. `requestAnimationFrame`).
      isScrolled
    ) {
      const scrollDirection = getScrollDirection(
        this._scrollOffset,
        scrollOffset,
      );
      this._scrollOffset = scrollOffset;

      if (scrollDirection !== ScrollDirection.NONE) {
        let direction = scrollDirection as unknown as IterationDirection;

        this._updateRenderItemInfos(data, direction);
      }
    }

    return [...this._renderItemInfos];
  }

  /**
   * Force update all items in render window.
   */
  forceUpdate(data: T[], scrollOffset: number) {
    this._scrollOffset = scrollOffset;
    const selectedEndpoint = this._bothEnds[0];
    if (selectedEndpoint) {
      const itemInfo = this._getItemInfo(selectedEndpoint);
      this._clearRenderItemInfos();
      this._appendItemInfo(itemInfo.item);
      this._setBothEnds(selectedEndpoint, selectedEndpoint);
    }
    this._updateRenderItemInfos(data, IterationDirection.FORWARD);
    this._updateRenderItemInfos(data, IterationDirection.BACKWARD);

    return [...this._renderItemInfos];
  }

  render(data: T[]) {
    this._clearRenderItemInfos();
    this._updateRenderItemInfos(data, IterationDirection.FORWARD);

    return [...this._renderItemInfos];
  }

  private _clearRenderItemInfos() {
    this._renderItemInfos.splice(0, this._renderItemInfos.length);
    this._setBothEnds(null, null);
    this._itemIdxToItemInfoIdxMap.clear();
    this._typedIndexesMap.clear();
  }

  private _getItemInfo(item: RenderItemInfo<T>) {
    const itemIdx = this._itemIdxToItemInfoIdxMap.get(item.index)!;
    return {index: itemIdx, item};
  }

  private _putTypedIndex(item: RenderItemInfo<T>) {
    if (item.type !== undefined) {
      const existMap = this._typedIndexesMap.get(item.type);
      const typedIndexes = existMap || [];
      if (typedIndexes.length > 0 && typedIndexes[0] > item.index) {
        typedIndexes.unshift(item.index);
      } else {
        typedIndexes.push(item.index);
      }
      if (!existMap) {
        this._typedIndexesMap.set(item.type, typedIndexes);
      }
    }
  }

  private _appendItemInfo(item: RenderItemInfo<T>) {
    this._renderItemInfos.push(item);
    this._itemIdxToItemInfoIdxMap.set(
      item.index,
      this._renderItemInfos.length - 1,
    );
    this._putTypedIndex(item);
  }

  private _takeTypedIndex(item: RenderItemInfo<T>) {
    if (item.type !== undefined) {
      const replacedTypedIndexes = this._typedIndexesMap.get(item.type)!;
      if (replacedTypedIndexes[0] === item.index) {
        replacedTypedIndexes.shift();
      } else {
        replacedTypedIndexes.pop();
      }
    }
  }

  private _replaceItemInfo(
    replacedItem: RenderItemInfo<T>,
    item: RenderItemInfo<T>,
  ) {
    const replacedIdx = this._itemIdxToItemInfoIdxMap.get(replacedItem.index)!;
    this._renderItemInfos[replacedIdx] = item;
    this._itemIdxToItemInfoIdxMap.delete(replacedItem.index);
    this._itemIdxToItemInfoIdxMap.set(item.index, replacedIdx);
    this._takeTypedIndex(replacedItem);
    this._putTypedIndex(item);
  }

  private _setBothEnds(
    start: RenderItemInfo<T> | null,
    end: RenderItemInfo<T> | null,
  ) {
    this._bothEnds[0] = start;
    this._bothEnds[1] = end;
  }

  private _updateRenderItemInfos(data: T[], direction: IterationDirection) {
    const nextRenderItemInfos = this._findAppearingItems(data, direction);

    if (nextRenderItemInfos.length > 0) {
      const {
        _renderItemInfos: renderItemInfos,
        _bothEnds: bothEnds,
        _itemIdxToItemInfoIdxMap: itemIdxToItemInfoIdxMap,
      } = this;
      const isForward = direction === IterationDirection.FORWARD;
      const disappearingEndpointLocation = isForward ? 0 : 1;
      const newItemInfoEndpointLocation = isForward ? 1 : 0;
      let disappearingEndpoint = bothEnds[disappearingEndpointLocation];
      const anotherEndpoint = bothEnds[newItemInfoEndpointLocation];
      const nextIdxStep = direction * this._numLines;

      for (let i = 0; i < nextRenderItemInfos.length; i++) {
        const item = nextRenderItemInfos[i];
        if (itemIdxToItemInfoIdxMap.has(item.index)) {
          // The item has rendered. Not repeat process, skip!
          bothEnds[newItemInfoEndpointLocation] = item;
          continue;
        }

        const originalDisappearingEndpoint = disappearingEndpoint;
        if (disappearingEndpoint) {
          // Find the farthest typed item far away from the render item.
          const typedEndpoint = this._findFarthestDisappearingTypedItem(
            item,
            direction,
          );
          if (typedEndpoint) {
            disappearingEndpoint = typedEndpoint;
          } else {
            // Find the farthest typed item far away from disappearing endpoint.
            disappearingEndpoint = this._findFarthestDisappearingTypedItem(
              disappearingEndpoint,
              direction,
            )!;
          }
        }

        // Case 1: append  ...
        // Case 2: replace ...
        // Case 3: replace ... append  ...
        if (!disappearingEndpoint || disappearingEndpoint.isViewable()) {
          this._appendItemInfo(item);
          if (renderItemInfos.length > 1) {
            bothEnds[newItemInfoEndpointLocation] = item;
          } else {
            this._setBothEnds(item, item);
          }
        } else {
          this._replaceItemInfo(disappearingEndpoint, item);
          const nextDisappearingEndpointDataIdx =
            disappearingEndpoint.index + nextIdxStep;
          const nextDisappearingEndpointIdx = itemIdxToItemInfoIdxMap.get(
            nextDisappearingEndpointDataIdx,
          );
          if (nextDisappearingEndpointIdx === undefined) {
            if (disappearingEndpoint !== anotherEndpoint) {
              if (disappearingEndpoint !== originalDisappearingEndpoint) {
                // The replaced item is stale.Revert!
                disappearingEndpoint = originalDisappearingEndpoint;
              }
            } else {
              // Currently ,no more items can be replaced.
              // Next render item will be appended.
              disappearingEndpoint = null;
            }
            bothEnds[newItemInfoEndpointLocation] = item;
          } else {
            if (
              // Ensure in bothEnds
              nextDisappearingEndpointDataIdx * direction >
                originalDisappearingEndpoint!.index * direction &&
              nextDisappearingEndpointDataIdx * direction <
                item.index * direction
            ) {
              disappearingEndpoint =
                renderItemInfos[nextDisappearingEndpointIdx];
            } else {
              disappearingEndpoint = originalDisappearingEndpoint;
            }
            if (isForward) {
              this._setBothEnds(disappearingEndpoint, item);
            } else {
              this._setBothEnds(item, disappearingEndpoint);
            }
          }
        }
      }

      const isContinuousIdx =
        anotherEndpoint &&
        nextRenderItemInfos[0].index === anotherEndpoint.index + nextIdxStep;
      if (!isContinuousIdx) {
        // If the next item is not continuous,
        // it means that there were quickly scrolling,
        // so we need to reset tail endpoint.
        // Free the other items.In the subsequent, they will be handled.
        if (isForward) {
          bothEnds[disappearingEndpointLocation] = nextRenderItemInfos[0];
        } else {
          bothEnds[disappearingEndpointLocation] =
            nextRenderItemInfos[nextRenderItemInfos.length - 1];
        }
      }
    }
  }

  private _findFarthestDisappearingTypedItem(
    item: RenderItemInfo<T>,
    direction: IterationDirection,
  ) {
    const typedIdxs = this._typedIndexesMap.get(item.type);
    if (typedIdxs) {
      const isForward = direction === IterationDirection.FORWARD;
      const firstIdx = typedIdxs[0];
      const lastIdx = typedIdxs[typedIdxs.length - 1];
      let disappearingItemIdx = isForward ? firstIdx : lastIdx;
      if (disappearingItemIdx !== undefined) {
        if (item.index * direction < disappearingItemIdx * direction) {
          // It means disappearing item in ahead of the item.
          // Select the farthest index.
          disappearingItemIdx = isForward ? lastIdx : firstIdx;
        }
        const idx = this._itemIdxToItemInfoIdxMap.get(disappearingItemIdx)!;
        const disappearingItem = this._renderItemInfos[idx];
        if (
          !disappearingItem.isViewable() &&
          isOutRange(
            disappearingItem.position,
            disappearingItem.scrollableDirDim,
            getAheadRange(
              direction,
              this._scrollOffset,
              this._scrollerDim,
              this._renderAheadOffset,
            ),
          )
        ) {
          return disappearingItem;
        }
      }
    }
    return null;
  }

  private _findAppearingItems(data: T[], direction: IterationDirection) {
    const {
      _itemDim: itemDim,
      _getItemType: getItemType,
      _numLines: numLines,
      _line: line,
    } = this;
    const isForward = direction === IterationDirection.FORWARD;
    const [start, end] = this._bothEnds;
    const endpoint = isForward ? end : start;
    const scrollOffset = this._scrollOffset;

    const renderWinRange = getRenderRange(
      scrollOffset,
      this._scrollerDim,
      this._renderAheadOffset,
    );

    const outBoundary = isForward ? RangeBoundary.AFTER : RangeBoundary.BEFORE;

    const searchResult: RenderItemInfo<T>[] = [];
    let preItemInfo: RenderItemInfo<T> | null = isForward ? end : start;
    let preScrollableDirDim: number = preItemInfo
      ? getItemDim(itemDim, preItemInfo.data, preItemInfo.index)
      : 0;
    const searchIndex = endpoint ? endpoint.index : line - numLines;
    const searchStep = direction * numLines;
    const searchRange = isForward
      ? [searchIndex + searchStep, data.length]
      : [searchIndex + searchStep, -1];
    let i = searchRange[0];
    const searchRangeEnd = searchRange[1];
    const conditionLeft = isForward ? () => i : () => searchRangeEnd;
    const conditionRight = isForward ? () => searchRangeEnd : () => i;
    for (; conditionLeft() < conditionRight(); i += searchStep) {
      const item = data[i];
      const scrollableDirDim = getItemDim(itemDim, item, i);
      const position = isForward
        ? (preItemInfo ? preItemInfo.position : 0) + preScrollableDirDim
        : (preItemInfo ? preItemInfo.position : 0) - scrollableDirDim;
      const itemInfo: RenderItemInfo<T> = {
        data: item,
        index: i,
        position,
        scrollableDirDim,
        line,
        type: getItemType(item, i),
        isOutRenderWin: () =>
          isOutRenderWin(
            itemInfo.position,
            itemInfo.scrollableDirDim,
            this._scrollOffset,
            this._scrollerDim,
            this._renderAheadOffset,
          ),
        isViewable: () =>
          isViewable(
            itemInfo.position,
            itemInfo.scrollableDirDim,
            this._scrollOffset,
            this._scrollerDim,
          ),
      };

      const isOutBoundary = isOutRangeAt(
        outBoundary,
        position,
        scrollableDirDim,
        renderWinRange,
      );
      if (
        !isInRange(position, scrollableDirDim, renderWinRange) &&
        !isOutBoundary
      ) {
        // When quickly scrolling, render items may be out of render window,
        // because the calculation of render items start from the last endpoint.
        // So, the items may be out of render window,but need to calculate.
        // Skip middle items!
        preItemInfo = itemInfo;
        preScrollableDirDim = scrollableDirDim;
        continue;
      }

      if (isOutBoundary) {
        // If the item is out of render window completely
        // (i.e. out of the far boundary of render window in the iteration direction).
        // Skip else!
        break;
      }

      searchResult.push(itemInfo);

      preItemInfo = itemInfo;
      preScrollableDirDim = scrollableDirDim;
    }
    return searchResult;
  }
}

export default LineVisibilityManager;

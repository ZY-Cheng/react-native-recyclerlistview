declare abstract class LineVisibilityManagerPublicAPI<
  T,
> extends VisibilityManagerPublicAPI<T, RenderItemInfo<T>[]> {}

declare abstract class MultiLineVisibilityManagerPublicAPI<
  T,
> extends VisibilityManagerPublicAPI<T, RenderItemInfo<T>[][]> {
  abstract getLine(which: number): LineVisibilityManagerPublicAPI<T>;
}

declare abstract class VisibilityManagerPublicAPI<T, R> {
  abstract resize(data: T[], dimension: number, scrollOffset: number): R;
  abstract render(data: T[]): R;
  abstract update(data: T[], scrollOffset: number): R;
  abstract forceUpdate(data: T[], scrollOffset: number): R;
}

type GetItemDimension<T> = (data: T, index: number) => number;
type MixItemDimension<T> =
  | GetItemDimension<T>
  | ReturnType<GetItemDimension<T>>;

type RenderType = number | string;
type RenderItemInfo<T> = {
  /**
   * The data of the item in the data source.
   */
  data: T;
  /**
   * Index of the item in the data source.
   */
  index: number;
  /**
   * The render type of the item.
   */
  type: RenderType;
  /**
   * The offset of the item relative to the scroll content view.
   */
  position: number;
  /**
   * The dimension of the item on scrollable direction.
   */
  scrollableDim: number;
  /**
   * Whether the item is viewable now.
   */
  isViewable(): boolean;
  /**
   * Whether the item is out of render window.
   *
   * Usage: When replacing typed item outside viewable window,
   * there may be the situation that someone item is a endpoint of render window,
   * and the item type doesn't match, so the item will become stale one that outside render window.
   * So that we should priority to replace it in the subsequent.
   */
  isOutRenderWin(): boolean;
};
type GetRenderType<T> = (data: T, index: number) => RenderType;

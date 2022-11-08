import LineVisibilityManager from './LineManager';

class WaterfallVisibilityManager<T>
  implements MultiLineVisibilityManagerPublicAPI<T>
{
  private _lineManagers: LineVisibilityManager<T>[];

  constructor(renderAheadOffset: number, numColumns: number) {
    this._lineManagers = new Array(numColumns)
      .fill(0)
      .map(
        (_, index) =>
          new LineVisibilityManager(renderAheadOffset, index, numColumns),
      );
  }

  public resize(
    data: T[],
    dimension: number,
    scrollOffset: number,
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ) {
    return this._lineManagers.map(manager =>
      manager.resize(data, dimension, scrollOffset, itemDimension, getItemType),
    );
  }
  public render(
    data: T[],
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ) {
    return this._lineManagers.map(manager =>
      manager.render(data, itemDimension, getItemType),
    );
  }
  public update(
    data: T[],
    scrollOffset: number,
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ) {
    return this._lineManagers.map(manager =>
      manager.update(data, scrollOffset, itemDimension, getItemType),
    );
  }
  public forceUpdate(
    data: T[],
    scrollOffset: number,
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ) {
    return this._lineManagers.map(manager =>
      manager.forceUpdate(data, scrollOffset, itemDimension, getItemType),
    );
  }

  getLine(which: number) {
    return this._lineManagers[which];
  }
}

export default WaterfallVisibilityManager;

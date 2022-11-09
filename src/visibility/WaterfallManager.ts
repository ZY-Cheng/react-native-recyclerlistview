import LineVisibilityManager from './LineManager';

class WaterfallVisibilityManager<T>
  implements MultiLineVisibilityManagerPublicAPI<T>
{
  private _lineManagers: LineVisibilityManager<T>[];

  constructor(
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
    renderAheadOffset: number,
    numColumns: number,
  ) {
    this._lineManagers = new Array(numColumns)
      .fill(0)
      .map(
        (_, index) =>
          new LineVisibilityManager(
            itemDimension,
            getItemType,
            renderAheadOffset,
            numColumns,
            index,
          ),
      );
  }

  resize(data: T[], dimension: number, scrollOffset: number) {
    return this._lineManagers.map(manager =>
      manager.resize(data, dimension, scrollOffset),
    );
  }
  render(data: T[]) {
    return this._lineManagers.map(manager => manager.render(data));
  }
  update(data: T[], scrollOffset: number) {
    return this._lineManagers.map(manager =>
      manager.update(data, scrollOffset),
    );
  }
  forceUpdate(data: T[], scrollOffset: number) {
    return this._lineManagers.map(manager =>
      manager.forceUpdate(data, scrollOffset),
    );
  }

  getLine(which: number) {
    return this._lineManagers[which];
  }
}

export default WaterfallVisibilityManager;
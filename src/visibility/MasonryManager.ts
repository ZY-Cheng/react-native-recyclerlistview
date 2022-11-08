class MasonryVisibilityManager<T>
  implements MultiLineVisibilityManagerPublicAPI<T>
{
  public resize(
    data: T[],
    dimension: number,
    scrollOffset: number,
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ): RenderItemInfo<T>[][] {
    throw new Error('Method not implemented.');
  }
  public render(
    data: T[],
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ): RenderItemInfo<T>[][] {
    throw new Error('Method not implemented.');
  }
  public update(
    data: T[],
    scrollOffset: number,
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ): RenderItemInfo<T>[][] {
    throw new Error('Method not implemented.');
  }
  public forceUpdate(
    data: T[],
    scrollOffset: number,
    itemDimension: MixItemDimension<T>,
    getItemType: GetRenderType<T>,
  ): RenderItemInfo<T>[][] {
    throw new Error('Method not implemented.');
  }
}

export default MasonryVisibilityManager;

class MasonryVisibilityManager<T>
  implements MultiLineVisibilityManagerPublicAPI<T>
{
  resize(data: T[], dimension: number, scrollOffset: number) {
    throw new Error('Method not implemented.');
  }
  render(data: T[]) {
    throw new Error('Method not implemented.');
  }
  update(data: T[], scrollOffset: number) {
    throw new Error('Method not implemented.');
  }
  forceUpdate(data: T[], scrollOffset: number) {
    throw new Error('Method not implemented.');
  }
  getLine(which: number) {
    throw new Error('Method not implemented.');
  }
}

export default MasonryVisibilityManager;

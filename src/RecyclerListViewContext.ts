import {createContext} from 'react';

export type ContextValue<T = any> = {
  triggerRenderTimestamp: number;
  getVisibilityManager(): MultiLineVisibilityManagerPublicAPI<T>;
  getScrollContentDim(): {width: number; height: number};
  isHorizontal(): boolean | null | undefined;
};
// @ts-ignore
const RecyclerListViewContext = createContext<ContextValue>(null);

export default RecyclerListViewContext;

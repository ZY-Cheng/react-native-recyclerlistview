import {createContext} from 'react';
import VisibilityManager from './VisibilityManager';

export type ContextValue<T = any> = {
  triggerRenderTimestamp: number;
  visibilityManager: VisibilityManager<T>;
  getScrollContentDimension(): {width: number; height: number};
  isHorizontal(): boolean | null | undefined;
};
// @ts-ignore
const RecyclerListViewContext = createContext<ContextValue>(null);

export default RecyclerListViewContext;

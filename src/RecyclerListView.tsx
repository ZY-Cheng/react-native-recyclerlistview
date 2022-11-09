import {Component, createRef, GetDerivedStateFromProps, RefObject} from 'react';
import {
  LayoutChangeEvent,
  LayoutRectangle,
  NativeScrollEvent,
  NativeScrollPoint,
  NativeScrollSize,
  NativeSyntheticEvent,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import DebugComponent from './debug/DebugComponent';
import {
  getItemDimension,
  getScrollDirection,
  ScrollDirection,
} from './visibility/helper';
import RecyclerItem from './RecyclerItem';
import RecyclerListViewContext, {ContextValue} from './RecyclerListViewContext';
import WaterfallVisibilityManager from './visibility/WaterfallManager';

type ViewToken<T> = {
  item: T;
  key: string;
  index: number | null;
  isViewable: boolean;
};

type RecyclerListViewProps<T = any> = ScrollViewProps & {
  data: T[];
  renderItem(info: {data: T; index: number; type?: RenderType}): JSX.Element;
  itemDimension: MixItemDimension<T>;
  getItemType?: GetRenderType<T>;
  /**
   * @default 300
   * @description The distance of rendering in ahead.
   */
  renderAheadOffset?: number;
  /**
   * How far from the end (in units of viewable window dimension)
   * the bottom edge of the list must be from the end of the content
   * to trigger the `onEndReached` callback.
   * Thus a value of 0.5 will trigger `onEndReached`
   * when the end of the content is within half viewable window.
   */
  onEndReachedThreshold?: number;
  /**
   * A function that is called when the user scrolls to the end of the list.
   * @param resolve after calling, the component can will continue to trigger `onEndReached`.
   * `isWaitForUpdate` means whether waiting for the component's `componentDidUpdate` or not.
   */
  onEndReached?: (resolve: (isWaitForUpdate?: boolean) => void) => void;
  /**
   * @default 1
   * @description The number of column.
   */
  numColumns?: number;
  onViewableItemsChanged?: (info: {
    viewableItems: ViewToken<T>[];
    changed: ViewToken<T>[];
  }) => void;
  /**
   * Enable debug mode to see the render window and viewable window.
   * The numeric value indicates which column to display.
   */
  debug?: number | boolean;
  // style
  scrollContainerStyle?: StyleProp<ViewStyle>;
  /**
   * The property `height` or `width` is not supported, because it will be calculated automatically
   */
  scrollContentStyle?: StyleProp<Omit<ViewStyle, 'height' | 'width'>>;
  /**
   * Optional custom style for multi-item rows generated when `numColumns > 1`.
   */
  columnWrapperStyle?: StyleProp<ViewStyle>;
};

type RecyclerListViewState<T = any> = {
  data: T[];
  scrollContentDimension: NativeScrollSize;
  multiRenderItemInfos: RenderItemInfo<T>[][];
};

abstract class RecyclerListViewPublicImpl<T> {
  abstract scrollRef: null | RefObject<ScrollView>;
  abstract scrollToIndex(info: {index: number; animated: boolean}): void;
  abstract scrollToItem(info: {item: T; animated: boolean}): void;
}

const defaultProps: Partial<RecyclerListViewProps> = {
  renderAheadOffset: 300,
  getItemType: () => 0,
  onEndReachedThreshold: 0,
  numColumns: 1,
};

class RecyclerListView<T>
  extends Component<RecyclerListViewProps<T>, RecyclerListViewState<T>>
  implements RecyclerListViewPublicImpl<T>
{
  static defaultProps = defaultProps;

  static getDerivedStateFromProps: GetDerivedStateFromProps<
    RecyclerListViewProps,
    RecyclerListViewState
  > = (nextProps, prevState) => {
    const {data, itemDimension, horizontal} = nextProps;

    const scrollableDimensionName = horizontal ? 'width' : 'height';
    const crossDimensionName = horizontal ? 'height' : 'width';
    let scrollContentDimension = {
      [scrollableDimensionName]:
        prevState.scrollContentDimension[scrollableDimensionName],
      [crossDimensionName]:
        prevState.scrollContentDimension[crossDimensionName],
    } as unknown as NativeScrollSize;
    const {numColumns} = nextProps;
    if (
      nextProps.data.length !== prevState.data.length ||
      numColumns !== prevState.multiRenderItemInfos.length
    ) {
      const scrollContentScrollableSize = Math.max(
        ...data.reduce((acc, item, index) => {
          acc[index % numColumns!] += getItemDimension(
            itemDimension,
            item,
            index,
          );
          return acc;
        }, new Array(numColumns).fill(0)),
      );
      scrollContentDimension[scrollableDimensionName] =
        scrollContentScrollableSize;
    }

    return {
      data,
      scrollContentDimension,
    };
  };

  state: RecyclerListViewState<T> = {
    data: [],
    scrollContentDimension: {width: 0, height: 0},
    multiRenderItemInfos: [[]],
  };
  scrollRef = createRef<ScrollView>();

  private _hostUpdate = {
    id: -1,
    trigger: () => {
      return this._visibilityManager.update(
        this.state.data,
        this._getScrollOffset(),
      );
    },
  };
  private _scrollContainerLayout: LayoutRectangle = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  private _visibilityManager: MultiLineVisibilityManagerPublicAPI<T>;
  private _scrollOffset: NativeScrollPoint = {x: 0, y: 0};
  private _context: ContextValue<T> = {
    isHorizontal: () => this.props.horizontal,
    triggerRenderTimestamp: 0,
    getVisibilityManager: () => this._visibilityManager,
    getScrollContentDimension: () => this.state.scrollContentDimension,
  };
  private _isOnEndReachedTriggered:
    | boolean
    | Parameters<ConstructorParameters<PromiseConstructor>[0]>[0] = false;

  constructor(props: RecyclerListViewProps<T>) {
    super(props);
    this._initVisibleManagers();
  }

  scrollToItem(info: {item: T; animated?: boolean}) {
    const {item, animated} = info;
    const index = this.state.data.findIndex(d => d === item);
    if (index === -1) {
      return;
    }
    this.scrollToIndex({index, animated});
  }

  scrollToIndex(info: {index: number; animated?: boolean}) {
    const {index, animated} = info;

    const {current: scrollRef} = this.scrollRef;
    if (scrollRef) {
      scrollRef.scrollTo({
        x: 0,
        y: this.state.data.slice(0, index).reduce((acc, item, i) => {
          return acc + getItemDimension(this.props.itemDimension, item, i);
        }, 0),
        animated,
      });
    }
  }

  componentDidMount() {}

  componentDidUpdate() {
    if (typeof this._isOnEndReachedTriggered === 'function') {
      this._isOnEndReachedTriggered(false);
    }

    if (this.props.numColumns !== this.state.multiRenderItemInfos.length) {
      this._initVisibleManagers();
      this.setState({
        multiRenderItemInfos: this._visibilityManager.forceUpdate(
          this.state.data,
          this._getScrollOffset(),
        ),
      });
    }
  }

  render() {
    const {scrollContentStyle, debug, horizontal, numColumns} = this.props;
    const isMultiCol = numColumns > 1;
    const scrollViewProps: ScrollViewProps = {
      ...this.props,
      contentContainerStyle: [horizontal ? styles.row : styles.column],
      removeClippedSubviews: false,
      onScroll: this._handleScroll,
      // onScrollEndDrag: this._handleScrollEndDrag,
      // onScrollBeginDrag: this._handleScrollBeginDrag,
      // onMomentumScrollBegin: this._handleMomentumScrollBegin,
      // onMomentumScrollEnd: this._handleMomentumScrollEnd,
      scrollEventThrottle: 0.001,
    };
    const scrollableDimensionName = horizontal ? 'width' : 'height';

    return (
      <RecyclerListViewContext.Provider value={this._context}>
        <View
          style={[
            styles.scrollContainer,
            horizontal ? styles.row : styles.column,
          ]}>
          <ScrollView
            onLayout={this._handleLayout}
            ref={this.scrollRef}
            {...scrollViewProps}>
            <View
              style={StyleSheet.compose<ViewStyle>(
                [
                  styles.scrollContent,
                  (!horizontal && isMultiCol) || (horizontal && !isMultiCol)
                    ? styles.row
                    : styles.column,
                  {
                    [scrollableDimensionName]:
                      this.state.scrollContentDimension[
                        scrollableDimensionName
                      ],
                  },
                ],
                scrollContentStyle,
              )}>
              {isMultiCol
                ? this._renderColumnsContainer()
                : this._renderItems(this.state.multiRenderItemInfos[0])}
            </View>
          </ScrollView>

          {debug ? <DebugComponent debug={debug} /> : null}
        </View>
      </RecyclerListViewContext.Provider>
    );
  }

  private _handleScrollEndDrag = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {};
  private _handleScrollBeginDrag = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {};
  private _handleMomentumScrollBegin = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {};
  private _handleMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {};
  private _handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {onScroll} = this.props;
    const {contentOffset} = e.nativeEvent;

    this._maybeCallOnEndReached(this._scrollOffset);

    this._scrollOffset = contentOffset;

    // Use `requestAnimationFrame()` for reduce bridge messages.
    // By observing bridge message, reduce about 16% of bridge messages
    // (i.e. using ten thousand Data,`UIManager.updateView()` call times when scrolling from top to bottom).
    // And CPU usage more lower, but rendering efficiency more lower
    // (i.e. quickly scrolling has more blank area).
    //
    // Use other timer to wrap `setState()` or wrap `updateRenderItems()` `setState()`,
    // CPU usage more higher, but rendering efficiency more higher.
    cancelAnimationFrame(this._hostUpdate.id);
    this._hostUpdate.id = requestAnimationFrame(() => {
      this.setState({
        multiRenderItemInfos: this._hostUpdate.trigger(),
      });
    });

    onScroll?.(e);
  };

  private _handleLayout = (e: LayoutChangeEvent) => {
    const {onLayout} = this.props;
    const scrollContainerLayout = e.nativeEvent.layout;
    this._context.triggerRenderTimestamp = Date.now();
    const curScrollableDimension = this._getScrollContainerDimension(
      scrollContainerLayout,
    );
    if (this._getScrollContainerDimension() !== curScrollableDimension) {
      this.setState({
        multiRenderItemInfos: this._visibilityManager.resize(
          this.state.data,
          curScrollableDimension,
          this._getScrollOffset(),
        ),
      });
    }
    this._scrollContainerLayout = scrollContainerLayout;

    onLayout?.(e);
  };

  private _maybeCallOnEndReached(preScrollOffset: NativeScrollPoint) {
    const {onEndReachedThreshold, onEndReached} = this.props;
    const scrollContentDimension = this._getScrollContentDimension();
    if (
      !onEndReached ||
      this._isOnEndReachedTriggered ||
      scrollContentDimension === 0 ||
      this.state.data.length === 0
    ) {
      return;
    }

    const curScrollOffset = this._getScrollOffset();
    const scrollContainerDimension = this._getScrollContainerDimension();
    const distanceFromEnd =
      scrollContentDimension - curScrollOffset - scrollContainerDimension;
    const throttle = scrollContainerDimension * onEndReachedThreshold!;
    if (
      distanceFromEnd <= throttle &&
      getScrollDirection(
        this._getScrollOffset(preScrollOffset),
        curScrollOffset,
      ) === ScrollDirection.FORWARD
    ) {
      this._isOnEndReachedTriggered = true;
      try {
        onEndReached(isWaitForUpdate => {
          if (isWaitForUpdate) {
            new Promise(resolve => {
              this._isOnEndReachedTriggered = resolve;
            }).then(val => (this._isOnEndReachedTriggered = val as boolean));
          } else {
            this._isOnEndReachedTriggered = false;
          }
        });
      } finally {
      }
    }
  }

  private _getScrollContentDimension(
    scrollContentDimension?: NativeScrollSize,
  ) {
    return (scrollContentDimension || this.state.scrollContentDimension)[
      this.props.horizontal ? 'width' : 'height'
    ];
  }

  private _getScrollContainerDimension(scrollContainerDimension?: {
    width: number;
    height: number;
  }) {
    return (scrollContainerDimension || this._scrollContainerLayout)[
      this.props.horizontal ? 'width' : 'height'
    ];
  }

  private _getScrollOffset(scrollOffset?: NativeScrollPoint) {
    return (scrollOffset || this._scrollOffset)[
      this.props.horizontal ? 'x' : 'y'
    ];
  }

  private _renderColumnsContainer() {
    const {multiRenderItemInfos} = this.state;
    return multiRenderItemInfos.map((infos, index) => {
      return (
        <View
          key={index}
          style={StyleSheet.compose<ViewStyle>(
            [styles.flex1, this.props.horizontal ? styles.row : styles.column],
            this.props.columnWrapperStyle,
          )}>
          {this._renderItems(infos)}
        </View>
      );
    });
  }

  private _renderItems = (renderItemInfos: RenderItemInfo<T>[]) => {
    const {renderItem, horizontal} = this.props;

    const views = renderItemInfos.map((info, index) => {
      return (
        <RecyclerItem
          horizontal={horizontal}
          key={index}
          index={index}
          info={info}>
          {renderItem({data: info.data, index: info.index, type: info.type})}
        </RecyclerItem>
      );
    });

    return views;
  };

  private _initVisibleManagers() {
    const {renderAheadOffset, numColumns, itemDimension, getItemType} =
      this.props;

    this._visibilityManager = new WaterfallVisibilityManager<T>(
      itemDimension,
      getItemType,
      renderAheadOffset,
      numColumns,
    );
  }
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row'},
  column: {flexDirection: 'column'},
  flex1: {flex: 1},
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {},
  itemContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
});

export default RecyclerListView;

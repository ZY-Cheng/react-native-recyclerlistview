import {ContextType, memo, PropsWithChildren, PureComponent} from 'react';
import {Animated, LayoutChangeEvent, StyleSheet} from 'react-native';
import RecyclerListViewContext from './RecyclerListViewContext';

type RecyclerItemProps<T> = PropsWithChildren & {
  index: number;
  info: RenderItemInfo<T>;
};

type RecyclerItemState = {};
class RecyclerItem<T> extends PureComponent<
  RecyclerItemProps<T>,
  RecyclerItemState
> {
  declare context: ContextType<typeof RecyclerListViewContext>;
  static contextType = RecyclerListViewContext;

  handleLayout = (e: LayoutChangeEvent) => {};

  render() {
    const {children, info} = this.props;
    const {line, position, index} = info;
    const {isHorizontal, getScrollContainerDim, getNumLines} = this.context;
    const horizontal = isHorizontal();

    const scrollablePosName = `translate${horizontal ? 'X' : 'Y'}`;
    const crossPosName = `translate${horizontal ? 'Y' : 'X'}`;

    return (
      <Animated.View
        onLayout={this.handleLayout}
        style={[
          styles.itemContainer,
          horizontal ? styles.horizontal : styles.vertical,
          // @ts-ignore
          {
            transform:
              line > 1 && false
                ? [
                    {[scrollablePosName]: position},
                    {
                      [crossPosName]:
                        (getScrollContainerDim()[
                          horizontal ? 'height' : 'width'
                        ] *
                          (line - 1)) /
                        getNumLines(),
                    },
                  ]
                : [{[scrollablePosName]: position}],
            zIndex: index,
          },
        ]}>
        {children}
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  horizontal: {
    bottom: 0,
    flexDirection: 'row',
  },
  vertical: {
    right: 0,
    flexDirection: 'column',
  },
  itemContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default memo(RecyclerItem, (prevProps, nextProps) => {
  return prevProps.info.data === nextProps.info.data;
});

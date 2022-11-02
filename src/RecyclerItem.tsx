import {ContextType, memo, PropsWithChildren, PureComponent} from 'react';
import {Animated, LayoutChangeEvent, StyleSheet} from 'react-native';
import RecyclerListViewContext from './RecyclerListViewContext';
import {RenderItemInfo} from './VisibilityManager';

type RecyclerItemProps<T> = PropsWithChildren & {
  index: number;
  info: RenderItemInfo<T>;
  horizontal: boolean | null | undefined;
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
    const {children, info, horizontal} = this.props;

    const translateName = `translate${horizontal ? 'X' : 'Y'}`;
    return (
      <Animated.View
        onLayout={this.handleLayout}
        style={[
          styles.itemContainer,
          horizontal ? styles.horizontal : styles.vertical,
          // @ts-ignore
          {
            transform: [{[translateName]: info.position}],
            zIndex: info.index,
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

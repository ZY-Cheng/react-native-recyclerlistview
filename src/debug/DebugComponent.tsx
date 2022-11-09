import {ContextType, memo, PureComponent} from 'react';
import {
  Animated,
  LayoutChangeEvent,
  LayoutRectangle,
  StyleSheet,
  View,
} from 'react-native';
import RecyclerListViewContext from '../RecyclerListViewContext';
import LineVisibilityManager from '../visibility/LineManager';

type Props = {
  debug: number | true;
};

type State = {
  renderWinOffset: Animated.Value;
  renderWinDim: Animated.Value;
  viewableWinOffset: Animated.Value;
  viewableWinDim: Animated.Value;
  innerBlocks: number[];
};

let Component = () => null;
if (__DEV__) {
  const borderWidth = 2;

  class DebugComponent extends PureComponent<Props, State> {
    declare context: ContextType<typeof RecyclerListViewContext>;
    static contextType = RecyclerListViewContext;

    state = {
      renderWinOffset: new Animated.Value(0),
      renderWinDim: new Animated.Value(0),
      viewableWinOffset: new Animated.Value(0),
      viewableWinDim: new Animated.Value(0),
      innerBlocks: [],
    };

    layout: LayoutRectangle = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
    loopId: number = -1;
    isUpdateLocked = false;

    loopRender = () => {
      const {debug} = this.props;
      const which = debug === true ? 1 : debug;
      const {getVisibilityManager, getScrollContentDim, isHorizontal} =
        this.context;
      const visibilityManager = getVisibilityManager().getLine(
        which - 1,
      ) as LineVisibilityManager<any>;
      const scrollableDirDimName = isHorizontal() ? 'width' : 'height';
      const ratio =
        this.layout[scrollableDirDimName] /
        getScrollContentDim()[scrollableDirDimName];
      const [start, end] = visibilityManager.getBothEnds();
      const renderWinDim =
        ((end?.position ?? 0) +
          (end?.scrollableDirDim ?? 0) -
          (start?.position ?? 0) -
          borderWidth * 2) *
        ratio;
      const renderWinOffset = (start?.position ?? 0) * ratio;
      const viewableWinOffset = visibilityManager.getScrollOffset() * ratio;
      const viewableWinDim =
        (visibilityManager.getScrollerDim() - borderWidth * 2) * ratio;

      if (
        !Number.isNaN(renderWinOffset) &&
        !Number.isNaN(viewableWinOffset) &&
        renderWinDim !== 0 &&
        viewableWinDim !== 0 &&
        // @ts-ignore
        (this.state.renderWinOffset.__getValue() !== renderWinOffset ||
          // @ts-ignore
          this.state.renderWinDim.__getValue() !== renderWinDim ||
          // @ts-ignore
          this.state.viewableWinOffset.__getValue() !== viewableWinOffset ||
          // @ts-ignore
          this.state.viewableWinDim.__getValue() !== viewableWinDim)
      ) {
        this.setState({
          innerBlocks: visibilityManager
            .getRenderItemInfos()
            .map(block => block.position * ratio),
        });

        Animated.parallel([
          Animated.timing(this.state.renderWinOffset, {
            toValue: renderWinOffset,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(this.state.renderWinDim, {
            toValue: renderWinDim,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(this.state.viewableWinOffset, {
            toValue: viewableWinOffset,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(this.state.viewableWinDim, {
            toValue: viewableWinDim,
            duration: 0,
            useNativeDriver: false,
          }),
        ]).start();
      }
      this.loopId = requestAnimationFrame(this.loopRender);
    };

    handleLayout = (e: LayoutChangeEvent) => {
      this.layout = e.nativeEvent.layout;
    };

    componentDidMount(): void {
      this.loopRender();
    }
    componentWillUnmount() {
      cancelAnimationFrame(this.loopId);
    }

    render() {
      const {isHorizontal} = this.context;
      const scrollableDirDimName = isHorizontal() ? 'width' : 'height';
      const translateName = `translate${isHorizontal() ? 'X' : 'Y'}`;
      return (
        <View
          style={[
            styles.container,
            isHorizontal()
              ? styles.containerHorizontal
              : styles.containerVertical,
          ]}
          onLayout={this.handleLayout}>
          <View style={isHorizontal() ? styles.row : styles.column}>
            {this.state.innerBlocks.map((pos, index) => (
              <View
                key={index}
                style={[
                  styles.block,
                  isHorizontal()
                    ? styles.blockHorizontal
                    : styles.blockVertical,
                  // @ts-ignore
                  {
                    transform: [{[translateName]: pos}],
                  },
                ]}
              />
            ))}
            <Animated.View
              style={[
                styles.renderWindow,
                isHorizontal()
                  ? styles.renderWinHorizontal
                  : styles.renderWinVertical,
                // @ts-ignore
                {
                  [scrollableDirDimName]: this.state.renderWinDim,
                  transform: [{[translateName]: this.state.renderWinOffset}],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.viewableWindow,
                isHorizontal()
                  ? styles.viewableWinHorizontal
                  : styles.viewableWinVertical,
                // @ts-ignore
                {
                  [scrollableDirDimName]: this.state.viewableWinDim,
                  transform: [{[translateName]: this.state.viewableWinOffset}],
                },
              ]}
            />
          </View>
        </View>
      );
    }
  }

  const styles = StyleSheet.create({
    row: {flexDirection: 'row'},
    column: {flexDirection: 'column'},
    container: {
      position: 'absolute',
      borderWidth: borderWidth,
      borderColor: 'red',
    },
    containerVertical: {
      top: 0,
      right: 8,
      bottom: 0,
      width: 15,
    },
    containerHorizontal: {
      left: 0,
      right: 0,
      bottom: 8,
      height: 15,
      flexDirection: 'row',
    },
    renderWindow: {
      position: 'absolute',
      borderWidth: borderWidth,
      borderColor: 'orange',
    },
    renderWinVertical: {
      width: '100%',
      left: 0,
      top: -borderWidth,
    },
    renderWinHorizontal: {
      height: '100%',
      top: 0,
      left: -borderWidth,
    },
    viewableWindow: {
      position: 'absolute',

      borderWidth: borderWidth,
      borderColor: 'green',
    },
    viewableWinVertical: {
      left: 0,
      top: -borderWidth,
      width: '100%',
    },
    viewableWinHorizontal: {
      left: -borderWidth,
      top: 0,
      height: '100%',
    },
    block: {
      position: 'absolute',
      left: 0,
      top: 0,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'red',
    },
    blockVertical: {
      width: '100%',
    },
    blockHorizontal: {
      height: '100%',
    },
  });

  // @ts-ignore
  Component = DebugComponent;
}

export default memo(
  Component,
  (preProps, nextProps) => preProps.debug === nextProps.debug,
);

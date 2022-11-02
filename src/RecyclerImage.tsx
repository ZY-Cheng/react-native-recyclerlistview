import {PureComponent} from 'react';
import {
  Image,
  ImageProps,
  ImageRequireSource,
  ImageSourcePropType,
  ImageURISource,
} from 'react-native';

type Props = Omit<ImageProps, 'source' | 'defaultSource'> & {
  defaultSource: ImageURISource | number;
  source: Exclude<ImageSourcePropType, ImageRequireSource>;
  /**
   * @default 3
   * @description The number of times to retry loading the image.
   */
  retry?: number;
};

type State = {
  preSource?: ImageSourcePropType;
  isSourceChanged: boolean;
  source: Omit<ImageSourcePropType, ImageRequireSource>;
};

function promiseAny(promises: Promise<any>[]) {
  return new Promise((resolve, reject) => {
    const errors: Error[] = [];
    for (const promise of promises) {
      promise.then(resolve).catch((error: Error) => {
        errors.push(error);
        if (errors.length === promises.length) {
          reject(errors);
        }
      });
    }
  });
}

/**
 * `RecyclerImage` is a wrapper around `Image`.
 * To solve the problem that the image shows last source when recycling item.
 * And support retry to load when image load failed by `retry` props.
 */
class RecyclerImage extends PureComponent<Props, State> {
  static defaultProps: Partial<Props> = {
    retry: 3,
  };
  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const {source, defaultSource} = nextProps;
    const {preSource} = prevState;
    if (source && source !== preSource) {
      return {source: defaultSource, preSource: source, isSourceChanged: true};
    }
    return {preSource: source, isSourceChanged: false};
  }

  state = {
    preSource: undefined,
    isSourceChanged: false,
    source: this.props.defaultSource,
  };

  checkFetch() {
    let {source, retry} = this.props;
    if (!source) {
      return;
    }
    if (!Array.isArray(source)) {
      source = [source];
    }
    let retryCount = 0;
    const prefetch = () =>
      promiseAny((source as ImageURISource[]).map(s => Image.prefetch(s.uri!)))
        .then(() => {
          this.setState({source, isSourceChanged: false});
        })
        .catch(() => {
          if (retryCount === retry) {
            return;
          }
          retryCount++;
          prefetch();
        });
    prefetch();
  }

  componentDidMount() {
    this.checkFetch();
  }

  componentDidUpdate() {
    if (this.state.isSourceChanged) {
      this.checkFetch();
    }
  }
  render() {
    return <Image {...this.props} source={this.state.source} />;
  }
}

export default RecyclerImage;

import {Key, Props, ReactElementType, Ref} from 'shared/ReactTypes';
import {FunctionComponent, HostComponent, WorkTag} from './workTags';
import {Flags, NoFlags} from './fiberFlags';
import {Container} from 'hostConfig';

export class FiberNode {
  type: any;
  tag: WorkTag;
  key: Key;
  stateNode: any;
  return: FiberNode | null;
  sibling: FiberNode | null;
  alternate: FiberNode | null;
  child: FiberNode | null;
  index: number;
  ref: Ref;
  pendingProps: Props | null;
  memoizedProps: Props | null;
  memoizedState: any;
  flags: Flags;
  subtreeFlags: Flags;
  updateQueue: unknown;
  deletions: FiberNode[] | null;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    this.tag = tag;
    this.key = key;
    this.stateNode = null;
    this.type = null;
    this.return = null;
    this.sibling = null;
    this.child = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.alternate = null;
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;

    this.updateQueue = null;
    this.memoizedState = null;
    this.deletions = null;
  }
}

export class FiberRootNode {
  container: Container;
  current: FiberNode;
  finishedWork: FiberNode | null;

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
  }
}

export const createWorkInProgress = (
    current: FiberNode,
    pendingProps: Props
): FiberNode => {
  let wip = current.alternate;
  if (wip === null) {
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.type = current.type;
    wip.stateNode = current.stateNode;

    wip.alternate = current;
    current.alternate = wip;
  } else {
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
    wip.type = current.type;
  }

  wip.updateQueue = current.updateQueue;
  wip.flags = current.flags;
  wip.child = current.child;
  wip.memoizedState = current.memoizedState;
  wip.memoizedProps = current.memoizedProps;

  return wip;
};

export function createFiberFromElement(element: ReactElementType) {
  const {type, key, props} = element;

  let fiberTag: WorkTag = FunctionComponent;
  if (typeof type === 'string') {
    fiberTag = HostComponent;
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('未定义的 类型', element);
  }
  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;
  return fiber;
}

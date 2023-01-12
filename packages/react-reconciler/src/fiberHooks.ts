import {FiberNode} from './fiber';
import internals from 'shared/internals';
import {Dispatcher} from 'react/src/currentDispatcher';
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue
} from './updateQueue';
import {Dispatch} from 'react/src/currentDispatcher';
import {Action} from 'shared/ReactTypes';
import {scheduleUpdateOnFiber} from './workLoop';

const {currentDispatcher} = internals;

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;

interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
}

export function renderWithHooks(wip: FiberNode) {
  currentlyRenderingFiber = wip;
  wip.memoizedState = null;

  const current = wip.alternate;

  if (current !== null) {
    // todo
  } else {
    currentDispatcher.current = HooksDispatcherOnMount;
  }
  const Component = wip.type;
  const props = wip.pendingProps;
  const children = Component(props);

  currentlyRenderingFiber = null;
  return children;
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
};

function mountState<State>(
    initialState: (() => State) | State
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook();
  let memoizedState;
  if (initialState instanceof Function) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }

  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  return [memoizedState, dispatch];
}

function dispatchSetState<State>(
    fiber: FiberNode,
    updateQueue: UpdateQueue<State>,
    action: Action<State>
) {
  const update = createUpdate(action);
  enqueueUpdate(updateQueue, update);
  scheduleUpdateOnFiber(fiber);
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null
  };

  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用 hook');
    } else {
      workInProgressHook = hook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  return workInProgressHook;
}

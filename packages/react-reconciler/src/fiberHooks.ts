import {FiberNode} from './fiber';
import internals from 'shared/internals';
import {Dispatcher} from 'react/src/currentDispatcher';
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  UpdateQueue
} from './updateQueue';
import {Dispatch} from 'react/src/currentDispatcher';
import {Action} from 'shared/ReactTypes';
import {scheduleUpdateOnFiber} from './workLoop';

const {currentDispatcher} = internals;

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

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
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    currentDispatcher.current = HooksDispatcherOnMount;
  }
  const Component = wip.type;
  const props = wip.pendingProps;
  const children = Component(props);

  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  return children;
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
};
const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState
};

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook();

  const queue = hook.updateQueue as UpdateQueue<State>;
  const pending = queue.shared.pending;
  queue.shared.pending = null;
  if (pending !== null) {
    const {memoizedState} = processUpdateQueue(hook.memoizedState, pending);
    hook.memoizedState = memoizedState;
  }
  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

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

function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null = null;
  if (currentHook === null) {
    const current = currentlyRenderingFiber?.alternate;
    if (current !== null) {
      nextCurrentHook = current?.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }
  if (nextCurrentHook === null) {
    throw new Error('组件本次执行的hook 和 上次的数量不一样');
  }

  currentHook = nextCurrentHook;
  const newHook: Hook = {
    memoizedState: currentHook?.memoizedState,
    updateQueue: currentHook?.updateQueue,
    next: null
  };

  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用 hook');
    } else {
      workInProgressHook = newHook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }
  return workInProgressHook;
}

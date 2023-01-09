import {createWorkInProgress, FiberNode, FiberRootNode} from './fiber';
import {beginWork} from './beginWork';
import {completeWork} from './completeWork';
import {HostRoot} from './workTags';
import {MutationMask, NoFlags} from './fiberFlags';
import {commitMutationEffects} from './commitWork';

let workInProgress: FiberNode | null = null;

function prepareFreshStack(root: FiberRootNode) {
  workInProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  const root = markUpdateFromFiberToRoot(fiber);

  renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }

  if (node.tag === HostRoot) {
    return node.stateNode;
  }
  return null;
}

function renderRoot(root: FiberRootNode) {
  prepareFreshStack(root);

  do {
    try {
      workLoop();
      break;
    } catch (e) {
      if (__DEV__) {
        console.warn('workLoop call error');
      }
    }
  } while (true);

  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;

  commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;

  if (finishedWork === null) {
    return;
  }
  if (__DEV__) {
    console.warn('commit begin !!');
  }
  root.finishedWork = null;

  const subtreeHasEffect =
      (finishedWork.subtreeFlags & MutationMask) !== NoFlags;

  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {
    // mutation
    commitMutationEffects(finishedWork);
    root.current = finishedWork;
    // layout
  }
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber);
  fiber.memoizedProps = fiber.pendingProps;

  if (next === null) {
    completeUnitOfWork(fiber);
  } else {
    workInProgress = next;
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;
  do {
    completeWork(node);
    const sibling = node.sibling;
    if (sibling !== null) {
      workInProgress = sibling;
      return;
    }
    node = node.return;
    workInProgress = node;
  } while (node !== null);
}

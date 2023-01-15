import {
  createFiberFromElement,
  createWorkInProgress,
  FiberNode
} from './fiber';
import {Props, ReactElementType} from 'shared/ReactTypes';
import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';
import {HostText} from './workTags';
import {ChildDeletion, Placement} from './fiberFlags';

function ChildReconciler(shouldTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function reconcileSingleElement(
      returnFiber: FiberNode,
      currentFiber: FiberNode | null,
      element: ReactElementType
  ) {
    const key = element.key;
    if (currentFiber !== null) {
      if (key === currentFiber.key) {
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            const existing = useFiber(currentFiber, element.props);
            existing.return = returnFiber;
            return existing;
          }
          deleteChild(returnFiber, currentFiber);
          // break work;
        } else {
          if (__DEV__) {
            console.warn('还未实现的 react 类型');
          }
          // break work;
        }
      } else {
        deleteChild(returnFiber, currentFiber);
      }
    }

    const fiber = createFiberFromElement(element);

    fiber.return = returnFiber;
    return fiber;
  }

  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement;
    }
    return fiber;
  }

  function reconcileSingleTextNode(
      returnFiber: FiberNode,
      currentFiber: FiberNode | null,
      element: string | number
  ) {
    if (currentFiber !== null) {
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, {content: element});
        existing.return = returnFiber;
        return existing;
      }
      deleteChild(returnFiber, currentFiber);
    }
    const fiber = new FiberNode(HostText, {content: element}, null);
    fiber.return = returnFiber;

    return fiber;
  }

  function reconcileChildFibers(
      returnFiber: FiberNode,
      currentFiber: FiberNode | null,
      newChild?: ReactElementType
  ) {
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
              reconcileSingleElement(returnFiber, currentFiber, newChild)
          );
        default:
          if (__DEV__) {
            console.warn('未实现的 reconcile 类型');
          }
          break;
      }
    }

    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
          reconcileSingleTextNode(returnFiber, currentFiber, newChild)
      );
    }

    if (currentFiber) {
      deleteChild(returnFiber, currentFiber);
    }
    if (__DEV__) {
      console.warn('未实现的 reconcile 类型');
    }
    return null;
  };


  return reconcileChildFibers;
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);

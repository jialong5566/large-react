import {FiberNode} from 'react-reconciler/src/fiber';
import {HostComponent, HostText} from 'react-reconciler/src/workTags';
import {Props} from 'shared/ReactTypes';
import {DOMElement, updateFiberProps} from "./SyntheticEvent";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export const createInstance = (type: string, props: Props): Instance => {
  const element = document.createElement(type) as unknown;
  // todo props
  updateFiberProps(element, props);
  return element as DOMElement;
};
export const createTextInstance = (content: string) => {
  return document.createTextNode(content);
};

export const appendInitialChild = (
    parent: Instance | Container,
    child: Instance
) => {
  parent.appendChild(child);
};

export const appendChildToContainer = appendInitialChild;

export function commitUpdate(fiber: FiberNode) {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content;
      return commitTextUpdate(fiber.stateNode, text);
      // case HostComponent:
      // 	return updateFiberProps(fiber.stateNode, fiber.pendingProps);
    default:
      if (__DEV__) {
        console.warn('未实现的 Update 类型', fiber);
      }
      break;
  }
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
  textInstance.textContent = content;
}

export function removeChild(
    child: Instance | TextInstance,
    container: Container
) {
  container.removeChild(child);
}

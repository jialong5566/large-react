import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	PassiveEffect,
	PassiveMask,
	Placement,
	Update
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import {
	appendChildToContainer,
	commitUpdate,
	Container,
	insertChildToContainer,
	Instance,
	removeChild
} from 'hostConfig';
import { Effect, FCUpdateQueue } from './fiberHooks';

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (
			(nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect, root);
				const sibling: FiberNode | null = nextEffect.sibling;

				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

function commitMutationEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const flags = finishedWork.flags;

	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach((childToDelete) => {
				commitDeletion(childToDelete, root);
			});
		}
		commitUpdate(finishedWork);
		finishedWork.flags &= ~ChildDeletion;
	}

	if ((flags & PassiveEffect) !== NoFlags) {
		commitPassiveEffect(finishedWork, root, 'update');
		finishedWork.flags &= ~PassiveEffect;
	}
}

function commitPassiveEffect(
	finishedWork: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (
		finishedWork.tag !== FunctionComponent ||
		(type === 'update' && (finishedWork.flags & PassiveEffect) === NoFlags)
	) {
		return;
	}

	const updateQueue = finishedWork.updateQueue as FCUpdateQueue<any>;
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null) {
			console.error('当FC存在PassiveEffect flag时，不应该不存在effect');
		}
		root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
	}
}

function recordHostChildrenToDelete(
	childrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	const lastOne = childrenToDelete[childrenToDelete.length - 1];
	if (!lastOne) {
		childrenToDelete.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node !== null) {
			if (unmountFiber === node) {
				childrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
	const hostChildrenToDelete: FiberNode[] = [];
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				// todo ref
				recordHostChildrenToDelete(hostChildrenToDelete, unmountFiber);
				return;
			case HostText:
				recordHostChildrenToDelete(hostChildrenToDelete, unmountFiber);
				return;
			case FunctionComponent:
				// todo useEffect
				commitPassiveEffect(childToDelete, root, 'unmount');
				return;

			default:
				if (__DEV__) {
					console.warn('未处理的 unmount 类型');
				}
				break;
		}
	});
	if (hostChildrenToDelete.length) {
		const hostParent = getHostParent(childToDelete) as Container;
		hostChildrenToDelete.forEach((hostChild) => {
			removeChild(hostChild.stateNode, hostParent);
		});
	}
	childToDelete.return = null;
	childToDelete.child = null;
}

function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node: FiberNode | null = root;
	while (true) {
		onCommitUnmount(node);
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === root) {
			return;
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function commitPlacement(finishedWork: FiberNode) {
	if (__DEV__) {
		console.warn('commitPlacement call');
	}

	const hostParent = getHostParent(finishedWork) as Container;

	const hostSibling = getHostSibling(finishedWork);
	if (hostParent !== null) {
		insertOrAppendPlacementNodeIntoContainer(
			finishedWork,
			hostParent,
			hostSibling
		);
	}
}

function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber;
	findSibling: while (true) {
		while (node.sibling === null) {
			const parent = node.return;
			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostRoot
			) {
				return null;
			}
			node = parent;
		}
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostText && node.tag !== HostComponent) {
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}
		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode;
		}
	}
}

function getHostParent(fiber: FiberNode): Container | null {
	const parent = fiber.return;

	while (parent) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}

		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
	}

	if (__DEV__) {
		console.warn('getHostParent not found');
	}
	return null;
}

function insertOrAppendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	if (finishedWork.tag === HostText || finishedWork.tag === HostComponent) {
		if (before) {
			insertChildToContainer(finishedWork.stateNode, hostParent, before);
		} else {
			appendChildToContainer(finishedWork.stateNode, hostParent);
		}
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		insertOrAppendPlacementNodeIntoContainer(child, hostParent);
		const sibling = child.sibling;
		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
		}
	}
}

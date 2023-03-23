import {
	createWorkInProgress,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects
} from './fiber';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { HostRoot } from './workTags';
import { Flags, MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import { commitMutationEffects } from './commitWork';
import {
	getHighestPriorityLane,
	Lane,
	Lanes,
	markRootFinished,
	mergeLanes,
	NoLane,
	NoLanes,
	SyncLane
} from './fiberLanes';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicrotask } from 'hostConfig';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { Effect } from './fiberHooks';
import { HookHasEffect, Passive } from './hookEffectTags';

// 与调度effect相关
let rootDoesHavePassiveEffects = false;

let workInProgress: FiberNode | null = null;
let workInProgressRootRenderLane: Lanes = NoLanes;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {});
	workInProgressRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);

	ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);

	if (updateLane === NoLane) {
		return;
	}

	if (updateLane === SyncLane) {
		if (__DEV__) {
			console.log('在微任务中调度，优先级', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMicrotask(flushSyncCallbacks);
	} else {
		if (__DEV__) {
			console.log('在宏任务中调度，优先级', updateLane);
		}
	}
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLanes = getHighestPriorityLane(root.pendingLanes);
	if (nextLanes !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}
	prepareFreshStack(root, lane);

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
	root.finishedLane = lane;

	workInProgressRootRenderLane = NoLane;
	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	const pendingPassiveEffects = root.pendingPassiveEffects;

	if (finishedWork === null) {
		return;
	}
	if (__DEV__) {
		console.warn('commit begin !!');
	}

	const lane = root.finishedLane;

	if (lane === NoLane && __DEV__) {
		console.error('commitRoot: root.finishedLane should not be NoLane');
	}
	root.finishedWork = null;
	root.finishedLane = NoLane;
	markRootFinished(root, lane);

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHavePassiveEffects) {
			rootDoesHavePassiveEffects = true;
			scheduleCallback(NormalPriority, () => {
				flushPassiveEffects(pendingPassiveEffects);
				return;
			});
		}
	}

	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;

	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// mutation
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork;
		// layout
	} else {
		// Fiber Tree切换
		root.current = finishedWork;
	}

	rootDoesHavePassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	const { update, unmount } = pendingPassiveEffects;
	unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];
	update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];
	flushSyncCallbacks();
}

function commitHookEffectList(
	flags: Flags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect;
	do {
		if ((effect.tag & flags) === flags) {
			callback(effect);
		}
		effect = effect.next as Effect;
	} while (effect !== lastEffect.next);
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
		effect.tag &= ~HookHasEffect;
	});
}

export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
	});
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create;
		if (typeof create === 'function') {
			effect.destroy = create();
		}
	});
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress, workInProgressRootRenderLane);
	}
}

function performUnitOfWork(fiber: FiberNode, renderLanes: Lanes) {
	const next = beginWork(fiber, renderLanes);
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
		const next = completeWork(node);
		if (next !== null) {
			workInProgress = next;
			return;
		}
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}

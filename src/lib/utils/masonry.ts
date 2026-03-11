/**
 * Pure masonry layout computation utilities.
 *
 * Calculates absolute positions for a shortest-column masonry grid
 * given a list of photos with optional width/height dimensions.
 * All functions are pure - no DOM, no side effects.
 */

import type { Photo } from '$lib/gallery';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Gap between cards in pixels (matches --space-4 = 1rem = 16px) */
export const GAP = 16;
/** Smaller gap for mobile (matches --space-2 = 0.5rem = 8px) */
export const GAP_MOBILE = 8;

export const BREAKPOINT_DESKTOP = 1024;
export const BREAKPOINT_TABLET = 768;
export const BREAKPOINT_MOBILE = 480;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LayoutPosition {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface MasonryLayout {
	positions: LayoutPosition[];
	totalHeight: number;
}

/* ------------------------------------------------------------------ */
/*  Functions                                                          */
/* ------------------------------------------------------------------ */

/** Return the number of masonry columns for a given container width. */
export function computeColumnCount(width: number): number {
	if (width > BREAKPOINT_TABLET) return 3;
	if (width > BREAKPOINT_MOBILE) return 2;
	return 1;
}

/** Return the gap (in px) between cards for a given container width. */
export function computeGap(width: number): number {
	return width <= BREAKPOINT_TABLET ? GAP_MOBILE : GAP;
}

/**
 * Compute absolute positions for every item in a shortest-column masonry layout.
 *
 * Each photo is placed into the column with the smallest current height.
 * Items that lack explicit dimensions fall back to a 3:4 aspect ratio.
 */
export function computeLayout(
	items: Photo[],
	width: number,
	columnCount: number,
	gap: number
): MasonryLayout {
	if (items.length === 0 || width <= 0) {
		return { positions: [], totalHeight: 0 };
	}

	const columnWidth = (width - gap * (columnCount - 1)) / columnCount;
	const columnHeights = new Array(columnCount).fill(0);
	const positions: LayoutPosition[] = [];

	for (const photo of items) {
		let shortestColumn = 0;
		for (let col = 1; col < columnCount; col++) {
			if (columnHeights[col] < columnHeights[shortestColumn]) {
				shortestColumn = col;
			}
		}

		const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 3 / 4;
		const itemHeight = columnWidth / aspectRatio;

		const left = shortestColumn * (columnWidth + gap);
		const top = columnHeights[shortestColumn];

		positions.push({ left, top, width: columnWidth, height: itemHeight });

		columnHeights[shortestColumn] = top + itemHeight + gap;
	}

	const totalHeight = Math.max(...columnHeights) - gap;

	return { positions, totalHeight: Math.max(0, totalHeight) };
}

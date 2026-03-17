import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import type { PhotoCategory } from "$lib/gallery";
import { mapRowToPhoto } from "$lib/server/gallery";

export const load: PageServerLoad = async () => {
  try {
    const db = getDb();

    const catResult = await db.execute(
      "SELECT id, slug, name, description, sort_order FROM category ORDER BY sort_order ASC",
    );

    const categories: PhotoCategory[] = catResult.rows.map((row) => ({
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string) || undefined,
      order: row.sort_order as number,
    }));

    // Get total photo count globally
    const totalResult = await db.execute("SELECT COUNT(*) as count FROM photo");
    const totalPhotos = Number(totalResult.rows[0]?.count || 0);

    // Get photo count per category
    const countResult = await db.execute(`
			SELECT c.slug, COUNT(p.id) as count
			FROM category c
			LEFT JOIN photo p ON c.id = p.category_id
			GROUP BY c.id, c.slug
		`);
    const photoCounts: Record<string, number> = {};
    for (const row of countResult.rows) {
      photoCounts[row.slug as string] = Number(row.count || 0);
    }

    // Fetch initial 20 photos
    const photoResult = await db.execute(
      `SELECT p.id, p.original_name, p.thumb_url, p.medium_url, p.full_url,
					p.width, p.height, p.uploaded_at, c.slug as category_slug
			 FROM photo p
			 JOIN category c ON p.category_id = c.id
			 ORDER BY p.uploaded_at DESC
			 LIMIT 20`,
    );

    const initialPhotos = photoResult.rows.map(mapRowToPhoto);

    return { categories, photoCounts, totalPhotos, initialPhotos, error: null };
  } catch (err) {
    console.error("[gallery] Failed to load from Turso:", err);
    return {
      categories: [],
      photoCounts: {},
      totalPhotos: 0,
      initialPhotos: [],
      error: "Failed to load gallery",
    };
  }
};

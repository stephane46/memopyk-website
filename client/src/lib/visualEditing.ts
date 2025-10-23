import { DIRECTUS_URL } from '@/constants/directus';

export async function applyVisualEditing(directusUrl: string = DIRECTUS_URL) {
  if (typeof window === "undefined") return;
  
  try {
    const { apply } = await import("@directus/visual-editing");
    await apply({ directusUrl });
    console.log('✏️ Directus Visual Editing enabled');
  } catch (error) {
    console.error('❌ Failed to initialize Directus Visual Editing:', error);
  }
}

import { Teacher } from '../types';
import { DEFAULT_TEACHERS } from '../config';

/**
 * Dynamically loads teacher photos from:
 * - /src/assets/teachers/*
 * - /public/teachers/*
 *
 * If user uploads photos to either location, they are automatically placed into the rotation carousel!
 */
export function getTeacherList(): Teacher[] {
  try {
    // Scan Vite glob imports
    const assetFiles = import.meta.glob<string>(
      [
        '/src/assets/teachers/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}',
        '/teachers/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}'
      ],
      { eager: true, import: 'default' }
    );

    const loadedPaths = Object.keys(assetFiles);

    if (loadedPaths.length > 0) {
      // Map custom loaded files into teacher objects
      const dynamicTeachers: Teacher[] = loadedPaths.map((filePath, index) => {
        const url = assetFiles[filePath];
        // Extract clean name from file path, e.g. "mehmet_yildiz.jpg" -> "Mehmet Yildiz"
        const fileName = filePath.split('/').pop()?.split('.')[0] || `Hoca ${index + 1}`;
        const formattedName = fileName
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return {
          id: `custom-${index}`,
          name: formattedName,
          department: 'Mühendislik Fakültesi',
          rank: 'Derece Eğitmeni',
          branch: 'Birebir Koçluk & Özel Ders',
          imageUrl: url,
        };
      });

      return dynamicTeachers;
    }
  } catch (err) {
    console.warn('Teacher photos folder scan initialized:', err);
  }

  // Fallback to default high-quality ITU teachers list
  return DEFAULT_TEACHERS;
}

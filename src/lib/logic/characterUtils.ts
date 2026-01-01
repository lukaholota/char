
import { PersI } from "@/lib/types/model-types";

/**
 * Calculates all skills the character currently has, combining:
 * 1. Base skills from persisted character data (pers.skills)
 * 2. Skills selected in the current form session (formData.skills)
 * 3. Skills granted by background or other sources if available in data
 * 
 * @param pers - The existing character data
 * @param formData - The current form data (optional)
 * @returns Array of unique skill names (enums)
 */
export const getEffectiveSkills = (
  pers: PersI | null | undefined, 
  formData: Record<string, any> = {}
): string[] => {
  const skills = new Set<string>();

  // 1. From Pers (base skills)
  if (pers && pers.skills && Array.isArray(pers.skills)) {
     // Check if it's an array of strings or objects
     pers.skills.forEach((s: any) => {
         if (typeof s === 'string') {
             skills.add(s);
         } else if (s && typeof s === 'object' && 'name' in s) {
             skills.add(s.name);
         }
     });
  }

  // 2. From FormData (Skills step)
  if (formData.skills && Array.isArray(formData.skills)) {
    formData.skills.forEach((skill: string) => {
        // Simple check if it looks like a skill enum
        if (typeof skill === 'string' && /^[A-Z_]+$/.test(skill)) {
             skills.add(skill);
        }
    });
  }
  
  // 3. Fallback/Legacy: check if pers has direct boolean flags or similar?
  // (Assuming Prisma model uses string[] for skills based on usage seen)

  return Array.from(skills);
};

export const getEffectiveExpertises = (
  pers: PersI | null | undefined,
  formData: Record<string, any> = {}
): string[] => {
    const expertises = new Set<string>();

    // From Pers (if stored)
    // Note: Database storage for expertise varies. Often it's in a JSON field or separate table.
    // If specific fields exist in PersI, use them.
    // For now, we rely heavily on formData for the active session.

     if (formData.expertiseSchema?.expertises && Array.isArray(formData.expertiseSchema.expertises)) {
      formData.expertiseSchema.expertises.forEach((exp: string) => expertises.add(exp));
    }

    return Array.from(expertises);
}

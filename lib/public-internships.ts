import programmesJson from '@/data/public-internship-programmes.json';
import projectsJson from '@/data/projects.json';
import type { PublicInternshipProgramme } from '@/lib/types';

const availabilityOrder = { open: 0, upcoming: 1, 'not-open': 2 };

export const publicInternshipProgrammes = (programmesJson as PublicInternshipProgramme[])
  .filter(programme => programme.visibility === 'public')
  .sort((a, b) => availabilityOrder[a.status] - availabilityOrder[b.status])
  .map(programme => ({
    ...programme,
    projects: programme.projectProgrammeId
      ? projectsJson
        .filter(project => project.programme === programme.projectProgrammeId && project.status === 'confirmed')
        .map(project => ({
          id: project.id,
          title: project.title,
          techDomain: project.techDomain,
          duration: project.internshipDuration,
          workingLocation: project.workingLocation,
          description: project.description,
          skills: project.skills,
        }))
      : programme.projects,
  }));

export function programmeAvailability(programme: PublicInternshipProgramme) {
  if (!programme.availabilityLabel.toLowerCase().includes('project')) return programme.availabilityLabel;
  return programme.status === 'open' ? 'Applications are open' : 'The next application cycle will be announced soon';
}

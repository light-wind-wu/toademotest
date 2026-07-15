import { Suspense } from 'react';
import ProjectNew from '@/views/project-new';

function ProjectNewLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-body-sm text-fg-muted">
      Loading create project…
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ProjectNewLoading />}>
      <ProjectNew />
    </Suspense>
  );
}

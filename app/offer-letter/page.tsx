import { Suspense } from 'react';
import OfferLetterCompose from '@/views/offer-letter-compose';

export default function Page() {
  return (
    <Suspense>
      <OfferLetterCompose />
    </Suspense>
  );
}

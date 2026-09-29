import type { Catalogue } from './schemas';

export function fillQuestion(
  text: string,
  catalogue: Catalogue,
  district?: string,
  place?: string
): string {
  const districtName = catalogue.districts.find((item) => item.slug === district)?.name;
  const placeName = catalogue.places.find((item) => item.slug === place)?.name;
  return text
    .replace('{district}', districtName ?? 'a district')
    .replace('{place}', placeName ?? 'a place');
}

export function findQuestion(catalogue: Catalogue, questionId: string) {
  return catalogue.categories
    .flatMap((category) => category.questions)
    .find((question) => question.id === questionId);
}

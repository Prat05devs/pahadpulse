import createLogger from '../../utils/logger.js';
import { findQuestion } from './catalogue.js';
import type {
  Answer,
  FollowUp,
  Lang,
  Localised,
  Question,
  ResolvedFacts,
  ResolverParams,
  SlotValue,
  UnavailableReason,
} from './types.js';

const logger = createLogger('@assistant.composer');

/** The honest fallback for each reason (AST-3). No digits, so it can never state a figure. */
export const UNAVAILABLE: Record<UnavailableReason, Localised> = {
  not_redistributable: {
    en: "Pahad Pulse holds this data but doesn't yet have the publisher's permission to show it.",
    hi: 'Pahad Pulse के पास यह डेटा है, पर इसे दिखाने की प्रकाशक की अनुमति अभी नहीं मिली है।',
  },
  source_unavailable: {
    en: "The source for this isn't reachable right now. Please try again later.",
    hi: 'इसका स्रोत अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।',
  },
  no_data: {
    en: "There's no published figure for this yet.",
    hi: 'इसका कोई प्रकाशित आँकड़ा अभी उपलब्ध नहीं है।',
  },
};

const GENERIC_EMPTY: Localised = {
  en: 'There is nothing to report for this right now.',
  hi: 'अभी इसके बारे में बताने को कुछ नहीं है।',
};

function slotText(value: SlotValue, lang: Lang): string {
  if (typeof value === 'object') return value[lang];
  return String(value);
}

/**
 * Fills `{name}` slots. Returns null when the template names a slot the resolver did not
 * supply. That is a programming error, caught by the catalogue test, and it must never reach
 * a reader as a literal "{population}".
 */
export function fillTemplate(
  template: string,
  slots: Record<string, SlotValue>,
  lang: Lang,
): string | null {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = slots[name];
    if (value === undefined) {
      missing = true;
      return '';
    }
    return slotText(value, lang);
  });
  return missing ? null : text;
}

export function questionText(question: Question, lang: Lang, params: ResolverParams = {}): string {
  let text = question.text[lang];
  if (params.district !== undefined) text = text.replace('{district}', params.district.name[lang]);
  if (params.place !== undefined) text = text.replace('{place}', params.place.name[lang]);
  return text;
}

const ANY: Record<'district' | 'place', Localised> = {
  district: { en: 'a district', hi: 'किसी ज़िले' },
  place: { en: 'a place', hi: 'किसी स्थान' },
};

function followUpsFor(question: Question, lang: Lang, params: ResolverParams): FollowUp[] {
  // A place sits in a district, so a district follow-up after a place question uses it.
  const district = params.district ?? params.place?.district ?? undefined;
  return question.followUps.flatMap((id) => {
    const next = findQuestion(id);
    if (next === undefined) return [];
    // Follow-ups carry what was just asked about, so "weather in Almora" → "roads in Almora"
    // is one tap. Without it, the client asks which district or place.
    const carry: ResolverParams = {};
    if (next.params.includes('district') && district !== undefined) carry.district = district;
    if (next.params.includes('place') && params.place !== undefined) carry.place = params.place;
    let text = questionText(next, lang, carry);
    for (const kind of next.params) text = text.replace(`{${kind}}`, ANY[kind][lang]);
    return [
      {
        questionId: next.id,
        district: carry.district?.slug ?? null,
        place: carry.place?.slug ?? null,
        text,
      },
    ];
  });
}

export function compose(
  question: Question,
  resolved: ResolvedFacts,
  lang: Lang,
  params: ResolverParams,
  now: Date,
): Answer {
  const { district, place } = params;
  let status = resolved.status;
  let text: string | null = null;

  if (status === 'ok') {
    text = fillTemplate(question.templates.ok[lang], resolved.slots, lang);
  } else if (status === 'empty') {
    text = fillTemplate((question.templates.empty ?? GENERIC_EMPTY)[lang], resolved.slots, lang);
  } else if (question.templates.unavailable !== undefined) {
    text = fillTemplate(question.templates.unavailable[lang], resolved.slots, lang);
  }

  if (text === null) {
    if (status !== 'unavailable') {
      logger.error('template named a slot its resolver did not supply', {
        questionId: question.id,
        status,
      });
    }
    status = 'unavailable';
    text = UNAVAILABLE[resolved.reason ?? 'no_data'][lang];
  }

  const route = question.route(params);
  const facts = status === 'unavailable' ? [] : resolved.facts;
  return {
    questionId: question.id,
    district: district === undefined ? null : { slug: district.slug, name: district.name[lang] },
    place: place === undefined ? null : { slug: place.slug, name: place.name[lang] },
    status,
    text,
    facts: facts.map((fact) => ({
      label: fact.label[lang],
      value: fact.value,
      vintage: fact.vintage,
      source:
        fact.source === null
          ? null
          : { department: fact.source.department[lang], url: fact.source.url },
    })),
    links:
      route === null
        ? []
        : [
            {
              label:
                district !== undefined && route.startsWith('/districts/')
                  ? lang === 'hi'
                    ? `${district.name.hi} खोलें`
                    : `Open ${district.name.en}`
                  : lang === 'hi'
                    ? 'पूरा पेज देखें'
                    : 'Open the full page',
              route,
            },
          ],
    followUps: followUpsFor(question, lang, params),
    generatedAt: now.toISOString(),
  };
}

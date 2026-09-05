import { describe, expect, it } from '@jest/globals';

import {
  assembleRings,
  countPositions,
  geometryCentroid,
  parseCapPolygon,
  pointInAnyRing,
  pointInRing,
  ringBounds,
  ringCentroid,
  simplifyGeometry,
  simplifyRing,
  type Position,
} from './geojson.js';

describe('assembleRings', () => {
  it('closes a ring from ways given in order', () => {
    const rings = assembleRings([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [1, 1],
      ],
      [
        [1, 1],
        [0, 0],
      ],
    ]);

    expect(rings).toHaveLength(1);
    expect(rings[0]?.[0]).toEqual(rings[0]?.[(rings[0]?.length ?? 1) - 1]);
  });

  it('closes a ring from ways given out of order and reversed', () => {
    // This is the realistic case: an OSM relation lists its ways in no particular order
    // and each way may run either direction.
    const rings = assembleRings([
      [
        [1, 1],
        [1, 0],
      ], // reversed
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [1, 1],
      ], // reversed
    ]);

    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(4);
  });

  it('drops a run of ways that never closes rather than fabricating the gap', () => {
    expect(
      assembleRings([
        [
          [0, 0],
          [1, 0],
        ],
        [
          [1, 0],
          [1, 1],
        ],
      ]),
    ).toEqual([]);
  });

  it('separates two disjoint rings', () => {
    const rings = assembleRings([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
      [
        [5, 5],
        [6, 5],
        [6, 6],
        [5, 5],
      ],
    ]);

    expect(rings).toHaveLength(2);
  });

  it('ignores ways too short to contribute', () => {
    expect(assembleRings([[[0, 0]]])).toEqual([]);
  });
});

describe('simplifyRing', () => {
  it('removes collinear points', () => {
    const ring: Position[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 3],
      [0, 0],
    ];
    const simplified = simplifyRing(ring, 0.001);

    expect(simplified.length).toBeLessThan(ring.length);
    expect(simplified).toContainEqual([0, 0]);
    expect(simplified).toContainEqual([3, 0]);
    expect(simplified).toContainEqual([3, 3]);
  });

  it('keeps the ring closed', () => {
    const simplified = simplifyRing(
      [
        [0, 0],
        [1, 0.0001],
        [2, 0],
        [2, 2],
        [0, 0],
      ],
      0.01,
    );

    expect(simplified[0]).toEqual(simplified[simplified.length - 1]);
  });

  it('returns the original when simplification would degenerate it', () => {
    const ring: Position[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ];
    // A tolerance far larger than the shape would otherwise collapse it to a line.
    expect(simplifyRing(ring, 100)).toEqual(ring);
  });

  it('is a no-op for a zero tolerance', () => {
    const ring: Position[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ];
    expect(simplifyRing(ring, 0)).toEqual(ring);
  });
});

describe('simplifyGeometry', () => {
  it('simplifies every ring of a multipolygon', () => {
    const before = countPositions({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [3, 3],
            [0, 0],
          ],
        ],
      ],
    });

    const after = countPositions(
      simplifyGeometry(
        {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [2, 0],
                [3, 0],
                [3, 3],
                [0, 0],
              ],
            ],
          ],
        },
        0.001,
      ),
    );

    expect(after).toBeLessThan(before);
  });
});

describe('ringCentroid', () => {
  it('finds the centre of a square', () => {
    const centroid = ringCentroid([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ]);

    expect(centroid?.[0]).toBeCloseTo(1);
    expect(centroid?.[1]).toBeCloseTo(1);
  });

  it('falls back to the mean for a zero-area ring', () => {
    const centroid = ringCentroid([
      [0, 0],
      [2, 0],
      [0, 0],
    ]);

    expect(centroid).not.toBeNull();
  });

  it('returns null for too few points', () => {
    expect(ringCentroid([[0, 0]])).toBeNull();
  });

  it('reads through a polygon geometry', () => {
    const centroid = geometryCentroid({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    });

    expect(centroid?.[0]).toBeCloseTo(1);
  });
});

describe('parseCapPolygon', () => {
  it('swaps CAP lat,lon into GeoJSON lon,lat', () => {
    // Real shape of a SACHET polygon value, verified 2026-09-04.
    const result = parseCapPolygon('30.7,79.0 30.8,79.1 30.9,79.0 30.7,79.0');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    // Longitude (79) must land first — the failure this test exists to catch puts
    // Uttarakhand's alerts in the Indian Ocean.
    expect(result.value.coordinates[0]?.[0]).toEqual([79.0, 30.7]);
  });

  it('closes an unclosed polygon', () => {
    const result = parseCapPolygon('30.7,79.0 30.8,79.1 30.9,79.0');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const ring = result.value.coordinates[0] as Position[];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('rejects out-of-range coordinates', () => {
    expect(parseCapPolygon('130.7,79.0 30.8,79.1 30.9,79.0').isErr()).toBe(true);
  });

  it('rejects malformed pairs', () => {
    expect(parseCapPolygon('30.7 30.8,79.1 30.9,79.0').isErr()).toBe(true);
  });

  it('rejects non-numeric values', () => {
    expect(parseCapPolygon('north,east 30.8,79.1 30.9,79.0').isErr()).toBe(true);
  });

  it('rejects a polygon with too few points', () => {
    expect(parseCapPolygon('30.7,79.0 30.8,79.1').isErr()).toBe(true);
  });
});

describe('pointInRing', () => {
  const square: Position[] = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
    [0, 0],
  ];

  it('accepts a point inside', () => {
    expect(pointInRing([2, 2], square)).toBe(true);
  });

  it('rejects a point outside', () => {
    expect(pointInRing([5, 2], square)).toBe(false);
  });

  it('rejects a point outside but within the bounding box of a concave ring', () => {
    // An L-shape: the notch is inside the bbox but outside the polygon. This is the case a
    // bounding-box test alone would get wrong, which is why the ray cast exists.
    const lShape: Position[] = [
      [0, 0],
      [4, 0],
      [4, 1],
      [1, 1],
      [1, 4],
      [0, 4],
      [0, 0],
    ];
    expect(pointInRing([3, 3], lShape)).toBe(false);
    expect(pointInRing([0.5, 3], lShape)).toBe(true);
  });

  it('checks every ring of a multi-ring area', () => {
    const other: Position[] = [
      [10, 10],
      [12, 10],
      [12, 12],
      [10, 10],
    ];
    expect(pointInAnyRing([11, 10.5], [square, other])).toBe(true);
    expect(pointInAnyRing([7, 7], [square, other])).toBe(false);
  });
});

describe('ringBounds', () => {
  it('spans every ring', () => {
    expect(
      ringBounds([
        [
          [0, 0],
          [2, 3],
          [0, 0],
        ],
        [
          [-1, 1],
          [5, 9],
          [-1, 1],
        ],
      ])
    ).toEqual([-1, 0, 5, 9]);
  });

  it('returns null for no rings', () => {
    expect(ringBounds([])).toBeNull();
  });
});

// src/lib/productCombinations.ts

// Generates the cartesian product of attribute values — e.g. given
// Color: [Red, Blue] and Size: [S, M], produces 4 combinations:
// [Red, S], [Red, M], [Blue, S], [Blue, M]
export interface AttributeValueOption {
  id: string;
  value: string;
  attributeId: string;
  attributeName: string;
}

export function generateCombinations(
  selectedByAttribute: Record<string, AttributeValueOption[]>,
): AttributeValueOption[][] {
  const attributeIds = Object.keys(selectedByAttribute).filter(
    (id) => selectedByAttribute[id].length > 0,
  );

  if (attributeIds.length === 0) return [];

  return attributeIds.reduce<AttributeValueOption[][]>(
    (combinations, attributeId) => {
      const values = selectedByAttribute[attributeId];
      const next: AttributeValueOption[][] = [];
      for (const combo of combinations) {
        for (const value of values) {
          next.push([...combo, value]);
        }
      }
      return next;
    },
    [[]],
  );
}

export function combinationLabel(combo: AttributeValueOption[]): string {
  return combo.map((v) => v.value).join(' / ');
}
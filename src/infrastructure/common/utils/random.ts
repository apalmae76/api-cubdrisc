import { faker } from '@faker-js/faker';
faker.seed(50);

export function generateDecimalRandom(
  min: number,
  max: number,
  fractionDigits: number,
): number {
  const decimalPart = faker.number.float({
    min,
    max,
    fractionDigits,
  });
  return decimalPart;
}

export function generateIntegerRandom(min: number, max: number): number {
  return faker.number.int({ min, max });
}

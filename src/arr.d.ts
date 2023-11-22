// https://stackoverflow.com/questions/67228182/typescript-function-that-works-on-all-numerical-array-types

interface NumericArray {
  every(predicate: (value: number, index: number, array: this) => unknown, thisArg?: any): boolean;
  fill(value: number, start?: number, end?: number): this;
  filter(predicate: (value: number, index: number, array: this) => any, thisArg?: any): this;
  find(predicate: (value: number, index: number, obj: this) => boolean, thisArg?: any): number | undefined;
  findIndex(predicate: (value: number, index: number, obj: this) => boolean, thisArg?: any): number;
  forEach(callbackfn: (value: number, index: number, array: this) => void, thisArg?: any): void;
  indexOf(searchElement: number, fromIndex?: number): number;
  join(separator?: string): string;
  lastIndexOf(searchElement: number, fromIndex?: number): number;
  readonly length: number;
  map(callbackfn: (value: number, index: number, array: this) => number, thisArg?: any): this;
  reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number): number;
  reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number, initialValue: number): number;
  reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: this) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number): number;
  reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number, initialValue: number): number;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: this) => U, initialValue: U): U;
  reverse(): this;
  slice(start?: number, end?: number): this;
  some(predicate: (value: number, index: number, array: this) => unknown, thisArg?: any): boolean;
  sort(compareFn?: (a: number, b: number) => number): this;
  toLocaleString(): string;
  toString(): string;
  [index: number]: number;
}

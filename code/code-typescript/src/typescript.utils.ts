/* eslint-disable */

import { ts } from '@atls/code-runtime/typescript'

export const flattenDiagnosticMessageText = (
  diag: string | ts.DiagnosticMessageChain,
  newLine: string,
  indent = 0
) => {
  if (indent === void 0) {
    indent = 0
  }

  if (typeof diag === 'string') {
    return diag
  } else if (diag === undefined) {
    return ''
  }

  var result = ''

  if (indent) {
    result += newLine
    for (var i = 0; i < indent; i++) {
      result += '  '
    }
  }

  result += diag.messageText
  indent++

  if (diag.next) {
    for (var _i = 0, _a = diag.next; _i < _a.length; _i++) {
      var kid = _a[_i]
      result += flattenDiagnosticMessageText(kid, newLine, indent)
    }
  }

  return result
}

export const getLineAndCharacterOfPosition = (
  sourceFile: ts.SourceFile | undefined,
  position: number
) => computeLineAndCharacterOfPosition(getLineStarts(sourceFile), position)

export type Comparer<T> = (a: T, b: T) => Comparison

/* @internal */
export const enum Comparison {
  LessThan = -1,
  EqualTo = 0,
  GreaterThan = 1,
}

export function some<T>(array: readonly T[] | undefined): array is readonly T[]
export function some<T>(array: readonly T[] | undefined, predicate: (value: T) => boolean): boolean
export function some<T>(
  array: readonly T[] | undefined,
  predicate?: (value: T) => boolean
): boolean {
  if (array) {
    if (predicate) {
      for (const v of array) {
        if (predicate(v)) {
          return true
        }
      }
    } else {
      return array.length > 0
    }
  }
  return false
}

export function identity<T>(x: T) {
  return x
}

function compareComparableValues(a: string | undefined, b: string | undefined): Comparison
function compareComparableValues(a: number | undefined, b: number | undefined): Comparison
function compareComparableValues(a: string | number | undefined, b: string | number | undefined) {
  return a === b
    ? Comparison.EqualTo
    : a === undefined
    ? Comparison.LessThan
    : b === undefined
    ? Comparison.GreaterThan
    : a < b
    ? Comparison.LessThan
    : Comparison.GreaterThan
}

export function compareValues(a: number | undefined, b: number | undefined): Comparison {
  return compareComparableValues(a, b)
}

export function binarySearch<T, U>(
  array: readonly T[],
  value: T,
  keySelector: (v: T) => U,
  keyComparer: Comparer<U>,
  offset?: number
): number {
  return binarySearchKey(array, keySelector(value), keySelector, keyComparer, offset)
}

export function binarySearchKey<T, U>(
  array: readonly T[],
  key: U,
  keySelector: (v: T, i: number) => U,
  keyComparer: Comparer<U>,
  offset?: number
): number {
  if (!some(array)) {
    return -1
  }

  let low = offset || 0
  let high = array.length - 1
  while (low <= high) {
    const middle = low + ((high - low) >> 1)
    const midKey = keySelector(array[middle], middle)
    switch (keyComparer(midKey, key)) {
      case Comparison.LessThan:
        low = middle + 1
        break
      case Comparison.EqualTo:
        return middle
      case Comparison.GreaterThan:
        high = middle - 1
        break
    }
  }

  return ~low
}

export function computeLineOfPosition(lineStarts: number[], position: number, lowerBound?: number) {
  let lineNumber = binarySearch(lineStarts, position, identity, compareValues, lowerBound)

  if (lineNumber < 0) {
    lineNumber = ~lineNumber - 1
  }

  return lineNumber
}

export const computeLineAndCharacterOfPosition = (lineStarts: Array<number>, position: number) => {
  const lineNumber = computeLineOfPosition(lineStarts, position)

  return {
    line: lineNumber,
    character: position - lineStarts[lineNumber],
  }
}

export const getLineStarts = (sourceFile: ts.SourceFile | undefined) => (sourceFile as any)?.lineMap

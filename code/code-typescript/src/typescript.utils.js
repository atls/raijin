export const flattenDiagnosticMessageText = (diag, newLine, indent = 0) => {
    if (indent === void 0) {
        indent = 0;
    }
    if (typeof diag === 'string') {
        return diag;
    }
    else if (diag === undefined) {
        return '';
    }
    var result = '';
    if (indent) {
        result += newLine;
        for (var i = 0; i < indent; i++) {
            result += '  ';
        }
    }
    result += diag.messageText;
    indent++;
    if (diag.next) {
        for (var _i = 0, _a = diag.next; _i < _a.length; _i++) {
            var kid = _a[_i];
            result += flattenDiagnosticMessageText(kid, newLine, indent);
        }
    }
    return result;
};
export const getLineAndCharacterOfPosition = (sourceFile, position) => computeLineAndCharacterOfPosition(getLineStarts(sourceFile), position);
export function some(array, predicate) {
    if (array) {
        if (predicate) {
            for (const v of array) {
                if (predicate(v)) {
                    return true;
                }
            }
        }
        else {
            return array.length > 0;
        }
    }
    return false;
}
export function identity(x) {
    return x;
}
function compareComparableValues(a, b) {
    return a === b
        ? 0
        : a === undefined
            ? -1
            : b === undefined
                ? 1
                : a < b
                    ? -1
                    : 1;
}
export function compareValues(a, b) {
    return compareComparableValues(a, b);
}
export function binarySearch(array, value, keySelector, keyComparer, offset) {
    return binarySearchKey(array, keySelector(value), keySelector, keyComparer, offset);
}
export function binarySearchKey(array, key, keySelector, keyComparer, offset) {
    if (!some(array)) {
        return -1;
    }
    let low = offset || 0;
    let high = array.length - 1;
    while (low <= high) {
        const middle = low + ((high - low) >> 1);
        const midKey = keySelector(array[middle], middle);
        switch (keyComparer(midKey, key)) {
            case -1:
                low = middle + 1;
                break;
            case 0:
                return middle;
            case 1:
                high = middle - 1;
                break;
        }
    }
    return ~low;
}
export function computeLineOfPosition(lineStarts, position, lowerBound) {
    let lineNumber = binarySearch(lineStarts, position, identity, compareValues, lowerBound);
    if (lineNumber < 0) {
        lineNumber = ~lineNumber - 1;
    }
    return lineNumber;
}
export const computeLineAndCharacterOfPosition = (lineStarts, position) => {
    const lineNumber = computeLineOfPosition(lineStarts, position);
    return {
        line: lineNumber,
        character: position - lineStarts[lineNumber],
    };
};
export const getLineStarts = (sourceFile) => sourceFile.lineMap;

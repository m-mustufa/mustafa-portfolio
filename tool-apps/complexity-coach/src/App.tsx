import React, { useState, useEffect, useMemo } from 'react';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Code2,
  Cpu,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldAlert,
  Info,
  Terminal,
  FlaskConical,
  Copy,
  Check,
  RotateCcw,
  Mail,
  MessageCircle,
  Linkedin,
  Github,
  CalendarDays,
  Phone,
  ExternalLink,
  Send
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type HighlightCategory = 'loop' | 'sort' | 'map_set' | 'allocation' | 'uncertain';

export interface CodeEvidence {
  line: number;
  category: HighlightCategory;
  operation: string;
  codeSnippet: string;
  timeImpact: string;
  spaceImpact: string;
  explanationEn: string;
  explanationUr: string;
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Manual review needed';

export interface AnalysisResult {
  timeComplexity: string;
  auxSpaceComplexity: string;
  totalSpaceComplexity: string;
  confidence: ConfidenceLevel;
  manualReviewReasons: string[];
  plainEnglishSummary: string;
  whyEnglish: string[];
  whyRomanUrdu: string[];
  evidence: CodeEvidence[];
  lineHighlights: Record<number, { category: HighlightCategory; tooltip: string }>;
  assumptions: string[];
  detectedDimensions: Record<string, string>;
}

export interface TestCase {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  expectedTime: string;
  expectedAuxSpace: string;
  expectedTotalSpace?: string;
  expectedConfidence?: ConfidenceLevel;
}

// ============================================================================
// BUILT-IN TEST SUITE & PRESETS
// ============================================================================

const BUILT_IN_TESTS: TestCase[] = [
  {
    id: 'two-sum',
    title: '1. Two Sum (Hash Map)',
    subtitle: 'Single pass with Map lookup & insertion',
    expectedTime: 'O(n)',
    expectedAuxSpace: 'O(n)',
    expectedTotalSpace: 'O(n)',
    expectedConfidence: 'High',
    code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`
  },
  {
    id: 'merge-sorted',
    title: '2. Merge Sorted Array (Baseline)',
    subtitle: 'Slice + Concat + Sort over two distinct inputs (m, n)',
    expectedTime: 'O((m+n) log(m+n))',
    expectedAuxSpace: 'O(m+n)',
    expectedTotalSpace: 'O(m+n)',
    expectedConfidence: 'High',
    code: `function mergeBaseline(nums1, m, nums2, n) {
  const realValues = nums1.slice(0, m);
  const combined = realValues.concat(nums2);
  combined.sort((a, b) => a - b);
  return combined;
}`
  },
  {
    id: 'product-except-self',
    title: '3. Product Except Self',
    subtitle: 'Left & Right prefix passes with output array excluded from Aux Space',
    expectedTime: 'O(n)',
    expectedAuxSpace: 'O(1)',
    expectedTotalSpace: 'O(n)',
    expectedConfidence: 'High',
    code: `function productExceptSelf(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);

  let prefix = 1;
  for (let i = 0; i < n; i++) {
    res[i] = prefix;
    prefix *= nums[i];
  }

  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= suffix;
    suffix *= nums[i];
  }

  return res;
}`
  },
  {
    id: 'nested-pairs',
    title: '4. Nested Pair Loops',
    subtitle: 'All pairs comparison over array of size n',
    expectedTime: 'O(n²)',
    expectedAuxSpace: 'O(1)',
    expectedTotalSpace: 'O(1)',
    expectedConfidence: 'High',
    code: `function countDuplicatePairs(nums) {
  let count = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) {
        count++;
      }
    }
  }
  return count;
}`
  },
  {
    id: 'binary-search',
    title: '5. Binary Search',
    subtitle: 'Halving search space via mid = Math.floor((left + right) / 2)',
    expectedTime: 'O(log n)',
    expectedAuxSpace: 'O(1)',
    expectedTotalSpace: 'O(1)',
    expectedConfidence: 'High',
    code: `function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}`
  },
  {
    id: 'manual-review-recursion',
    title: '6. DFS / Recursion (Safety Check)',
    subtitle: 'Demonstrates refusal to guess on recursion or unknown helpers',
    expectedTime: 'Manual review needed',
    expectedAuxSpace: 'Manual review needed',
    expectedTotalSpace: 'Manual review needed',
    expectedConfidence: 'Manual review needed',
    code: `function exploreGraph(node, visited = new Set()) {
  if (!node || visited.has(node)) return;
  visited.add(node);
  for (const neighbor of node.neighbors) {
    exploreGraph(neighbor, visited);
  }
}`
  },
  {
    id: 'manual-review-dynamic-access',
    title: '7. Dynamic Property Access (Safety Check)',
    subtitle: 'Refuses to guess when an unknown object is accessed with a runtime key',
    expectedTime: 'Manual review needed',
    expectedAuxSpace: 'Manual review needed',
    expectedTotalSpace: 'Manual review needed',
    expectedConfidence: 'Manual review needed',
    code: `function readDynamic(obj, key) {
  return obj[key];
}`
  },
  {
    id: 'manual-review-member-call',
    title: '8. Unknown Member Call (Safety Check)',
    subtitle: 'Refuses to invent a cost for an external object method',
    expectedTime: 'Manual review needed',
    expectedAuxSpace: 'Manual review needed',
    expectedTotalSpace: 'Manual review needed',
    expectedConfidence: 'Manual review needed',
    code: `function transform(items, service) {
  return service.process(items);
}`
  }
];

// ============================================================================
// SYMBOLIC COMPLEXITY ALGEBRA HELPERS
// ============================================================================

interface ComplexityTerm {
  kind: 'const' | 'log' | 'linear' | 'nlogn' | 'quad' | 'prod' | 'unknown';
  dim: string; // e.g. '1', 'n', 'm', 'm+n', 'n*m'
  power?: number;
}

function normalizeDim(d: string): string {
  const clean = d.replace(/\s+/g, '');
  if (clean === 'n+m' || clean === 'm+n') return 'm+n';
  if (clean === 'n*m' || clean === 'm*n') return 'n*m';
  return clean || 'n';
}

function addDims(d1: string, d2: string): string {
  const a = normalizeDim(d1);
  const b = normalizeDim(d2);
  if (a === '1') return b;
  if (b === '1') return a;
  if (a === b) return a;
  if ((a === 'm' && b === 'n') || (a === 'n' && b === 'm')) return 'm+n';
  if (a === 'm+n' || b === 'm+n') return 'm+n';
  return `${a}+${b}`;
}

function multiplyLoopDims(outerDims: string[]): { term: string; rank: number } {
  if (outerDims.length === 0) return { term: '1', rank: 0 };
  const logCount = outerDims.filter((d) => d.startsWith('log(')).length;
  const linearDims = outerDims.filter((d) => !d.startsWith('log('));

  if (linearDims.length === 0 && logCount === 1) {
    const inner = outerDims[0].slice(4, -1);
    return { term: `log ${inner}`, rank: 1 };
  }
  if (linearDims.length === 0 && logCount > 1) {
    return { term: `log^${logCount} n`, rank: 1.5 };
  }
  if (linearDims.length === 1 && logCount === 0) {
    const d = normalizeDim(linearDims[0]);
    return { term: d, rank: d === 'm+n' ? 2.2 : 2 };
  }
  if (linearDims.length === 1 && logCount === 1) {
    const d = normalizeDim(linearDims[0]);
    const wrap = d.includes('+') ? `(${d})` : d;
    return { term: `${wrap} log(${d})`, rank: 3 };
  }
  if (linearDims.length === 2 && logCount === 0) {
    const a = normalizeDim(linearDims[0]);
    const b = normalizeDim(linearDims[1]);
    if (a === b) {
      const wrap = a.includes('+') ? `(${a})` : a;
      return { term: `${wrap}²`, rank: 4 };
    }
    return { term: `${a}*${b}`, rank: 4 };
  }
  if (linearDims.length >= 3) {
    const a = normalizeDim(linearDims[0]);
    return { term: `${a}^${linearDims.length}`, rank: 5 };
  }
  return { term: outerDims.join(' * '), rank: 3.5 };
}

function combineTimeTerms(terms: { term: string; rank: number }[]): string {
  if (terms.length === 0) return 'O(1)';
  const maxRank = Math.max(...terms.map((t) => t.rank));
  const topTerms = terms.filter((t) => Math.abs(t.rank - maxRank) < 0.35);

  const unique = Array.from(new Set(topTerms.map((t) => t.term)));
  if (unique.length === 1) {
    return `O(${unique[0]})`;
  }
  // Check if we have 'm' and 'n' at rank 2 -> O(m + n)
  if (maxRank === 2 && unique.includes('m') && unique.includes('n')) {
    return 'O(m+n)';
  }
  if (unique.includes('m+n')) {
    return 'O(m+n)';
  }
  return `O(${unique.join(' + ')})`;
}

function combineSpaceTerms(dims: string[]): string {
  const nonConst = dims.filter((d) => d !== '1' && d !== '');
  if (nonConst.length === 0) return 'O(1)';
  const norm = Array.from(new Set(nonConst.map(normalizeDim)));
  if (norm.includes('m+n') || (norm.includes('m') && norm.includes('n'))) {
    return 'O(m+n)';
  }
  if (norm.length === 1) {
    return `O(${norm[0]})`;
  }
  return `O(${norm.join(' + ')})`;
}

// ============================================================================
// STATIC AST COMPLEXITY ANALYZER (ACORN)
// ============================================================================

const SAFE_GLOBAL_CALLS = new Set([
  'Math.floor',
  'Math.ceil',
  'Math.round',
  'Math.max',
  'Math.min',
  'Math.abs',
  'Math.sqrt',
  'Math.pow',
  'Math.trunc',
  'Math.sign',
  'Number',
  'String',
  'Boolean',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'Array.isArray',
  'console.log',
  'Object.is'
]);

export function analyzeJavaScriptComplexity(rawCode: string): AnalysisResult {
  const lines = rawCode.split('\n');
  const getLineText = (lineNo: number) => (lines[lineNo - 1] || '').trim();

  // Strip simple TypeScript type annotations cleanly if a user pastes TS syntax
  const sanitizedCode = rawCode
    .replace(/:\s*(number|string|boolean|any|void|unknown|never)(\[\])*/g, '')
    .replace(/<\s*[A-Za-z0-9_,\s]+\s*>(?=\s*\()/g, '');

  let ast: any;
  try {
    ast = acorn.parse(sanitizedCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true
    });
  } catch (syntaxErr: any) {
    const errLine = syntaxErr?.loc?.line || 1;
    return {
      timeComplexity: 'Manual review needed',
      auxSpaceComplexity: 'Manual review needed',
      totalSpaceComplexity: 'Manual review needed',
      confidence: 'Manual review needed',
      manualReviewReasons: [
        `Syntax Error on line ${errLine}: ${syntaxErr.message}. Fix syntax to run AST analysis.`
      ],
      plainEnglishSummary: `Could not parse JavaScript AST due to a syntax error on line ${errLine}.`,
      whyEnglish: [`Parser stopped at line ${errLine}: ${syntaxErr.message}`],
      whyRomanUrdu: [
        `Line ${errLine} par syntax error hai (${syntaxErr.message}), is liye AST parse nahi ho saka.`
      ],
      evidence: [
        {
          line: errLine,
          category: 'uncertain',
          operation: 'Syntax Error',
          codeSnippet: getLineText(errLine),
          timeImpact: 'Unknown',
          spaceImpact: 'Unknown',
          explanationEn: `Syntax error prevented AST parsing: ${syntaxErr.message}`,
          explanationUr: `Line ${errLine} par code mein syntax ghalti hai.`
        }
      ],
      lineHighlights: {
        [errLine]: { category: 'uncertain', tooltip: `Syntax Error: ${syntaxErr.message}` }
      },
      assumptions: [],
      detectedDimensions: {}
    };
  }

  // State tracked during AST traversal
  const varDimensions: Record<string, string> = {}; // e.g., nums -> 'n', nums1 -> 'm', combined -> 'm+n'
  const varTypes: Record<string, 'array' | 'map' | 'set' | 'scalar'> = {};
  const allocatedVars: Record<
    string,
    { line: number; dim: string; kind: string; codeSnippet: string }
  > = {};
  const returnedIdentifiers = new Set<string>();
  const declaredFunctions = new Set<string>();

  const evidence: CodeEvidence[] = [];
  const lineHighlights: Record<number, { category: HighlightCategory; tooltip: string }> = {};
  const manualReviewReasons: string[] = [];
  const timeContributions: { term: string; rank: number; line: number; reason: string }[] = [];

  const setHighlight = (line: number, category: HighlightCategory, tooltip: string) => {
    const priority: Record<HighlightCategory, number> = {
      uncertain: 5,
      sort: 4,
      loop: 3,
      allocation: 2,
      map_set: 1
    };
    const existing = lineHighlights[line];
    if (!existing || priority[category] >= priority[existing.category]) {
      lineHighlights[line] = { category, tooltip };
    }
  };

  // Pass 1: Collect Function Declarations, Parameters, and Return Statements
  function pass1CollectDeclarations(node: any) {
    if (!node || typeof node !== 'object') return;

    if (
      (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
      node.params
    ) {
      if (node.id?.name) {
        declaredFunctions.add(node.id.name);
      }

      const paramNames: string[] = node.params
        .map((p: any) => (p.type === 'Identifier' ? p.name : p.left?.name))
        .filter(Boolean);

      // Smart dimension assignment for interview signatures
      // e.g. (nums1, m, nums2, n) or (nums1, nums2) or (arr1, arr2) or (s, t)
      const hasMAndNParams = paramNames.includes('m') && paramNames.includes('n');
      const arrayLikeParams = paramNames.filter(
        (name) =>
          /^(nums|arr|list|words|strs|items|intervals|matrix|grid|chars|s|t|a|b)/i.test(name) &&
          name !== 'm' &&
          name !== 'n' &&
          name !== 'target' &&
          name !== 'k' &&
          name !== 'val'
      );

      if (hasMAndNParams) {
        varDimensions['m'] = 'm';
        varDimensions['n'] = 'n';
        if (paramNames[0]) {
          varDimensions[paramNames[0]] = 'm';
          varTypes[paramNames[0]] = 'array';
        }
        const secondArr = arrayLikeParams[1] || paramNames[2];
        if (secondArr) {
          varDimensions[secondArr] = 'n';
          varTypes[secondArr] = 'array';
        }
      } else if (arrayLikeParams.length >= 2) {
        varDimensions[arrayLikeParams[0]] = 'm';
        varTypes[arrayLikeParams[0]] = 'array';
        varDimensions[arrayLikeParams[1]] = 'n';
        varTypes[arrayLikeParams[1]] = 'array';
      } else if (arrayLikeParams.length === 1) {
        varDimensions[arrayLikeParams[0]] = 'n';
        varTypes[arrayLikeParams[0]] = 'array';
      } else if (paramNames.length > 0 && !['target', 'k', 'val'].includes(paramNames[0])) {
        varDimensions[paramNames[0]] = 'n';
      }
    }

    if (node.type === 'VariableDeclarator' && node.id?.name && node.init) {
      if (
        node.init.type === 'FunctionExpression' ||
        node.init.type === 'ArrowFunctionExpression'
      ) {
        declaredFunctions.add(node.id.name);
      }
    }

    if (node.type === 'ReturnStatement' && node.argument) {
      if (node.argument.type === 'Identifier') {
        returnedIdentifiers.add(node.argument.name);
      }
    }

  }

  acornWalk.full(ast, pass1CollectDeclarations);

  // Fallback heuristics for top-level snippets without an enclosing function signature
  if (Object.keys(varDimensions).length === 0) {
    if (/\bnums1\b/.test(rawCode) && /\bnums2\b/.test(rawCode)) {
      varDimensions['nums1'] = 'm';
      varDimensions['nums2'] = 'n';
      varDimensions['m'] = 'm';
      varDimensions['n'] = 'n';
    } else if (/\bnums\b/.test(rawCode)) {
      varDimensions['nums'] = 'n';
    } else if (/\barr\b/.test(rawCode)) {
      varDimensions['arr'] = 'n';
    }
  }

  // Helper to resolve the symbolic dimension of an AST expression
  function resolveExprDimension(expr: any): string {
    if (!expr) return 'n';
    if (expr.type === 'Identifier') {
      if (varDimensions[expr.name]) return varDimensions[expr.name];
      if (expr.name === 'm') return 'm';
      if (expr.name === 'n') return 'n';
      if (/1$/.test(expr.name)) return 'm';
      if (/2$/.test(expr.name)) return 'n';
      return 'n';
    }
    if (expr.type === 'MemberExpression') {
      if (
        expr.property?.type === 'Identifier' &&
        (expr.property.name === 'length' || expr.property.name === 'size')
      ) {
        return resolveExprDimension(expr.object);
      }
    }
    if (expr.type === 'BinaryExpression') {
      if (expr.operator === '+' || expr.operator === '-') {
        const leftDim = resolveExprDimension(expr.left);
        const rightDim =
          expr.right.type === 'Literal' ? '1' : resolveExprDimension(expr.right);
        return addDims(leftDim, rightDim);
      }
    }
    if (expr.type === 'CallExpression' && expr.callee?.type === 'MemberExpression') {
      const prop = expr.callee.property?.name;
      const objDim = resolveExprDimension(expr.callee.object);
      if (prop === 'slice') {
        if (expr.arguments?.length >= 2 && expr.arguments[1].type === 'Identifier') {
          return resolveExprDimension(expr.arguments[1]);
        }
        return objDim;
      }
      if (prop === 'concat') {
        const argDim = expr.arguments?.[0] ? resolveExprDimension(expr.arguments[0]) : 'n';
        return addDims(objDim, argDim);
      }
      if (['map', 'filter', 'reverse', 'flat'].includes(prop)) {
        return objDim;
      }
    }
    if (expr.type === 'ArrayExpression') {
      const spreadEl = expr.elements?.find((el: any) => el?.type === 'SpreadElement');
      if (spreadEl) {
        const spreadElements = expr.elements.filter((el: any) => el?.type === 'SpreadElement');
        if (spreadElements.length === 2) {
          return addDims(
            resolveExprDimension(spreadElements[0].argument),
            resolveExprDimension(spreadElements[1].argument)
          );
        }
        return resolveExprDimension(spreadEl.argument);
      }
      return '1';
    }
    return 'n';
  }

  // Helper to inspect a ForStatement and extract its iteration complexity
  function analyzeForStatement(node: any): {
    status: 'linear' | 'log' | 'constant' | 'uncertain';
    dim: string;
    reason?: string;
  } {
    // Check update expression for * 2, *= 2, / 2, /= 2, >>= 1 (Logarithmic loop)
    const update = node.update;
    if (update) {
      if (
        update.type === 'AssignmentExpression' &&
        (['*=', '/=', '>>='].includes(update.operator) ||
          (update.operator === '=' &&
            update.right?.type === 'BinaryExpression' &&
            ['*', '/', '>>'].includes(update.right.operator)))
      ) {
        const boundDim = node.test ? resolveExprDimension(node.test.right || node.test.left) : 'n';
        return { status: 'log', dim: `log(${boundDim})` };
      }
    }

    // Check test condition: i < nums.length, i < n, i >= 0
    const test = node.test;
    if (!test || test.type !== 'BinaryExpression') {
      return {
        status: 'uncertain',
        dim: '?',
        reason: 'For-loop has a missing or non-standard termination condition.'
      };
    }

    // Detect decrementing loop: for (let i = n - 1; i >= 0; i--)
    if (['>=', '>'].includes(test.operator) && test.right?.type === 'Literal') {
      // Look at init for starting bound
      const initDecl = node.init?.declarations?.[0]?.init || node.init?.right;
      if (initDecl) {
        const dim = resolveExprDimension(initDecl);
        return { status: 'linear', dim };
      }
    }

    // Standard incrementing loop: i < arr.length, i < n, i <= right
    if (['<', '<=', '!==', '!='].includes(test.operator)) {
      if (test.right?.type === 'Literal' && typeof test.right.value === 'number') {
        return { status: 'constant', dim: '1' };
      }
      const rightDim = resolveExprDimension(test.right);
      return { status: 'linear', dim: rightDim };
    }

    return {
      status: 'uncertain',
      dim: '?',
      reason: 'Could not verify linear or logarithmic bound on for-loop.'
    };
  }

  // Helper to inspect WhileStatement (detect Binary Search vs Linear Two-Pointer vs Uncertain)
  function analyzeWhileStatement(node: any): {
    status: 'linear' | 'log' | 'uncertain';
    dim: string;
    reason?: string;
  } {
    const bodyText = lines
      .slice((node.loc?.start?.line || 1) - 1, node.loc?.end?.line || 1)
      .join('\n');

    // Pattern 1: Binary search (mid calculation + left/right updated via mid)
    const hasMidCalc =
      /\bmid\s*=/.test(bodyText) &&
      (/\/\s*2\b/.test(bodyText) || />>\s*1\b/.test(bodyText));
    const updatesBoundsWithMid =
      /\b(left|low|l|start)\s*=\s*mid\b/.test(bodyText) ||
      /\b(right|high|r|end)\s*=\s*mid\b/.test(bodyText);

    if (hasMidCalc && updatesBoundsWithMid) {
      return { status: 'log', dim: 'log(n)' };
    }

    // Pattern 2: Direct halving/doubling inside while body (e.g. n = Math.floor(n / 2) or i *= 2)
    if (/\b[a-zA-Z0-9_]+\s*(\*=|\/=|>>=)\s*2\b/.test(bodyText)) {
      return { status: 'log', dim: 'log(n)' };
    }

    // Pattern 3: Monotonic pointer advancement (left++, right--, i++, j--)
    const hasMonotonicStep = /\b(left|right|i|j|low|high|slow|fast|p1|p2)(\+\+|--|\s*\+=\s*1|\s*-=\s*1)/.test(
      bodyText
    );
    if (hasMonotonicStep) {
      return { status: 'linear', dim: 'n' };
    }

    return {
      status: 'uncertain',
      dim: '?',
      reason:
        'While-loop does not have a provable halving step (binary search) or monotonic pointer increment.'
    };
  }

  // Pass 2: Recursive AST Walk with Active Loop Context Stack
  function walkAST(node: any, activeLoopStack: string[], currentFuncName: string | null) {
    if (!node || typeof node !== 'object') return;
    const line = node.loc?.start?.line || 1;

    // 1. Track Function Context
    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      currentFuncName = node.id.name;
    }

    // 2. Variable Declarations (track aliases like `const n = nums.length`, `new Map()`, `new Array(n)`)
    if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') {
      const varName = node.id.name;
      const init = node.init;

      if (init) {
        // Alias for length: const n = nums.length
        if (
          init.type === 'MemberExpression' &&
          init.property?.name === 'length'
        ) {
          varDimensions[varName] = resolveExprDimension(init.object);
          varTypes[varName] = 'scalar';
        }

        // new Map() / new Set()
        if (init.type === 'NewExpression' && init.callee?.type === 'Identifier') {
          const ctor = init.callee.name;
          if (ctor === 'Map' || ctor === 'Set') {
            varTypes[varName] = ctor === 'Map' ? 'map' : 'set';
            const argDim =
              init.arguments?.length > 0 ? resolveExprDimension(init.arguments[0]) : '1';
            varDimensions[varName] = argDim;

            const spaceImpact = argDim === '1' ? 'O(1) init' : `O(${argDim})`;
            if (argDim !== '1') {
              allocatedVars[varName] = {
                line,
                dim: argDim,
                kind: `new ${ctor}(input)`,
                codeSnippet: getLineText(line)
              };
              const mult = multiplyLoopDims([...activeLoopStack, argDim]);
              timeContributions.push({
                term: mult.term,
                rank: mult.rank,
                line,
                reason: `Populating new ${ctor}(...) from iterable of size ${argDim}`
              });
            }

            setHighlight(line, 'map_set', `Initializes ${ctor} (${spaceImpact})`);
            evidence.push({
              line,
              category: 'map_set',
              operation: `new ${ctor}()`,
              codeSnippet: getLineText(line),
              timeImpact: argDim === '1' ? 'O(1)' : `O(${argDim})`,
              spaceImpact,
              explanationEn:
                argDim === '1'
                  ? `Creates an empty ${ctor} on line ${line}. Space grows if populated inside a loop.`
                  : `Creates and populates a ${ctor} of size ${argDim} on line ${line}.`,
              explanationUr:
                argDim === '1'
                  ? `Line ${line} par khali ${ctor} banaya gaya hai. Agar loop mein data add hua to space barhe gi.`
                  : `Line ${line} par ${argDim} elements ka ${ctor} banaya gaya hai jo O(${argDim}) memory leta hai.`
            });
          } else if (ctor === 'Array') {
            varTypes[varName] = 'array';
            const argDim =
              init.arguments?.length > 0 ? resolveExprDimension(init.arguments[0]) : '1';
            varDimensions[varName] = argDim;
            allocatedVars[varName] = {
              line,
              dim: argDim,
              kind: `new Array(${argDim})`,
              codeSnippet: getLineText(line)
            };
            setHighlight(line, 'allocation', `Array allocation of size ${argDim}`);
            evidence.push({
              line,
              category: 'allocation',
              operation: `new Array(${argDim})`,
              codeSnippet: getLineText(line),
              timeImpact: `O(${argDim})`,
              spaceImpact: `O(${argDim})`,
              explanationEn: `Allocates an array '${varName}' of size ${argDim} on line ${line}.`,
              explanationUr: `Line ${line} par '${varName}' array banayi gayi hai jis ka size ${argDim} hai.`
            });
          }
        }

        // Array literal: [] or [...arr]
        if (init.type === 'ArrayExpression') {
          varTypes[varName] = 'array';
          const hasSpread = init.elements?.some((el: any) => el?.type === 'SpreadElement');
          if (hasSpread) {
            const dim = resolveExprDimension(init);
            varDimensions[varName] = dim;
            allocatedVars[varName] = {
              line,
              dim,
              kind: 'Spread copy [...arr]',
              codeSnippet: getLineText(line)
            };
            const mult = multiplyLoopDims([...activeLoopStack, dim]);
            timeContributions.push({
              term: mult.term,
              rank: mult.rank,
              line,
              reason: `Spread array copy of size ${dim}`
            });
            setHighlight(line, 'allocation', `Array spread copy O(${dim})`);
            evidence.push({
              line,
              category: 'allocation',
              operation: 'Array spread copy [...]',
              codeSnippet: getLineText(line),
              timeImpact: `O(${mult.term})`,
              spaceImpact: `O(${dim})`,
              explanationEn: `Copies ${dim} elements into '${varName}' using spread syntax on line ${line}.`,
              explanationUr: `Line ${line} par spread operator (...) se ${dim} elements copy kiye gaye hain, jo O(${dim}) time aur space leta hai.`
            });
          } else {
            varDimensions[varName] = '1';
          }
        }
      }
    }

    // 3. Dynamic property access guard. Known array indexing remains O(1).
    if (
      node.type === 'MemberExpression' &&
      node.computed &&
      node.property?.type !== 'Literal'
    ) {
      const objectName = node.object?.type === 'Identifier' ? node.object.name : null;
      const isKnownIndexedCollection =
        objectName !== null && varTypes[objectName] === 'array';

      if (!isKnownIndexedCollection) {
        const reason = `Dynamic property access on '${objectName || 'expression'}[...]' detected on line ${line}. The runtime object shape and access cost are not statically known.`;
        manualReviewReasons.push(`Line ${line}: ${reason}`);
        setHighlight(line, 'uncertain', 'Dynamic property access requires manual review');
        evidence.push({
          line,
          category: 'uncertain',
          operation: 'Dynamic Property Access',
          codeSnippet: getLineText(line),
          timeImpact: 'Manual review needed',
          spaceImpact: 'Unknown',
          explanationEn: reason,
          explanationUr: `Line ${line} par runtime key se property access ho rahi hai. Object ki shape clear nahi, is liye manual review zaroori hai.`
        });
      }
    }

    // 4. Loops: ForStatement, ForOfStatement, ForInStatement, WhileStatement, DoWhileStatement
    if (
      node.type === 'ForStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    ) {
      let loopStatus: 'linear' | 'log' | 'constant' | 'uncertain' = 'linear';
      let loopDim = 'n';
      let loopReason = '';

      if (node.type === 'ForStatement') {
        const res = analyzeForStatement(node);
        loopStatus = res.status;
        loopDim = res.dim;
        loopReason = res.reason || '';
      } else if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
        loopStatus = 'linear';
        loopDim = resolveExprDimension(node.right);
      } else {
        const res = analyzeWhileStatement(node);
        loopStatus = res.status;
        loopDim = res.dim;
        loopReason = res.reason || '';
      }

      if (loopStatus === 'uncertain') {
        manualReviewReasons.push(`Line ${line}: ${loopReason}`);
        setHighlight(line, 'uncertain', loopReason);
        evidence.push({
          line,
          category: 'uncertain',
          operation: 'Unverified Loop Bound',
          codeSnippet: getLineText(line),
          timeImpact: 'Manual review needed',
          spaceImpact: 'Unknown',
          explanationEn: `${loopReason} Complexity Coach refuses to guess loop bounds.`,
          explanationUr: `Line ${line} ke loop ki limit clear nahi hai (${loopReason}), is liye andaza nahi lagaya gaya.`
        });
        walkAST(node.body, activeLoopStack, currentFuncName);
        return;
      }

      const nextLoopStack =
        loopStatus === 'constant' ? activeLoopStack : [...activeLoopStack, loopDim];
      const mult = multiplyLoopDims(nextLoopStack);

      timeContributions.push({
        term: mult.term,
        rank: mult.rank,
        line,
        reason:
          loopStatus === 'log'
            ? `Logarithmic loop (${loopDim}) on line ${line}`
            : `Loop iterating over ${loopDim} elements on line ${line}`
      });

      setHighlight(
        line,
        'loop',
        loopStatus === 'log'
          ? `Logarithmic loop: O(${mult.term})`
          : `Loop iteration: O(${mult.term})`
      );

      evidence.push({
        line,
        category: 'loop',
        operation:
          loopStatus === 'log'
            ? 'Halving / Binary Search Loop'
            : activeLoopStack.length > 0
            ? `Nested Loop (depth ${nextLoopStack.length})`
            : 'Linear Loop',
        codeSnippet: getLineText(line),
        timeImpact: `O(${mult.term})`,
        spaceImpact: 'O(1)',
        explanationEn:
          loopStatus === 'log'
            ? `Halves the search range each iteration on line ${line}, running in O(${mult.term}) time.`
            : activeLoopStack.length > 0
            ? `Nested inside an outer loop (${activeLoopStack.join(' × ')}), multiplying iterations to O(${mult.term}) on line ${line}.`
            : `Iterates ${loopDim} times on line ${line}, taking O(${mult.term}) time.`,
        explanationUr:
          loopStatus === 'log'
            ? `Line ${line} par har step mein search range aadhi (half) ho rahi hai, jis se time O(${mult.term}) lagta hai.`
            : activeLoopStack.length > 0
            ? `Line ${line} par nested loop hai jo outer loop ke sath multiply ho kar O(${mult.term}) time banata hai.`
            : `Line ${line} par loop ${loopDim} dafa chalta hai, jis ka time O(${mult.term}) hai.`
      });

      // Traverse loop body with updated loop stack
      walkAST(node.body, nextLoopStack, currentFuncName);
      return;
    }

    // 5. Call Expressions (.sort, .slice, .concat, .map, .filter, .includes, Map/Set ops, Recursion)
    if (node.type === 'CallExpression') {
      const callee = node.callee;

      // Direct identifier call: check for recursion or unknown helper function
      if (callee?.type === 'Identifier') {
        const fnName = callee.name;
        if (fnName === currentFuncName) {
          const reason = `Recursive call to '${fnName}(...)' detected on line ${line}. Recurrence relations require manual analysis.`;
          manualReviewReasons.push(`Line ${line}: ${reason}`);
          setHighlight(line, 'uncertain', `Recursion detected: ${fnName}()`);
          evidence.push({
            line,
            category: 'uncertain',
            operation: `Recursion: ${fnName}()`,
            codeSnippet: getLineText(line),
            timeImpact: 'Manual review needed',
            spaceImpact: 'Manual review needed (Call Stack)',
            explanationEn: reason,
            explanationUr: `Line ${line} par function '${fnName}' khud ko dobara call kar raha hai (Recursion). Iski exact complexity branching factor par depend karti hai.`
          });
        } else if (fnName === 'Array') {
          // Array(n) call without `new`
          const argDim =
            node.arguments?.length > 0 ? resolveExprDimension(node.arguments[0]) : '1';
          setHighlight(line, 'allocation', `Array(${argDim}) allocation`);
        } else if (!SAFE_GLOBAL_CALLS.has(fnName)) {
          const reason = `Call to external or helper function '${fnName}(...)' on line ${line} whose complexity is not statically known.`;
          manualReviewReasons.push(`Line ${line}: ${reason}`);
          setHighlight(line, 'uncertain', `Unknown function call: ${fnName}()`);
          evidence.push({
            line,
            category: 'uncertain',
            operation: `Unknown Call: ${fnName}()`,
            codeSnippet: getLineText(line),
            timeImpact: 'Manual review needed',
            spaceImpact: 'Unknown',
            explanationEn: reason,
            explanationUr: `Line ${line} par '${fnName}()' call ho raha hai jis ka code maujood nahi, is liye manual review zaroori hai.`
          });
        }
      }

      // MemberExpression calls: obj.method(...)
      if (callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
        const method = callee.property.name;
        const objName =
          callee.object?.type === 'Identifier' ? callee.object.name : null;
        const fullCallName = objName ? `${objName}.${method}` : method;
        const objDim = resolveExprDimension(callee.object);

        // Find LHS variable name if assigned (e.g. const realValues = nums1.slice(0, m))
        // Handled via parent context or regex match on line
        const lhsMatch = getLineText(line).match(/^(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=/);
        const assignedVar = lhsMatch ? lhsMatch[1] : null;

        // 4A. .sort()
        if (method === 'sort') {
          const sortDim = normalizeDim(objDim);
          const wrapDim = sortDim.includes('+') ? `(${sortDim})` : sortDim;
          const sortTerm =
            activeLoopStack.length > 0
              ? `${multiplyLoopDims(activeLoopStack).term} * ${wrapDim} log(${sortDim})`
              : `${wrapDim} log(${sortDim})`;

          timeContributions.push({
            term: sortTerm,
            rank: activeLoopStack.length > 0 ? 4.5 : 3,
            line,
            reason: `Sorting '${objName || 'array'}' of size ${sortDim}`
          });

          setHighlight(line, 'sort', `Sorting ${sortDim} items: O(${sortTerm})`);
          evidence.push({
            line,
            category: 'sort',
            operation: `${objName || 'arr'}.sort()`,
            codeSnippet: getLineText(line),
            timeImpact: `O(${sortTerm})`,
            spaceImpact: 'O(1) to O(log n) in-place',
            explanationEn: `${objName || 'Array'}.sort(...) found on line ${line}. Sorting ${sortDim} items takes O(${sortTerm}) time.`,
            explanationUr: `Line ${line} par ${objName || 'array'}.sort(...) mila. ${sortDim} items ko sort karne mein O(${sortTerm}) time lagta hai.`
          });
        }

        // 4B. Array copying / allocation methods: slice, concat, Array.from
        else if (
          method === 'slice' ||
          method === 'concat' ||
          (objName === 'Array' && method === 'from')
        ) {
          let allocDim = objDim;
          if (method === 'slice' && node.arguments?.length >= 2) {
            allocDim = resolveExprDimension(node.arguments[1]);
          } else if (method === 'concat' && node.arguments?.length >= 1) {
            allocDim = addDims(objDim, resolveExprDimension(node.arguments[0]));
          } else if (objName === 'Array' && method === 'from' && node.arguments?.length >= 1) {
            allocDim = resolveExprDimension(node.arguments[0]);
          }
          allocDim = normalizeDim(allocDim);

          if (assignedVar) {
            varDimensions[assignedVar] = allocDim;
            varTypes[assignedVar] = 'array';
            allocatedVars[assignedVar] = {
              line,
              dim: allocDim,
              kind: `.${method}()`,
              codeSnippet: getLineText(line)
            };
          } else {
            allocatedVars[`_anon_${line}`] = {
              line,
              dim: allocDim,
              kind: `.${method}()`,
              codeSnippet: getLineText(line)
            };
          }

          const mult = multiplyLoopDims([...activeLoopStack, allocDim]);
          timeContributions.push({
            term: mult.term,
            rank: mult.rank,
            line,
            reason: `.${method}() copying ${allocDim} elements`
          });

          setHighlight(line, 'allocation', `.${method}() allocates & copies O(${allocDim})`);
          evidence.push({
            line,
            category: 'allocation',
            operation: `${objName || 'arr'}.${method}()`,
            codeSnippet: getLineText(line),
            timeImpact: `O(${mult.term})`,
            spaceImpact: `O(${allocDim})`,
            explanationEn: `'${objName || 'array'}.${method}(...)' on line ${line} copies ${allocDim} elements into a new array (O(${allocDim}) time & extra memory).`,
            explanationUr: `Line ${line} par '${objName || 'array'}.${method}(...)' nayi array banata hai aur ${allocDim} elements copy karta hai, jis se O(${allocDim}) extra memory lagti hai.`
          });
        }

        // 4C. Higher-order iteration methods: map, filter, forEach, reduce, some, every, find
        else if (['map', 'filter', 'forEach', 'reduce', 'some', 'every', 'find'].includes(method)) {
          const iterDim = normalizeDim(objDim);
          const mult = multiplyLoopDims([...activeLoopStack, iterDim]);
          timeContributions.push({
            term: mult.term,
            rank: mult.rank,
            line,
            reason: `.${method}() iterating over ${iterDim} items`
          });

          const allocatesNewArray = method === 'map' || method === 'filter';
          if (allocatesNewArray) {
            const targetKey = assignedVar || `_anon_${line}`;
            varDimensions[targetKey] = iterDim;
            varTypes[targetKey] = 'array';
            allocatedVars[targetKey] = {
              line,
              dim: iterDim,
              kind: `.${method}()`,
              codeSnippet: getLineText(line)
            };
            setHighlight(line, 'allocation', `.${method}() iterates & allocates O(${iterDim})`);
          } else {
            setHighlight(line, 'loop', `.${method}() iterates O(${mult.term})`);
          }

          evidence.push({
            line,
            category: allocatesNewArray ? 'allocation' : 'loop',
            operation: `.${method}()`,
            codeSnippet: getLineText(line),
            timeImpact: `O(${mult.term})`,
            spaceImpact: allocatesNewArray ? `O(${iterDim})` : 'O(1)',
            explanationEn: allocatesNewArray
              ? `.${method}() on line ${line} iterates over ${iterDim} elements and allocates a new array of size O(${iterDim}).`
              : `.${method}() on line ${line} iterates through ${iterDim} elements in O(${mult.term}) time.`,
            explanationUr: allocatesNewArray
              ? `Line ${line} par .${method}() ${iterDim} elements par chalta hai aur O(${iterDim}) size ki nayi array banata hai.`
              : `Line ${line} par .${method}() ${iterDim} elements ko traverse karta hai (Time: O(${mult.term})).`
          });

          // Walk callback body with iterDim pushed to activeLoopStack
          if (node.arguments?.[0]) {
            walkAST(node.arguments[0].body, [...activeLoopStack, iterDim], currentFuncName);
            return;
          }
        }

        // 4D. Linear scan methods inside/outside loops: .includes(), .indexOf()
        else if (method === 'includes' || method === 'indexOf') {
          const scanDim = normalizeDim(objDim);
          const mult = multiplyLoopDims([...activeLoopStack, scanDim]);
          timeContributions.push({
            term: mult.term,
            rank: mult.rank,
            line,
            reason: `.${method}() linear scan over ${scanDim} elements`
          });

          setHighlight(line, 'loop', `.${method}() linear scan: O(${mult.term})`);
          evidence.push({
            line,
            category: 'loop',
            operation: `.${method}()`,
            codeSnippet: getLineText(line),
            timeImpact: `O(${mult.term})`,
            spaceImpact: 'O(1)',
            explanationEn:
              activeLoopStack.length > 0
                ? `.${method}() on line ${line} performs an O(${scanDim}) linear scan inside a loop (${activeLoopStack.join(' × ')}), escalating time to O(${mult.term}).`
                : `.${method}() on line ${line} scans up to ${scanDim} elements in O(${scanDim}) time.`,
            explanationUr:
              activeLoopStack.length > 0
                ? `Line ${line} par .${method}() loop ke andar linear search kar raha hai, jis se total time barh kar O(${mult.term}) ho jata hai.`
                : `Line ${line} par .${method}() array mein linear search karta hai jo O(${scanDim}) time leta hai.`
          });
        }

        // 4E. Map / Set operations: .set, .add, .get, .has
        else if (['set', 'add', 'get', 'has'].includes(method)) {
          const isMutating = method === 'set' || method === 'add';
          const loopGrowthDim =
            isMutating && activeLoopStack.length > 0
              ? multiplyLoopDims(activeLoopStack).term
              : '1';

          if (isMutating && activeLoopStack.length > 0 && objName) {
            varDimensions[objName] = loopGrowthDim;
            allocatedVars[objName] = {
              line,
              dim: loopGrowthDim,
              kind: `${objName}.${method}() inside loop`,
              codeSnippet: getLineText(line)
            };
          }

          setHighlight(
            line,
            'map_set',
            isMutating && activeLoopStack.length > 0
              ? `${fullCallName}() — O(1) avg time, grows space to O(${loopGrowthDim})`
              : `${fullCallName}() — O(1) average lookup`
          );

          evidence.push({
            line,
            category: 'map_set',
            operation: `${fullCallName}()`,
            codeSnippet: getLineText(line),
            timeImpact: 'O(1) avg',
            spaceImpact:
              isMutating && activeLoopStack.length > 0 ? `Grows to O(${loopGrowthDim})` : 'O(1)',
            explanationEn:
              isMutating && activeLoopStack.length > 0
                ? `'${fullCallName}(...)' on line ${line} runs in O(1) average time per step, but stores up to O(${loopGrowthDim}) entries across the loop.`
                : `'${fullCallName}(...)' on line ${line} performs a hash table operation in O(1) average time.`,
            explanationUr:
              isMutating && activeLoopStack.length > 0
                ? `Line ${line} par '${fullCallName}(...)' har step par O(1) time leta hai, magar loop mein chalne ki wajah se O(${loopGrowthDim}) memory use karta hai.`
                : `Line ${line} par '${fullCallName}(...)' hash lookup O(1) average time mein hota hai.`
          });
        }

        // 4F. Array .push() inside a loop
        else if (method === 'push' && activeLoopStack.length > 0 && objName) {
          const growthDim = multiplyLoopDims(activeLoopStack).term;
          varDimensions[objName] = growthDim;
          allocatedVars[objName] = {
            line,
            dim: growthDim,
            kind: `${objName}.push() inside loop`,
            codeSnippet: getLineText(line)
          };
          setHighlight(line, 'allocation', `${objName}.push() grows array to O(${growthDim})`);
          evidence.push({
            line,
            category: 'allocation',
            operation: `${objName}.push()`,
            codeSnippet: getLineText(line),
            timeImpact: 'O(1) amortized',
            spaceImpact: `Grows to O(${growthDim})`,
            explanationEn: `Pushing to '${objName}' inside a loop on line ${line} grows its memory footprint to O(${growthDim}).`,
            explanationUr: `Line ${line} par loop ke andar '${objName}.push()' karne se array ka size O(${growthDim}) tak barh jata hai.`
          });
        }

        // 4G. .fill() on an array allocation
        else if (method === 'fill') {
          // If chained on new Array(n).fill(1), capture dimension
          if (callee.object?.type === 'NewExpression' || callee.object?.type === 'CallExpression') {
            const argDim =
              callee.object.arguments?.length > 0
                ? resolveExprDimension(callee.object.arguments[0])
                : 'n';
            if (assignedVar) {
              varDimensions[assignedVar] = argDim;
              varTypes[assignedVar] = 'array';
              allocatedVars[assignedVar] = {
                line,
                dim: argDim,
                kind: `new Array(${argDim}).fill()`,
                codeSnippet: getLineText(line)
              };
            }
            const mult = multiplyLoopDims([...activeLoopStack, argDim]);
            timeContributions.push({
              term: mult.term,
              rank: mult.rank,
              line,
              reason: `Filling array of size ${argDim}`
            });
            setHighlight(line, 'allocation', `Allocates & fills array of size O(${argDim})`);
            evidence.push({
              line,
              category: 'allocation',
              operation: `Array(${argDim}).fill()`,
              codeSnippet: getLineText(line),
              timeImpact: `O(${mult.term})`,
              spaceImpact: `O(${argDim})`,
              explanationEn: `Allocates and initializes '${assignedVar || 'array'}' of size ${argDim} on line ${line}.`,
              explanationUr: `Line ${line} par ${argDim} size ki array bana kar fill ki gayi hai.`
            });
            return; // Avoid double-counting inner NewExpression
          }
        }
        else if (!SAFE_GLOBAL_CALLS.has(fullCallName)) {
          const reason = `Call to external or unsupported member function '${fullCallName}(...)' on line ${line} whose complexity is not statically known.`;
          manualReviewReasons.push(`Line ${line}: ${reason}`);
          setHighlight(line, 'uncertain', `Unknown member call: ${fullCallName}()`);
          evidence.push({
            line,
            category: 'uncertain',
            operation: `Unknown Call: ${fullCallName}()`,
            codeSnippet: getLineText(line),
            timeImpact: 'Manual review needed',
            spaceImpact: 'Unknown',
            explanationEn: reason,
            explanationUr: `Line ${line} par '${fullCallName}()' ka internal code available nahi, is liye manual review zaroori hai.`
          });
        }
      }
    }

    // Default traversal of child AST nodes
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c) => walkAST(c, activeLoopStack, currentFuncName));
      } else if (child && typeof child === 'object') {
        walkAST(child, activeLoopStack, currentFuncName);
      }
    }
  }

  walkAST(ast, [], null);

  // Deduplicate evidence entries on the same line + operation
  const uniqueEvidence: CodeEvidence[] = [];
  const seenKey = new Set<string>();
  for (const ev of evidence) {
    const key = `${ev.line}:${ev.operation}`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      uniqueEvidence.push(ev);
    }
  }
  uniqueEvidence.sort((a, b) => a.line - b.line);

  // Check if code is empty or has no executable statements
  const hasExecutableCode = ast.body && ast.body.length > 0;
  if (!hasExecutableCode) {
    return {
      timeComplexity: 'Manual review needed',
      auxSpaceComplexity: 'Manual review needed',
      totalSpaceComplexity: 'Manual review needed',
      confidence: 'Manual review needed',
      manualReviewReasons: ['No executable JavaScript statements found in the editor.'],
      plainEnglishSummary: 'Paste a JavaScript or TypeScript function to analyze its complexity.',
      whyEnglish: ['No AST statements were detected.'],
      whyRomanUrdu: ['Editor mein koi code maujood nahi hai.'],
      evidence: [],
      lineHighlights: {},
      assumptions: [],
      detectedDimensions: {}
    };
  }

  // If any uncertain construct was found, strictly return "Manual review needed"
  if (manualReviewReasons.length > 0) {
    return {
      timeComplexity: 'Manual review needed',
      auxSpaceComplexity: 'Manual review needed',
      totalSpaceComplexity: 'Manual review needed',
      confidence: 'Manual review needed',
      manualReviewReasons,
      plainEnglishSummary:
        'Complexity Coach detected code patterns (such as recursion, unknown helper calls, or non-standard loop bounds) that cannot be safely guaranteed without guessing.',
      whyEnglish: [
        ...manualReviewReasons,
        'Following strict non-guessing rules, no Big-O label is assigned when static proof is incomplete.'
      ],
      whyRomanUrdu: [
        ...uniqueEvidence.map((e) => e.explanationUr),
        'Complexity Coach tukka (guess) nahi lagata. Jahan recursion ya unknown function call ho, wahan Manual Review dikhaya jata hai.'
      ],
      evidence: uniqueEvidence,
      lineHighlights,
      assumptions: [
        'Static analyzer refuses to guess O(1) or invent loop bounds when dynamic calls or recursion are present.'
      ],
      detectedDimensions: varDimensions
    };
  }

  // Compute Final Time Complexity
  const finalTime = combineTimeTerms(timeContributions);

  // Compute Auxiliary Space vs Total Space (including output)
  const auxDims: string[] = [];
  const totalDims: string[] = [];
  const outputExcludedVars: string[] = [];

  for (const [varName, info] of Object.entries(allocatedVars)) {
    totalDims.push(info.dim);
    // If this variable is directly returned AND is an output container (like `res` in Product Except Self)
    // Note: if an intermediate array was ALSO allocated (like `realValues` in Merge Sorted Array), auxDims still gets `realValues`!
    if (returnedIdentifiers.has(varName) && Object.keys(allocatedVars).length === 1) {
      outputExcludedVars.push(varName);
    } else if (
      returnedIdentifiers.has(varName) &&
      varTypes[varName] === 'array' &&
      !info.kind.includes('concat') &&
      !info.kind.includes('slice')
    ) {
      outputExcludedVars.push(varName);
    } else {
      auxDims.push(info.dim);
    }
  }

  const finalAuxSpace = combineSpaceTerms(auxDims);
  const finalTotalSpace = combineSpaceTerms(totalDims);

  // Build "Why?" Explanations in Simple English & Roman Urdu
  const whyEnglish: string[] = uniqueEvidence.map((e) => e.explanationEn);
  const whyRomanUrdu: string[] = uniqueEvidence.map((e) => e.explanationUr);

  if (outputExcludedVars.length > 0) {
    const outVar = outputExcludedVars.join(', ');
    whyEnglish.push(
      `Output array '${outVar}' is the returned result, so Auxiliary Space is ${finalAuxSpace} while Space Including Output is ${finalTotalSpace}.`
    );
    whyRomanUrdu.push(
      `'${outVar}' array final answer return karne ke liye use hui hai, is liye Auxiliary Space ${finalAuxSpace} hai aur Output samait Total Space ${finalTotalSpace} hai.`
    );
  } else if (finalAuxSpace === 'O(1)') {
    whyEnglish.push(
      'Only a fixed number of scalar variables (pointers/accumulators) are allocated, so extra memory is O(1).'
    );
    whyRomanUrdu.push(
      'Koi nayi dynamic array ya hash map nahi banaya gaya, sirf simple variables use hue hain, is liye extra memory O(1) hai.'
    );
  }

  // Plain-English Summary
  const plainEnglishSummary =
    uniqueEvidence.length > 0
      ? `Detected ${uniqueEvidence.length} key operation(s) across the AST. Dominant time complexity is ${finalTime}, with ${finalAuxSpace} auxiliary space (${finalTotalSpace} including returned output).`
      : `Bounded constant-time operations only. Time is O(1) and extra space is O(1).`;

  // Assumptions list
  const assumptions: string[] = [
    'Input sizes are represented symbolically based on detected parameters (e.g., n for single array, m and n for two distinct inputs).',
    'JavaScript Map and Set operations (.get, .set, .has, .add) are treated as O(1) average-case hash table operations.',
    'Built-in Array.prototype.sort() is modeled as O(k log k) comparisons where k is the length of the array being sorted.'
  ];
  if (outputExcludedVars.length > 0) {
    assumptions.push(
      `The returned array (${outputExcludedVars.join(', ')}) is excluded from Auxiliary Space following standard algorithm interview conventions.`
    );
  }

  return {
    timeComplexity: finalTime,
    auxSpaceComplexity: finalAuxSpace,
    totalSpaceComplexity: finalTotalSpace,
    confidence: 'High',
    manualReviewReasons: [],
    plainEnglishSummary,
    whyEnglish,
    whyRomanUrdu,
    evidence: uniqueEvidence,
    lineHighlights,
    assumptions,
    detectedDimensions: varDimensions
  };
}

// ============================================================================
// UI STYLING HELPERS
// ============================================================================

const CATEGORY_META: Record<
  HighlightCategory,
  {
    label: string;
    dotClass: string;
    lineBgClass: string;
    borderClass: string;
    badgeClass: string;
  }
> = {
  loop: {
    label: 'Loop (Yellow)',
    dotClass: 'bg-amber-400',
    lineBgClass: 'bg-amber-500/15',
    borderClass: 'border-l-4 border-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  sort: {
    label: 'Sort (Purple)',
    dotClass: 'bg-purple-400',
    lineBgClass: 'bg-purple-500/20',
    borderClass: 'border-l-4 border-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  map_set: {
    label: 'Map / Set (Green)',
    dotClass: 'bg-emerald-400',
    lineBgClass: 'bg-emerald-500/15',
    borderClass: 'border-l-4 border-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  allocation: {
    label: 'Copy / Allocation (Orange)',
    dotClass: 'bg-orange-400',
    lineBgClass: 'bg-orange-500/15',
    borderClass: 'border-l-4 border-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },
  uncertain: {
    label: 'Manual Review (Red)',
    dotClass: 'bg-rose-500',
    lineBgClass: 'bg-rose-500/25',
    borderClass: 'border-l-4 border-rose-500',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }
};

// ============================================================================
// MAIN REACT COMPONENT
// ============================================================================

// Counts real tool use in Google Analytics through the site-wide style.js,
// which only sends it after the visitor accepts analytics. The analysed code
// is never sent; only the action and the confidence level are.
type SiteAnalytics = { track: (eventName: string, parameters?: Record<string, string>) => void };

function trackToolUse(action: string, confidence: ConfidenceLevel) {
  const analytics = (window as Window & { siteAnalytics?: SiteAnalytics }).siteAnalytics;
  if (!analytics || typeof analytics.track !== 'function') return;
  analytics.track('tool_used', {
    tool_name: 'complexity_coach',
    tool_action: action,
    tool_result: confidence.toLowerCase().replace(/\s+/g, '_'),
  });
}

export function App() {
  const [code, setCode] = useState<string>(BUILT_IN_TESTS[1].code); // Default to Merge Sorted Array or Two Sum
  const [activePresetId, setActivePresetId] = useState<string>(BUILT_IN_TESTS[1].id);
  const [result, setResult] = useState<AnalysisResult>(() =>
    analyzeJavaScriptComplexity(BUILT_IN_TESTS[1].code)
  );
  const [whyExpanded, setWhyExpanded] = useState<boolean>(true);
  const [whyLanguage, setWhyLanguage] = useState<'english' | 'urdu'>('english');
  const [evidenceExpanded, setEvidenceExpanded] = useState<boolean>(false);
  const [assumptionsExpanded, setAssumptionsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analyzer' | 'testsuite'>('analyzer');
  const [copied, setCopied] = useState<boolean>(false);

  // Run analysis when user clicks "Analyze Complexity"
  const handleAnalyze = () => {
    const res = analyzeJavaScriptComplexity(code);
    setResult(res);
    trackToolUse('analyze', res.confidence);
  };

  // Load a preset test case and immediately analyze
  const handleSelectPreset = (test: TestCase) => {
    const res = analyzeJavaScriptComplexity(test.code);
    setActivePresetId(test.id);
    setCode(test.code);
    setResult(res);
    trackToolUse('preset', res.confidence);
    setActiveTab('analyzer');
  };

  // Automatically run all built-in test cases for the verification suite
  const testSuiteResults = useMemo(() => {
    return BUILT_IN_TESTS.map((test) => {
      const actual = analyzeJavaScriptComplexity(test.code);
      const timePass = actual.timeComplexity === test.expectedTime;
      const auxPass = actual.auxSpaceComplexity === test.expectedAuxSpace;
      const totalPass = test.expectedTotalSpace
        ? actual.totalSpaceComplexity === test.expectedTotalSpace
        : true;
      const passed = timePass && auxPass && totalPass;
      return {
        test,
        actual,
        passed
      };
    });
  }, []);

  const allTestsPassed = testSuiteResults.every((r) => r.passed);
  const codeLines = code.split('\n');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        backgroundColor: '#050B14',
        backgroundImage:
          'radial-gradient(circle at 18% 12%, rgba(20, 184, 166, 0.14), transparent 42%), radial-gradient(circle at 85% 22%, rgba(6, 182, 212, 0.12), transparent 48%), radial-gradient(circle at 50% 85%, rgba(20, 184, 166, 0.08), transparent 55%)'
      }}
      className="min-h-screen overflow-x-hidden text-[#F8FAFC] flex flex-col selection:bg-teal-500/30 selection:text-teal-200"
    >
      {/* Tool identity and view controls below the shared site header */}
      <section className="pt-32 md:pt-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              style={{
                background: 'linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)',
                boxShadow: '0 0 22px rgba(20, 184, 166, 0.38)'
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
            >
              <Cpu className="w-5 h-5 text-[#041019] stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#F8FAFC]">
                  Complexity{' '}
                  <span
                    style={{
                      backgroundImage: 'linear-gradient(90deg, #2DD4BF, #38BDF8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Coach
                  </span>
                </h1>
              </div>
              <p className="text-xs text-[#94A3B8] break-words">
                JavaScript and common TypeScript function syntax
              </p>
            </div>
          </div>

          {/* Navigation & Test Suite Status */}
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <button
              onClick={() => setActiveTab('analyzer')}
              style={
                activeTab === 'analyzer'
                  ? {
                      background: 'linear-gradient(90deg, #14B8A6, #06B6D4)',
                      boxShadow: '0 0 20px rgba(20, 184, 166, 0.32)'
                    }
                  : {
                      backgroundColor: 'rgba(13, 25, 43, 0.78)',
                      borderColor: 'rgba(45, 212, 191, 0.18)'
                    }
              }
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'analyzer'
                  ? 'text-[#04121C]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] border hover:border-teal-400/40'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code Analyzer
            </button>
            <button
              onClick={() => setActiveTab('testsuite')}
              style={
                activeTab === 'testsuite'
                  ? {
                      background: 'linear-gradient(90deg, #14B8A6, #06B6D4)',
                      boxShadow: '0 0 20px rgba(20, 184, 166, 0.32)'
                    }
                  : {
                      backgroundColor: 'rgba(13, 25, 43, 0.78)',
                      borderColor: 'rgba(45, 212, 191, 0.18)'
                    }
              }
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'testsuite'
                  ? 'text-[#04121C]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] border hover:border-teal-400/40'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>Tests</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  activeTab === 'testsuite'
                    ? 'bg-[#04121C]/20 text-[#04121C]'
                    : allTestsPassed
                    ? 'bg-teal-500/15 text-[#2DD4BF] border border-teal-400/30'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {testSuiteResults.filter((t) => t.passed).length}/{testSuiteResults.length} PASS
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Honest static-estimate notice */}
      <div
        style={{
          backgroundColor: 'rgba(10, 22, 40, 0.75)',
          borderColor: 'rgba(45, 212, 191, 0.12)'
        }}
        className="border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              style={{
                backgroundColor: 'rgba(20, 184, 166, 0.12)',
                borderColor: 'rgba(45, 212, 191, 0.3)'
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[#2DD4BF] border"
            >
              <Info className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
              Static estimate, not a mathematical guarantee.
            </span>
            <span className="text-[#94A3B8]">
              Unclear code is marked for manual review.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Code highlight legend">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#64748B]">
              Line colors
            </span>
            {Object.values(CATEGORY_META).map((meta) => (
              <span key={meta.label} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[#94A3B8]">
                <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                {meta.label.replace(/ \([^)]+\)$/, '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'testsuite' ? (
          /* ================================================================
             BUILT-IN TEST SUITE VIEW
             ================================================================ */
          <div className="space-y-6">
            <div
              style={{
                backgroundColor: 'rgba(13, 25, 43, 0.78)',
                borderColor: 'rgba(45, 212, 191, 0.18)',
                backdropFilter: 'blur(12px)'
              }}
              className="border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl"
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#2DD4BF] mb-1">
                  VERIFICATION SUITE
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  Automated{' '}
                  <span
                    style={{
                      backgroundImage: 'linear-gradient(90deg, #2DD4BF, #38BDF8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Interview Benchmark Tests
                  </span>
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
                  Verifies all required benchmark cases (Two Sum, Merge Sorted Array, Product Except
                  Self, Nested Loops, Binary Search, and Recursion Guard). Click any test card to
                  load and inspect its line-by-line AST breakdown.
                </p>
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(20, 184, 166, 0.12)',
                  borderColor: 'rgba(45, 212, 191, 0.35)',
                  boxShadow: '0 0 20px rgba(20, 184, 166, 0.18)'
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[#2DD4BF] text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                {testSuiteResults.filter((r) => r.passed).length} of {testSuiteResults.length} Tests
                Passing
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {testSuiteResults.map(({ test, actual, passed }) => (
                <div
                  key={test.id}
                  style={{
                    backgroundColor: 'rgba(13, 25, 43, 0.78)',
                    borderColor: 'rgba(45, 212, 191, 0.16)',
                    backdropFilter: 'blur(12px)'
                  }}
                  className="border hover:border-teal-400/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#F8FAFC]">{test.title}</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{test.subtitle}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 ${
                          passed
                            ? 'bg-teal-500/15 text-[#2DD4BF] border border-teal-400/35'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {passed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" /> FAIL
                          </>
                        )}
                      </span>
                    </div>

                    <pre
                      style={{
                        backgroundColor: '#050B14',
                        borderColor: 'rgba(45, 212, 191, 0.12)'
                      }}
                      className="mt-3.5 p-3 rounded-xl border text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36"
                    >
                      {test.code}
                    </pre>

                    <div className="mt-4 grid grid-cols-3 gap-2.5 text-xs">
                      <div
                        style={{
                          backgroundColor: 'rgba(7, 16, 30, 0.85)',
                          borderColor: 'rgba(45, 212, 191, 0.14)'
                        }}
                        className="p-2.5 rounded-xl border"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                          Time
                        </div>
                        <div className="font-mono font-bold text-[#2DD4BF] mt-0.5">
                          {actual.timeComplexity}
                        </div>
                        <div className="text-[10px] text-[#64748B]">Exp: {test.expectedTime}</div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'rgba(7, 16, 30, 0.85)',
                          borderColor: 'rgba(45, 212, 191, 0.14)'
                        }}
                        className="p-2.5 rounded-xl border"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                          Aux Space
                        </div>
                        <div className="font-mono font-bold text-[#38BDF8] mt-0.5">
                          {actual.auxSpaceComplexity}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          Exp: {test.expectedAuxSpace}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'rgba(7, 16, 30, 0.85)',
                          borderColor: 'rgba(45, 212, 191, 0.14)'
                        }}
                        className="p-2.5 rounded-xl border"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                          Incl. Output
                        </div>
                        <div className="font-mono font-bold text-amber-300 mt-0.5">
                          {actual.totalSpaceComplexity}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          Exp: {test.expectedTotalSpace || test.expectedAuxSpace}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPreset(test)}
                    style={{
                      backgroundColor: 'rgba(20, 184, 166, 0.12)',
                      borderColor: 'rgba(45, 212, 191, 0.3)'
                    }}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl hover:bg-teal-500/20 border text-[#2DD4BF] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Load & Inspect in Editor
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================================================================
             MAIN ANALYZER VIEW (EDITOR + RESULTS PANEL)
             ================================================================ */
          <div className="space-y-6">
            {/* Compact analyzer intro and example selector */}
            <div
              style={{
                backgroundColor: 'rgba(13, 25, 43, 0.72)',
                borderColor: 'rgba(45, 212, 191, 0.16)',
                backdropFilter: 'blur(12px)'
              }}
              className="border rounded-2xl p-4 flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#F8FAFC] break-words">
                  Analyze your code
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                  Paste JavaScript or choose an example. The result shows what the analyzer found and where.
                </p>
              </div>

              <label className="flex w-full flex-col gap-1.5 sm:w-72">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Try an example
                </span>
                <select
                  value={activePresetId}
                  onChange={(event) => {
                    const selected = BUILT_IN_TESTS.find((test) => test.id === event.target.value);
                    if (selected) handleSelectPreset(selected);
                  }}
                  style={{
                    backgroundColor: 'rgba(7, 16, 30, 0.95)',
                    borderColor: 'rgba(45, 212, 191, 0.28)'
                  }}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm font-semibold text-[#F8FAFC] outline-none focus:border-[#2DD4BF]"
                  aria-label="Choose a code example"
                >
                  <option value="" disabled>Choose an example</option>
                  {BUILT_IN_TESTS.map((test) => (
                    <option key={test.id} value={test.id}>{test.title}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: CODE EDITOR (7 cols) */}
              <div className="min-w-0 lg:col-span-7 flex flex-col gap-4">
                <div
                  style={{
                    backgroundColor: 'rgba(13, 25, 43, 0.78)',
                    borderColor: 'rgba(45, 212, 191, 0.18)',
                    backdropFilter: 'blur(12px)'
                  }}
                  className="border rounded-2xl overflow-hidden shadow-2xl"
                >
                  {/* Editor Top Bar */}
                  <div
                    style={{
                      backgroundColor: 'rgba(7, 16, 30, 0.9)',
                      borderColor: 'rgba(45, 212, 191, 0.14)'
                    }}
                    className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-400/80" />
                      </div>
                      <FileCode className="w-4 h-4 text-[#2DD4BF] ml-1" />
                      <span className="text-xs font-bold text-[#F8FAFC]">
                        interviewSolution.js
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        ({codeLines.length} lines)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyCode}
                        style={{
                          backgroundColor: 'rgba(13, 25, 43, 0.9)',
                          borderColor: 'rgba(45, 212, 191, 0.18)'
                        }}
                        className="px-2.5 py-1.5 rounded-lg border hover:border-teal-400/40 text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy code"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />
                            <span className="text-[#2DD4BF]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setCode('');
                          setActivePresetId('');
                          setResult(analyzeJavaScriptComplexity(''));
                        }}
                        style={{
                          backgroundColor: 'rgba(13, 25, 43, 0.9)',
                          borderColor: 'rgba(45, 212, 191, 0.18)'
                        }}
                        className="px-2.5 py-1.5 rounded-lg border hover:border-teal-400/40 text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Clear editor"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                      <button
                        onClick={handleAnalyze}
                        style={{
                          background: 'linear-gradient(90deg, #14B8A6 0%, #2DD4BF 50%, #06B6D4 100%)',
                          boxShadow: '0 0 24px rgba(20, 184, 166, 0.38)'
                        }}
                        className="px-4 py-1.5 rounded-lg text-[#04121C] font-extrabold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Analyze Complexity
                      </button>
                    </div>
                  </div>

                  {/* Split Interactive Editor + Line Highlight Gutter */}
                  <div
                    style={{ backgroundColor: '#050B14' }}
                    className="relative font-mono text-xs sm:text-[13px] leading-6 min-h-[320px]"
                  >
                    {/* Underlying Highlight Backdrop */}
                    <div className="pointer-events-none select-none py-4" aria-hidden="true">
                      {codeLines.map((lineText, idx) => {
                        const lineNo = idx + 1;
                        const hl = result.lineHighlights[lineNo];
                        const meta = hl ? CATEGORY_META[hl.category] : null;
                        return (
                          <div
                            key={lineNo}
                            className={`flex items-center px-3 min-h-[24px] ${
                              meta
                                ? `${meta.lineBgClass} ${meta.borderClass}`
                                : 'border-l-4 border-transparent'
                            }`}
                          >
                            <span className="w-8 text-right pr-3 text-[#64748B] select-none shrink-0">
                              {lineNo}
                            </span>
                            <span className="whitespace-pre text-transparent overflow-hidden">
                              {lineText || ' '}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Editable Textarea Overlaid Precisely */}
                    <textarea
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setResult(analyzeJavaScriptComplexity(e.target.value));
                      }}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      placeholder="// Paste JavaScript or common TypeScript function syntax here..."
                      className="absolute inset-0 w-full h-full py-4 pl-12 pr-4 bg-transparent text-[#F8FAFC] caret-[#2DD4BF] font-mono text-xs sm:text-[13px] leading-6 resize-none focus:outline-none overflow-x-auto"
                    />
                  </div>

                </div>
              </div>

              {/* RIGHT COLUMN: COMPLEXITY RESULTS PANEL (5 cols) */}
              <div className="min-w-0 lg:col-span-5 flex flex-col gap-4">
                {/* Top Metric Cards */}
                <div
                  style={{
                    backgroundColor: 'rgba(13, 25, 43, 0.78)',
                    borderColor: 'rgba(45, 212, 191, 0.18)',
                    backdropFilter: 'blur(12px)'
                  }}
                  className="border rounded-2xl p-5 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#2DD4BF]" />
                      Complexity{' '}
                      <span
                        style={{
                          backgroundImage: 'linear-gradient(90deg, #2DD4BF, #38BDF8)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        Report
                      </span>
                    </h2>

                    {/* Confidence Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                        result.confidence === 'High'
                          ? 'bg-teal-500/15 text-[#2DD4BF] border-teal-400/35'
                          : result.confidence === 'Medium'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {result.confidence === 'High' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      )}
                      Confidence: {result.confidence}
                    </span>
                  </div>

                  {/* Big-O Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Time Complexity */}
                    <div
                      style={{
                        backgroundColor: 'rgba(5, 11, 20, 0.85)',
                        borderColor: 'rgba(45, 212, 191, 0.2)'
                      }}
                      className="p-3.5 rounded-xl border flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                        <span className="font-semibold">Time</span>
                        <Cpu className="w-3.5 h-3.5 text-[#2DD4BF]" />
                      </div>
                      <div
                        className={`mt-2 font-mono font-extrabold tracking-tight ${
                          result.timeComplexity === 'Manual review needed'
                            ? 'text-xs text-rose-400'
                            : 'text-lg text-[#2DD4BF]'
                        }`}
                      >
                        {result.timeComplexity}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">Dominant growth</div>
                    </div>

                    {/* Auxiliary Space Complexity */}
                    <div
                      style={{
                        backgroundColor: 'rgba(5, 11, 20, 0.85)',
                        borderColor: 'rgba(45, 212, 191, 0.2)'
                      }}
                      className="p-3.5 rounded-xl border flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                        <span className="font-semibold">Aux Space</span>
                        <Database className="w-3.5 h-3.5 text-[#38BDF8]" />
                      </div>
                      <div
                        className={`mt-2 font-mono font-extrabold tracking-tight ${
                          result.auxSpaceComplexity === 'Manual review needed'
                            ? 'text-xs text-rose-400'
                            : 'text-lg text-[#38BDF8]'
                        }`}
                      >
                        {result.auxSpaceComplexity}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        Excludes returned output
                      </div>
                    </div>

                    {/* Space Including Output */}
                    <div
                      style={{
                        backgroundColor: 'rgba(5, 11, 20, 0.85)',
                        borderColor: 'rgba(45, 212, 191, 0.2)'
                      }}
                      className="p-3.5 rounded-xl border flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                        <span className="font-semibold">Incl. Output</span>
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div
                        className={`mt-2 font-mono font-extrabold tracking-tight ${
                          result.totalSpaceComplexity === 'Manual review needed'
                            ? 'text-xs text-rose-400'
                            : 'text-lg text-amber-300'
                        }`}
                      >
                        {result.totalSpaceComplexity}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        Total allocated memory
                      </div>
                    </div>
                  </div>

                  {/* Manual Review Alert Box (if triggered) */}
                  {result.manualReviewReasons.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-200 text-xs space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-rose-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Manual Review Required — Refusing to Guess
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-rose-200/90">
                        {result.manualReviewReasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concise result summary */}
                  <div
                    style={{
                      backgroundColor: 'rgba(5, 11, 20, 0.65)',
                      borderColor: 'rgba(45, 212, 191, 0.14)'
                    }}
                    className="p-3.5 rounded-xl border text-xs text-[#94A3B8] leading-relaxed"
                  >
                    <span className="font-bold text-[#F8FAFC] block mb-1">Summary</span>
                    {result.plainEnglishSummary}
                  </div>

                  {/* Expandable explanation with one language at a time */}
                  <div
                    style={{
                      backgroundColor: 'rgba(20, 184, 166, 0.06)',
                      borderColor: 'rgba(45, 212, 191, 0.28)'
                    }}
                    className="rounded-xl border overflow-hidden"
                  >
                    <button
                      onClick={() => setWhyExpanded(!whyExpanded)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-teal-500/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#2DD4BF]" />
                        <span className="text-xs font-bold text-[#F8FAFC]">Why this result?</span>
                      </div>
                      {whyExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#2DD4BF]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#2DD4BF]" />
                      )}
                    </button>

                    {whyExpanded && (
                      <div
                        style={{ borderColor: 'rgba(45, 212, 191, 0.18)' }}
                        className="px-4 pb-4 pt-3 space-y-3 text-xs border-t"
                      >
                        <div className="inline-flex rounded-lg border border-teal-400/20 bg-[#050B14] p-1">
                          <button
                            onClick={() => setWhyLanguage('english')}
                            className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${whyLanguage === 'english' ? 'bg-[#14B8A6] text-[#04121C]' : 'text-[#94A3B8] hover:text-white'}`}
                          >
                            Simple English
                          </button>
                          <button
                            onClick={() => setWhyLanguage('urdu')}
                            className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${whyLanguage === 'urdu' ? 'bg-[#14B8A6] text-[#04121C]' : 'text-[#94A3B8] hover:text-white'}`}
                          >
                            Roman Urdu
                          </button>
                        </div>
                        <ul className="space-y-1.5 text-[#F8FAFC] list-disc list-inside">
                          {(whyLanguage === 'english' ? result.whyEnglish : result.whyRomanUrdu).map((item, idx) => (
                            <li key={idx} className="leading-relaxed">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Exact Code Evidence List */}
                <div
                  style={{
                    backgroundColor: 'rgba(13, 25, 43, 0.78)',
                    borderColor: 'rgba(45, 212, 191, 0.18)',
                    backdropFilter: 'blur(12px)'
                  }}
                  className="border rounded-2xl shadow-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setEvidenceExpanded(!evidenceExpanded)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-teal-500/5 transition-colors"
                  >
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#F8FAFC]">
                      Exact Code{' '}
                      <span className="text-[#2DD4BF]">Evidence ({result.evidence.length})</span>
                    </h3>
                    {evidenceExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                    )}
                  </button>

                  {evidenceExpanded && (
                    <div className="border-t border-teal-400/15 p-4">
                  {result.evidence.length === 0 ? (
                    <div
                      style={{ borderColor: 'rgba(45, 212, 191, 0.16)' }}
                      className="text-xs text-[#94A3B8] py-4 text-center border border-dashed rounded-xl"
                    >
                      No loops, allocations, or dynamic operations detected (O(1) constant steps).
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {result.evidence.map((ev, idx) => {
                        const meta = CATEGORY_META[ev.category];
                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: 'rgba(5, 11, 20, 0.85)',
                              borderColor: 'rgba(45, 212, 191, 0.15)'
                            }}
                            className="p-3 rounded-xl border space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    backgroundColor: 'rgba(20, 184, 166, 0.14)',
                                    borderColor: 'rgba(45, 212, 191, 0.3)'
                                  }}
                                  className="px-2 py-0.5 rounded text-[#2DD4BF] border font-mono text-[11px] font-bold"
                                >
                                  Line {ev.line}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${meta.badgeClass}`}
                                >
                                  {ev.operation}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-mono">
                                <span className="text-[#2DD4BF] font-bold">
                                  T: {ev.timeImpact}
                                </span>
                                <span className="text-[#64748B]">|</span>
                                <span className="text-[#38BDF8] font-bold">
                                  S: {ev.spaceImpact}
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                backgroundColor: '#050B14',
                                borderColor: 'rgba(45, 212, 191, 0.12)'
                              }}
                              className="font-mono text-[11px] text-slate-200 px-2.5 py-1 rounded border truncate"
                            >
                              {ev.codeSnippet}
                            </div>

                            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                              {ev.explanationEn}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                    </div>
                  )}
                </div>

                {/* Assumptions & Symbolic Dimensions Box */}
                {result.assumptions.length > 0 && (
                  <div
                    style={{
                      backgroundColor: 'rgba(13, 25, 43, 0.65)',
                      borderColor: 'rgba(45, 212, 191, 0.15)'
                    }}
                    className="border rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => setAssumptionsExpanded(!assumptionsExpanded)}
                      className="w-full px-4 py-3.5 text-xs font-bold text-[#F8FAFC] flex items-center justify-between gap-3 text-left hover:bg-teal-500/5 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                        Analysis assumptions ({result.assumptions.length})
                      </span>
                      {assumptionsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                      )}
                    </button>
                    {assumptionsExpanded && (
                      <ul className="border-t border-teal-400/15 px-4 py-3 text-[11px] text-[#94A3B8] space-y-1.5 list-disc list-inside">
                        {result.assumptions.map((assump, i) => (
                          <li key={i}>{assump}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <section
        id="contact"
        aria-labelledby="complexity-contact-title"
        className="border-t border-teal-400/15 bg-[#0B1729] px-4 sm:px-6 py-14 sm:py-20"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] items-end gap-6 lg:gap-12 mb-8 sm:mb-10">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#46D7E4] mb-3">
                Start a project
              </p>
              <h2 id="complexity-contact-title" className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.02] tracking-tight text-[#F8FAFC]">
                Start Your <span className="text-[#45CAD5]">SaaS or AI Project</span>
              </h2>
            </div>
            <p className="max-w-xl text-sm sm:text-base leading-7 text-[#A8C2DC] lg:pb-1">
              Have a product, integration or difficult technical problem? Send the details and I&apos;ll reply directly.
            </p>
          </div>

          <aside className="mb-4 flex flex-col gap-4 rounded-2xl border border-cyan-400/25 bg-[#0C2B39] px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#46D7E4]">
                Freelance platform
              </p>
              <h3 className="mt-2 text-sm sm:text-base font-extrabold text-[#F8FAFC]">
                Prefer to hire through an established platform?
              </h3>
            </div>
            <a
              href="https://www.upwork.com/freelancers/mustafafullstack?mp_source=share"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-[#0B91A1] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#0FA5B2]"
            >
              <span>Hire me on</span>
              <img
                src="/assets/img/mustafa-full-stack-saas-engineer-upwork.png"
                width="204"
                height="56"
                alt="Upwork"
                className="h-5 w-auto"
              />
            </a>
          </aside>

          <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-4">
            <div className="rounded-2xl border border-slate-500/35 bg-[#16283A] p-5 sm:p-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#46D7E4]">
                Direct contact
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#F8FAFC]">
                Choose the channel that works for you.
              </h3>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <a
                  href="https://www.linkedin.com/in/muhammad-mustafa-16477a99/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-500/35 bg-[#14273A] p-3 hover:border-cyan-300/45 transition-colors"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-[#46D7E4]">
                    <Linkedin className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <small className="block text-[10px] text-[#86A3BF]">Professional profile</small>
                    <strong className="block text-xs text-[#F8FAFC]">LinkedIn</strong>
                  </span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#6F91AF]" />
                </a>

                <a
                  href="https://github.com/m-mustufa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-500/35 bg-[#14273A] p-3 hover:border-cyan-300/45 transition-colors"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-[#46D7E4]">
                    <Github className="h-4 w-4" />
                  </span>
                  <span>
                    <small className="block text-[10px] text-[#86A3BF]">Code and projects</small>
                    <strong className="block text-xs text-[#F8FAFC]">GitHub</strong>
                  </span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#6F91AF]" />
                </a>

                <a
                  href="https://wa.me/923332284944"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-500/35 bg-[#14273A] p-3 hover:border-cyan-300/45 transition-colors"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-[#46D7E4]">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span>
                    <small className="block text-[10px] text-[#86A3BF]">Quick conversation</small>
                    <strong className="block text-xs text-[#F8FAFC]">WhatsApp</strong>
                  </span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#6F91AF]" />
                </a>

                <a
                  href="https://calendly.com/mustdev/30min-consultation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-500/35 bg-[#14273A] p-3 hover:border-cyan-300/45 transition-colors"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-[#46D7E4]">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <span>
                    <small className="block text-[10px] text-[#86A3BF]">30-minute consultation</small>
                    <strong className="block text-xs text-[#F8FAFC]">Book a Call</strong>
                  </span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#6F91AF]" />
                </a>

                <a
                  href="tel:+923332284944"
                  className="group flex items-center gap-3 rounded-xl border border-slate-500/35 bg-[#14273A] p-3 hover:border-cyan-300/45 transition-colors sm:col-span-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-[#46D7E4]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span>
                    <small className="block text-[10px] text-[#86A3BF]">Pakistan / UAE</small>
                    <strong className="block text-xs text-[#F8FAFC]">+92 333 2284944</strong>
                  </span>
                  <span className="ml-auto text-[#6F91AF]" aria-hidden="true">&rarr;</span>
                </a>

                <a
                  href="mailto:mustufa50@gmail.com"
                  className="group flex items-center gap-3 rounded-xl border border-slate-500/35 bg-[#14273A] p-3 hover:border-cyan-300/45 transition-colors sm:col-span-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-[#46D7E4]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <small className="block text-[10px] text-[#86A3BF]">Email directly</small>
                    <strong className="block truncate text-xs text-[#F8FAFC]">mustufa50@gmail.com</strong>
                  </span>
                  <span className="ml-auto text-[#6F91AF]" aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>

            <form
              action="https://formspree.io/f/xjkrnwyl"
              method="POST"
              className="rounded-2xl border border-slate-500/35 bg-[#16283A] p-5 sm:p-6"
              data-contact-form
            >
              <input type="hidden" name="_subject" value="Complexity Coach project inquiry" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#46D7E4]">
                Project details
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#F8FAFC]">
                Tell me what you&apos;re building.
              </h3>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs font-semibold text-[#CBD5E1]">
                  <span>Your name</span>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border border-slate-500/35 bg-[#0B1C2B] px-4 py-3.5 text-sm text-[#F8FAFC] outline-none focus:border-cyan-300"
                    placeholder="Your name"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-[#CBD5E1]">
                  <span>Your email</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-500/35 bg-[#0B1C2B] px-4 py-3.5 text-sm text-[#F8FAFC] outline-none focus:border-cyan-300"
                    placeholder="you@company.com"
                  />
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-xs font-semibold text-[#CBD5E1]">
                <span>Project overview</span>
                <textarea
                  name="message"
                  rows={7}
                  required
                  className="w-full resize-y rounded-xl border border-slate-500/35 bg-[#0B1C2B] px-4 py-3.5 text-sm text-[#F8FAFC] outline-none focus:border-cyan-300"
                  placeholder="What are you building, and where do you need help?"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-[#7FA0BD]">I usually reply directly by email.</p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-[#0B91A1] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#0FA5B2]"
                >
                  Send project request
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-3 text-xs text-[#94A3B8]" data-contact-form-status role="status" aria-live="polite" hidden />
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;

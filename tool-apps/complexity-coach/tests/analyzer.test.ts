import { analyzeJavaScriptComplexity } from '../src/App';

type Expected = [string, string, string, string];

const cases: Array<{ name: string; code: string; expected: Expected }> = [
  {
    name: 'Two Sum Map',
    code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    expected: ['O(n)', 'O(n)', 'O(n)', 'High']
  },
  {
    name: 'Merge baseline',
    code: `function merge(nums1, m, nums2, n) {
  const realValues = nums1.slice(0, m);
  const combined = realValues.concat(nums2);
  combined.sort((a, b) => a - b);
  return combined;
}`,
    expected: ['O((m+n) log(m+n))', 'O(m+n)', 'O(m+n)', 'High']
  },
  {
    name: 'Product Except Self',
    code: `function productExceptSelf(nums) {
  const res = new Array(nums.length).fill(1);
  let prefix = 1;
  for (let i = 0; i < nums.length; i++) { res[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i--) { res[i] *= suffix; suffix *= nums[i]; }
  return res;
}`,
    expected: ['O(n)', 'O(1)', 'O(n)', 'High']
  },
  {
    name: 'Nested pair loops',
    code: `function pairs(nums) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) console.log(nums[i], nums[j]);
  }
}`,
    expected: ['O(n²)', 'O(1)', 'O(1)', 'High']
  },
  {
    name: 'Binary search',
    code: `function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}`,
    expected: ['O(log n)', 'O(1)', 'O(1)', 'High']
  },
  {
    name: 'Recursion guard',
    code: `function factorial(n) { if (n <= 1) return 1; return n * factorial(n - 1); }`,
    expected: ['Manual review needed', 'Manual review needed', 'Manual review needed', 'Manual review needed']
  },
  {
    name: 'Dynamic property guard',
    code: `function lookup(obj, key) { return obj[key]; }`,
    expected: ['Manual review needed', 'Manual review needed', 'Manual review needed', 'Manual review needed']
  },
  {
    name: 'Unknown member call guard',
    code: `function run(service, items) { return service.process(items); }`,
    expected: ['Manual review needed', 'Manual review needed', 'Manual review needed', 'Manual review needed']
  },
  {
    name: 'Different input includes',
    code: `function overlap(nums1, nums2) { for (const x of nums1) { if (nums2.includes(x)) return true; } return false; }`,
    expected: ['O(m*n)', 'O(1)', 'O(1)', 'High']
  },
  {
    // Shared by a visitor; used to return Manual review because of split().
    name: 'String split inside loop (visitor example)',
    code: `var getCleanComments = function (comments, bannedWords) {
  const seen = new Set(bannedWords);
  result = [];

  for (const comment of comments) {
    let isClean = true;
    const words = comment.split(" ");

    for (const word of words) {
      if (seen.has(word)) {
        isClean = false;
      }
    }
    if (isClean === true) {
      result.push(comment);
    }
  }

  return result;
};`,
    expected: ['O(m*L + n)', 'O(n + L)', 'O(m + n + L)', 'High']
  },
  {
    name: 'Chained string methods on a string parameter',
    code: `function clean(s) { return s.trim().toLowerCase(); }`,
    expected: ['O(n)', 'O(n)', 'O(n)', 'High']
  },
  {
    name: 'Word frequency with split in loop header',
    code: `function wordFreq(text) {
  const counts = new Map();
  for (const word of text.split(' ')) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return counts;
}`,
    expected: ['O(n)', 'O(n)', 'O(n)', 'High']
  },
  {
    name: 'Regex split lowers confidence',
    code: `function countWords(text) { const parts = text.trim().split(/\\s+/); return parts.length; }`,
    expected: ['O(n)', 'O(n)', 'O(n)', 'Medium']
  },
  {
    name: 'Sort plus independent loop keeps both sizes',
    code: `function sortAndScan(nums1, nums2) {
  nums1.sort((a, b) => a - b);
  let total = 0;
  for (const x of nums2) total += x;
  return total;
}`,
    expected: ['O(m log(m) + n)', 'O(1)', 'O(1)', 'High']
  },
  {
    name: 'Unsupported TypeScript syntax',
    code: `interface Item { id: number }\nfunction ids(items: Item[]) { return items.map(item => item.id); }`,
    expected: ['Manual review needed', 'Manual review needed', 'Manual review needed', 'Manual review needed']
  }
];

let failed = 0;

for (const test of cases) {
  const result = analyzeJavaScriptComplexity(test.code);
  const actual: Expected = [
    result.timeComplexity,
    result.auxSpaceComplexity,
    result.totalSpaceComplexity,
    result.confidence
  ];
  const passed = actual.every((value, index) => value === test.expected[index]);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${test.name}: ${actual.join(' | ')}`);
  if (!passed) failed += 1;
}

if (failed > 0) {
  throw new Error(`${failed} analyzer test(s) failed.`);
}

console.log(`All ${cases.length} analyzer tests passed.`);

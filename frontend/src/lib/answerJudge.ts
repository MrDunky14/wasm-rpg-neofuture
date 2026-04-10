const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+*^\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCompact = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenSet = (value: string): Set<string> => new Set(normalizeCompact(value).split(' ').filter(Boolean));

const includesAny = (value: string, options: string[]): boolean => {
  const normalized = normalize(value);
  return options.some((option) => normalized.includes(normalize(option)));
};

const includesAllTokens = (value: string, tokens: string[]): boolean => {
  const answerTokens = tokenSet(value);
  return tokens.every((token) => answerTokens.has(token));
};

const extractArrayValues = (value: string): string[] => {
  const match = value.match(/\[([^\]]+)]/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean);
};

const extractNumbers = (value: string): string[] => value.match(/-?\d+/g) ?? [];

const parseOperationSequence = (question: string): { operations: string[]; prompt: string } => {
  const [sequencePart, promptPart = ''] = question.split(/->|→/);
  const operations = sequencePart
    .split(',')
    .map((op) => op.trim())
    .filter(Boolean);
  return { operations, prompt: promptPart.trim().toLowerCase() };
};

const judgeStackOps = (question: string, answer: string): boolean | null => {
  const lowered = question.toLowerCase();
  if (!lowered.includes('push') && !lowered.includes('pop')) {
    return null;
  }

  const { operations, prompt } = parseOperationSequence(question);
  const stack: string[] = [];
  let lastPopped = '';

  for (const operation of operations) {
    const opLower = operation.toLowerCase();
    if (opLower.startsWith('push')) {
      const value = operation.slice(4).trim();
      if (value) {
        stack.push(value);
      }
    } else if (opLower.startsWith('pop')) {
      lastPopped = stack.pop() ?? '';
    }
  }

  if (prompt.includes('what was popped')) {
    return Boolean(lastPopped) && tokenSet(answer).has(normalizeCompact(lastPopped));
  }

  if (prompt.includes('what remains') || prompt.includes("what's left") || prompt.includes('what remains on the stack')) {
    if (stack.length === 0) {
      return includesAny(answer, ['empty', 'none', 'nothing']);
    }

    return stack.every((value) => tokenSet(answer).has(normalizeCompact(value)));
  }

  return null;
};

const judgeQueueOps = (question: string, answer: string): boolean | null => {
  const lowered = question.toLowerCase();
  if (!lowered.includes('enqueue') && !lowered.includes('dequeue')) {
    return null;
  }

  const { operations, prompt } = parseOperationSequence(question);
  const queue: string[] = [];
  let lastDequeued = '';

  for (const operation of operations) {
    const opLower = operation.toLowerCase();
    if (opLower.startsWith('enqueue')) {
      const value = operation.slice(7).trim();
      if (value) {
        queue.push(value);
      }
    } else if (opLower.startsWith('dequeue')) {
      lastDequeued = queue.shift() ?? '';
    }
  }

  if (prompt.includes('what was removed')) {
    return Boolean(lastDequeued) && tokenSet(answer).has(normalizeCompact(lastDequeued));
  }

  if (prompt.includes('front')) {
    const front = queue[0] ?? '';
    return Boolean(front) && tokenSet(answer).has(normalizeCompact(front));
  }

  return null;
};

const judgeSortArray = (question: string, answer: string): boolean | null => {
  const lowered = question.toLowerCase();
  if (!lowered.includes('sort')) {
    return null;
  }

  const values = extractArrayValues(question);
  if (values.length === 0) {
    return null;
  }

  const numeric = values.every((value) => /^-?\d+$/.test(value));
  const sorted = numeric
    ? [...values].map(Number).sort((a, b) => a - b).map(String)
    : [...values].sort((a, b) => a.localeCompare(b));

  const answerNumbers = extractNumbers(answer);
  if (numeric && answerNumbers.length >= sorted.length) {
    const candidate = answerNumbers.slice(0, sorted.length);
    if (candidate.join(',') === sorted.join(',')) {
      return true;
    }
  }

  return includesAny(answer, [sorted.join(','), sorted.join(' ')]) ||
    includesAllTokens(answer, sorted.map((value) => normalizeCompact(value)));
};

const keywordRules: Array<{ question: RegExp; expected: string[] }> = [
  { question: /peek\(\)|peek\s*\(/i, expected: ['top without removing', 'see top without removing', 'view top without removing'] },
  { question: /what principle does a stack follow|lifo/i, expected: ['lifo', 'last in first out'] },
  { question: /what principle does a queue follow|fifo/i, expected: ['fifo', 'first in first out'] },
  { question: /which end do you enqueue/i, expected: ['rear', 'back'] },
  { question: /binary search requires/i, expected: ['sorted'] },
  { question: /time complexity of binary search/i, expected: ['log n', 'o log n', 'o(log n)'] },
  { question: /bfs uses/i, expected: ['queue'] },
  { question: /dfs uses/i, expected: ['stack'] },
  { question: /worst-case complexity of bubble sort/i, expected: ['n^2', 'n2', 'o n^2', 'o(n^2)', 'quadratic'] },
  { question: /average-case time complexity of quicksort/i, expected: ['n log n', 'o(n log n)', 'nlogn'] },
  { question: /is mergesort a stable sort/i, expected: ['yes', 'true'] },
  { question: /what stops a recursive function/i, expected: ['base case'] },
  { question: /factorial\(4\)|factorial\s*4/i, expected: ['24'] },
  { question: /recursion uses which data structure/i, expected: ['call stack', 'stack'] },
  { question: /nth element in a singly linked list/i, expected: ['o(n)', 'n', 'linear'] },
  { question: /what does each node in a singly linked list contain/i, expected: ['data and pointer', 'value and next pointer', 'value and pointer'] },
  { question: /how do you delete the head of a linked list/i, expected: ['head to next', 'move head to next', 'set head to head.next'] },
  { question: /solve:\s*3x\s*-\s*9\s*=\s*0/i, expected: ['3'] },
  { question: /what is 2\^4/i, expected: ['16'] },
  { question: /simplify:\s*\(x\+2\)\(x-2\)/i, expected: ['x^2-4', 'x2-4', 'x squared minus 4'] },
];

const expectedHint = (question: string): string => {
  const lowered = question.toLowerCase();
  if (lowered.includes('stack')) {
    return 'Think LIFO behavior.';
  }
  if (lowered.includes('queue')) {
    return 'Think FIFO behavior.';
  }
  if (lowered.includes('sort')) {
    return 'Return the sequence in ascending order.';
  }
  if (lowered.includes('binary search')) {
    return 'Binary search only works on sorted data.';
  }
  return 'Use the core concept from your lesson and try again.';
};

export type JudgeResult = {
  isCorrect: boolean;
  hint: string;
};

export const judgeConceptAnswer = (question: string, answer: string): JudgeResult => {
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return { isCorrect: false, hint: expectedHint(question) };
  }

  const stackResult = judgeStackOps(question, trimmedAnswer);
  if (stackResult !== null) {
    return { isCorrect: stackResult, hint: expectedHint(question) };
  }

  const queueResult = judgeQueueOps(question, trimmedAnswer);
  if (queueResult !== null) {
    return { isCorrect: queueResult, hint: expectedHint(question) };
  }

  const sortResult = judgeSortArray(question, trimmedAnswer);
  if (sortResult !== null) {
    return { isCorrect: sortResult, hint: expectedHint(question) };
  }

  const normalizedAnswer = normalize(trimmedAnswer);
  for (const rule of keywordRules) {
    if (!rule.question.test(question)) {
      continue;
    }

    const matched = rule.expected.some((expected) => normalizedAnswer.includes(normalize(expected)));
    return { isCorrect: matched, hint: expectedHint(question) };
  }

  return { isCorrect: trimmedAnswer.length >= 3, hint: expectedHint(question) };
};
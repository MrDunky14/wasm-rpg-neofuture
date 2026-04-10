import { useMemo, useState } from 'react';

type ChallengeRoomProps = {
  topic: string;
  onBack: () => void;
  onComplete: () => void;
};

type QuickChallenge = {
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
};

const TOPIC_CHALLENGES: Record<string, QuickChallenge> = {
  stack: {
    prompt: 'Which operation removes the top element from a stack?',
    options: ['enqueue', 'pop', 'peek', 'append'],
    answer: 'pop',
    hint: 'Think LIFO: the last pushed item gets removed first.',
  },
  queue: {
    prompt: 'In a queue, which operation removes the front item?',
    options: ['pop', 'dequeue', 'peek', 'push'],
    answer: 'dequeue',
    hint: 'Queues follow FIFO and use enqueue/dequeue vocabulary.',
  },
  binary_search: {
    prompt: 'What condition must be true before using binary search?',
    options: ['Array is sorted', 'Array has unique values', 'Array size is odd', 'Array has no negatives'],
    answer: 'Array is sorted',
    hint: 'Binary search repeatedly cuts the search space in half.',
  },
  recursion: {
    prompt: 'What is the main purpose of a base case in recursion?',
    options: ['Speed up loops', 'Stop infinite calls', 'Sort faster', 'Use less memory'],
    answer: 'Stop infinite calls',
    hint: 'Without it, the function keeps calling itself forever.',
  },
  linked_list: {
    prompt: 'Accessing the nth element in a singly linked list is usually:',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    answer: 'O(n)',
    hint: 'You must walk from head node to target node.',
  },
  graph_traversal: {
    prompt: 'Which data structure is central to BFS traversal?',
    options: ['Stack', 'Heap', 'Queue', 'Tree'],
    answer: 'Queue',
    hint: 'BFS explores graph levels in arrival order.',
  },
  math_algebra: {
    prompt: 'Solve quickly: 2x + 6 = 14. What is x?',
    options: ['2', '4', '6', '10'],
    answer: '4',
    hint: 'First isolate 2x, then divide by 2.',
  },
};

const getRandomArray = (): number[] => {
  const values = Array.from({ length: 6 }, () => Math.floor(Math.random() * 80) + 10);
  if (values.every((value, index, arr) => index === 0 || arr[index - 1] <= value)) {
    values.reverse();
  }
  return values;
};

const isSortedAsc = (values: number[]) => {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] > values[i]) {
      return false;
    }
  }
  return true;
};

const normalizeTopic = (topic: string) => topic.trim().toLowerCase();

const ChallengeRoom = ({ topic, onBack, onComplete }: ChallengeRoomProps) => {
  const normalizedTopic = normalizeTopic(topic);
  const isSortingTopic = normalizedTopic === 'sorting';

  const [values, setValues] = useState<number[]>(() => getRandomArray());
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState('Select two numbers to swap their positions.');
  const [selectedOption, setSelectedOption] = useState('');
  const [genericPassed, setGenericPassed] = useState(false);

  const sortingPassed = useMemo(() => isSortedAsc(values), [values]);
  const challengePassed = isSortingTopic ? sortingPassed : genericPassed;

  const quickChallenge = TOPIC_CHALLENGES[normalizedTopic] ?? {
    prompt: 'Pick the best statement: learning happens when you apply concepts after feedback.',
    options: ['True', 'False'],
    answer: 'True',
    hint: 'This game rewards applying feedback from your failed topics.',
  };

  const selectNumber = (index: number) => {
    if (sortingPassed) {
      return;
    }

    if (firstPick === null) {
      setFirstPick(index);
      setMessage('Now choose a second number to swap.');
      return;
    }

    if (firstPick === index) {
      setFirstPick(null);
      setMessage('Selection cleared. Choose two numbers to swap.');
      return;
    }

    setValues((prev) => {
      const next = [...prev];
      const temp = next[firstPick];
      next[firstPick] = next[index];
      next[index] = temp;
      return next;
    });
    setMoves((previousMoves) => previousMoves + 1);
    setFirstPick(null);
    setMessage('Swap complete. Keep sorting in ascending order.');
  };

  const resetSorting = () => {
    setValues(getRandomArray());
    setFirstPick(null);
    setMoves(0);
    setMessage('New puzzle generated. Sort numbers from low to high.');
  };

  const submitGenericChallenge = () => {
    if (!selectedOption) {
      setMessage('Choose an option first.');
      return;
    }

    if (selectedOption === quickChallenge.answer) {
      setGenericPassed(true);
      setMessage('Correct. Concept checkpoint cleared.');
      return;
    }

    setMessage(`Not yet. Hint: ${quickChallenge.hint}`);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8">
      <div className="w-full max-w-3xl z-10">
        <div className="game-panel rounded-xl p-6 md:p-8 border border-white/[0.08]">
          <div className="text-center mb-6">
            <span className="font-pixel text-[8px] tracking-[0.3em] text-secondary uppercase">Challenge Room</span>
            <h1 className="mt-3 font-pixel text-[14px] md:text-[16px] text-white tracking-wider">APPLY WHAT YOU LEARNED</h1>
            <p className="mt-3 text-sm text-gray-300 capitalize">Topic focus: {normalizedTopic.replace(/_/g, ' ')}</p>
          </div>

          {isSortingTopic ? (
            <div className="space-y-4">
              <div className="game-panel rounded-lg p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-pixel text-[9px] text-accent tracking-wider">SORTING TRIAL</h2>
                  <span className="font-pixel text-[8px] text-gray-400">MOVES: {moves}</span>
                </div>
                <p className="text-sm text-gray-300 mb-4">Sort the array in ascending order by swapping two values at a time.</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {values.map((value, index) => {
                    const selected = firstPick === index;
                    return (
                      <button
                        key={`${value}-${index}`}
                        className={[
                          'h-14 rounded border text-sm font-semibold transition-all',
                          selected
                            ? 'border-secondary bg-secondary/20 text-white shadow-[0_0_14px_rgba(6,182,212,0.35)]'
                            : 'border-white/[0.12] bg-[#0b1224] text-gray-100 hover:border-white/30',
                        ].join(' ')}
                        onClick={() => selectNumber(index)}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-sm text-gray-200">{sortingPassed ? 'Sorted! Challenge cleared.' : message}</div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button onClick={onBack} className="pixel-btn-ghost">Back</button>
                <button onClick={resetSorting} className="pixel-btn-ghost">New Puzzle</button>
                <button onClick={onComplete} disabled={!sortingPassed} className="pixel-btn disabled:opacity-60">
                  Enter Dungeon
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="game-panel rounded-lg p-4 border border-white/[0.06]">
                <h2 className="font-pixel text-[9px] text-accent tracking-wider mb-3">CONCEPT CHECK</h2>
                <p className="text-sm text-gray-200 mb-4">{quickChallenge.prompt}</p>
                <div className="space-y-2">
                  {quickChallenge.options.map((option) => {
                    const selected = selectedOption === option;
                    return (
                      <label
                        key={option}
                        className={[
                          'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all',
                          selected
                            ? 'border-secondary/70 bg-secondary/10'
                            : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="challenge-option"
                          value={option}
                          checked={selected}
                          onChange={(event) => setSelectedOption(event.target.value)}
                        />
                        <span className="text-sm text-gray-100">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <p className="text-sm text-gray-200">{message}</p>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button onClick={onBack} className="pixel-btn-ghost">Back</button>
                <button onClick={submitGenericChallenge} className="pixel-btn-ghost">Check Answer</button>
                <button onClick={onComplete} disabled={!challengePassed} className="pixel-btn disabled:opacity-60">
                  Enter Dungeon
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeRoom;

"""
Quiz question bank — curated questions across multiple CS/Math topics.

Each question maps to a ConceptTopic and is used in the diagnostic quiz.
The WASM engine later uses the failed topics to generate concept-based dungeons.
"""

QUESTION_BANK = [
    # ── STACK ──────────────────────────────────────────────────────────────
    {
        "id": 1,
        "topic": "stack",
        "question": "What principle does a Stack data structure follow?",
        "options": [
            {"id": "a", "text": "FIFO (First In, First Out)"},
            {"id": "b", "text": "LIFO (Last In, First Out)"},
            {"id": "c", "text": "LILO (Last In, Last Out)"},
            {"id": "d", "text": "Random Access"},
        ],
        "correct_option": "b",
        "explanation": "A Stack follows LIFO — the last element pushed is the first to be popped.",
    },
    {
        "id": 2,
        "topic": "stack",
        "question": "Which operation removes the top element from a stack?",
        "options": [
            {"id": "a", "text": "push()"},
            {"id": "b", "text": "peek()"},
            {"id": "c", "text": "pop()"},
            {"id": "d", "text": "dequeue()"},
        ],
        "correct_option": "c",
        "explanation": "pop() removes and returns the top element of the stack.",
    },
    {
        "id": 3,
        "topic": "stack",
        "question": "After pushing 1, 2, 3 onto a stack and popping twice, what is on top?",
        "options": [
            {"id": "a", "text": "1"},
            {"id": "b", "text": "2"},
            {"id": "c", "text": "3"},
            {"id": "d", "text": "Stack is empty"},
        ],
        "correct_option": "a",
        "explanation": "Push 1,2,3 → Stack is [1,2,3]. Pop 3, pop 2. Top is now 1.",
    },
    # ── QUEUE ──────────────────────────────────────────────────────────────
    {
        "id": 4,
        "topic": "queue",
        "question": "What principle does a Queue data structure follow?",
        "options": [
            {"id": "a", "text": "LIFO (Last In, First Out)"},
            {"id": "b", "text": "FIFO (First In, First Out)"},
            {"id": "c", "text": "Priority-based"},
            {"id": "d", "text": "Random Access"},
        ],
        "correct_option": "b",
        "explanation": "A Queue follows FIFO — the first element enqueued is the first to be dequeued.",
    },
    {
        "id": 5,
        "topic": "queue",
        "question": "Which operation adds an element to the rear of a queue?",
        "options": [
            {"id": "a", "text": "push()"},
            {"id": "b", "text": "enqueue()"},
            {"id": "c", "text": "pop()"},
            {"id": "d", "text": "insert()"},
        ],
        "correct_option": "b",
        "explanation": "enqueue() (or offer/add) places an element at the rear of the queue.",
    },
    {
        "id": 6,
        "topic": "queue",
        "question": "A print spooler is an example of which data structure?",
        "options": [
            {"id": "a", "text": "Stack"},
            {"id": "b", "text": "Queue"},
            {"id": "c", "text": "Tree"},
            {"id": "d", "text": "Graph"},
        ],
        "correct_option": "b",
        "explanation": "Print jobs are processed in FIFO order — a queue.",
    },
    # ── SORTING ────────────────────────────────────────────────────────────
    {
        "id": 7,
        "topic": "sorting",
        "question": "What is the average-case time complexity of QuickSort?",
        "options": [
            {"id": "a", "text": "O(n)"},
            {"id": "b", "text": "O(n log n)"},
            {"id": "c", "text": "O(n²)"},
            {"id": "d", "text": "O(log n)"},
        ],
        "correct_option": "b",
        "explanation": "QuickSort has O(n log n) average-case complexity via divide-and-conquer.",
    },
    {
        "id": 8,
        "topic": "sorting",
        "question": "Which sorting algorithm is stable and has O(n log n) worst-case?",
        "options": [
            {"id": "a", "text": "QuickSort"},
            {"id": "b", "text": "HeapSort"},
            {"id": "c", "text": "MergeSort"},
            {"id": "d", "text": "SelectionSort"},
        ],
        "correct_option": "c",
        "explanation": "MergeSort is stable and guarantees O(n log n) in all cases.",
    },
    {
        "id": 9,
        "topic": "sorting",
        "question": "Bubble Sort compares:",
        "options": [
            {"id": "a", "text": "Each element with every other element"},
            {"id": "b", "text": "Adjacent elements and swaps if out of order"},
            {"id": "c", "text": "The first and last elements only"},
            {"id": "d", "text": "Elements at random positions"},
        ],
        "correct_option": "b",
        "explanation": "Bubble Sort repeatedly swaps adjacent elements if they are in the wrong order.",
    },
    # ── BINARY SEARCH ──────────────────────────────────────────────────────
    {
        "id": 10,
        "topic": "binary_search",
        "question": "Binary Search requires the input to be:",
        "options": [
            {"id": "a", "text": "A linked list"},
            {"id": "b", "text": "Unsorted"},
            {"id": "c", "text": "Sorted"},
            {"id": "d", "text": "A binary tree"},
        ],
        "correct_option": "c",
        "explanation": "Binary Search only works on sorted arrays/sequences.",
    },
    {
        "id": 11,
        "topic": "binary_search",
        "question": "What is the time complexity of Binary Search?",
        "options": [
            {"id": "a", "text": "O(n)"},
            {"id": "b", "text": "O(n²)"},
            {"id": "c", "text": "O(log n)"},
            {"id": "d", "text": "O(1)"},
        ],
        "correct_option": "c",
        "explanation": "Binary Search halves the search space each step → O(log n).",
    },
    {
        "id": 12,
        "topic": "binary_search",
        "question": "In Binary Search, if the target is greater than the middle element, you search:",
        "options": [
            {"id": "a", "text": "The left half"},
            {"id": "b", "text": "The right half"},
            {"id": "c", "text": "Both halves"},
            {"id": "d", "text": "The middle again"},
        ],
        "correct_option": "b",
        "explanation": "If target > mid, the target must be in the right (larger) half.",
    },
    # ── RECURSION ──────────────────────────────────────────────────────────
    {
        "id": 13,
        "topic": "recursion",
        "question": "What is the essential component every recursive function must have?",
        "options": [
            {"id": "a", "text": "A loop"},
            {"id": "b", "text": "A base case"},
            {"id": "c", "text": "A global variable"},
            {"id": "d", "text": "Multiple return statements"},
        ],
        "correct_option": "b",
        "explanation": "A base case prevents infinite recursion by providing a termination condition.",
    },
    {
        "id": 14,
        "topic": "recursion",
        "question": "What happens if a recursive function has no base case?",
        "options": [
            {"id": "a", "text": "It returns 0"},
            {"id": "b", "text": "It runs once and stops"},
            {"id": "c", "text": "It causes a stack overflow"},
            {"id": "d", "text": "It sorts the input"},
        ],
        "correct_option": "c",
        "explanation": "Without a base case, the function calls itself infinitely until the call stack overflows.",
    },
    {
        "id": 15,
        "topic": "recursion",
        "question": "The factorial of 5 (5!) equals:",
        "options": [
            {"id": "a", "text": "25"},
            {"id": "b", "text": "120"},
            {"id": "c", "text": "60"},
            {"id": "d", "text": "720"},
        ],
        "correct_option": "b",
        "explanation": "5! = 5 × 4 × 3 × 2 × 1 = 120.",
    },
    # ── LINKED LIST ────────────────────────────────────────────────────────
    {
        "id": 16,
        "topic": "linked_list",
        "question": "What is the main advantage of a linked list over an array?",
        "options": [
            {"id": "a", "text": "Faster access by index"},
            {"id": "b", "text": "Dynamic size and efficient insertion/deletion"},
            {"id": "c", "text": "Less memory usage"},
            {"id": "d", "text": "Built-in sorting"},
        ],
        "correct_option": "b",
        "explanation": "Linked lists allow O(1) insertion/deletion at known positions and resize dynamically.",
    },
    {
        "id": 17,
        "topic": "linked_list",
        "question": "In a singly linked list, each node contains:",
        "options": [
            {"id": "a", "text": "Data and two pointers"},
            {"id": "b", "text": "Only data"},
            {"id": "c", "text": "Data and a pointer to the next node"},
            {"id": "d", "text": "A pointer to the previous node only"},
        ],
        "correct_option": "c",
        "explanation": "A singly linked list node has data + a 'next' pointer.",
    },
    {
        "id": 18,
        "topic": "linked_list",
        "question": "What is the time complexity of searching in an unsorted linked list?",
        "options": [
            {"id": "a", "text": "O(1)"},
            {"id": "b", "text": "O(log n)"},
            {"id": "c", "text": "O(n)"},
            {"id": "d", "text": "O(n²)"},
        ],
        "correct_option": "c",
        "explanation": "You must traverse each node sequentially → O(n).",
    },
    # ── GRAPH TRAVERSAL ────────────────────────────────────────────────────
    {
        "id": 19,
        "topic": "graph_traversal",
        "question": "BFS (Breadth-First Search) uses which data structure internally?",
        "options": [
            {"id": "a", "text": "Stack"},
            {"id": "b", "text": "Queue"},
            {"id": "c", "text": "Heap"},
            {"id": "d", "text": "Array"},
        ],
        "correct_option": "b",
        "explanation": "BFS uses a Queue to explore nodes level by level.",
    },
    {
        "id": 20,
        "topic": "graph_traversal",
        "question": "DFS (Depth-First Search) uses which data structure internally?",
        "options": [
            {"id": "a", "text": "Queue"},
            {"id": "b", "text": "Stack (or call stack via recursion)"},
            {"id": "c", "text": "Priority Queue"},
            {"id": "d", "text": "Hash Map"},
        ],
        "correct_option": "b",
        "explanation": "DFS uses a Stack (explicitly or via recursive call stack) to go deep before backtracking.",
    },
    {
        "id": 21,
        "topic": "graph_traversal",
        "question": "Which algorithm finds the shortest path in an unweighted graph?",
        "options": [
            {"id": "a", "text": "DFS"},
            {"id": "b", "text": "BFS"},
            {"id": "c", "text": "Dijkstra's"},
            {"id": "d", "text": "Prim's"},
        ],
        "correct_option": "b",
        "explanation": "BFS guarantees the shortest path in unweighted graphs.",
    },
    # ── MATH / ALGEBRA ─────────────────────────────────────────────────────
    {
        "id": 22,
        "topic": "math_algebra",
        "question": "Solve for x: 2x + 5 = 15",
        "options": [
            {"id": "a", "text": "x = 5"},
            {"id": "b", "text": "x = 10"},
            {"id": "c", "text": "x = 7.5"},
            {"id": "d", "text": "x = 20"},
        ],
        "correct_option": "a",
        "explanation": "2x = 15 - 5 = 10, so x = 5.",
    },
    {
        "id": 23,
        "topic": "math_algebra",
        "question": "What is the value of 2³?",
        "options": [
            {"id": "a", "text": "6"},
            {"id": "b", "text": "8"},
            {"id": "c", "text": "9"},
            {"id": "d", "text": "16"},
        ],
        "correct_option": "b",
        "explanation": "2³ = 2 × 2 × 2 = 8.",
    },
    {
        "id": 24,
        "topic": "math_algebra",
        "question": "The quadratic formula solves equations of the form:",
        "options": [
            {"id": "a", "text": "ax + b = 0"},
            {"id": "b", "text": "ax² + bx + c = 0"},
            {"id": "c", "text": "a/x = b"},
            {"id": "d", "text": "x^n = a"},
        ],
        "correct_option": "b",
        "explanation": "The quadratic formula x = [-b ± √(b²-4ac)] / 2a solves ax² + bx + c = 0.",
    },
]

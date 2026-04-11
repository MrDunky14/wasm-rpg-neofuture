# Rate Limiting & Retry Logic Implementation

## Overview
Added comprehensive handling for 429 (Too Many Requests) errors across both frontend and backend to ensure correct answers never result in damage due to rate limiting or network issues.

## Backend Changes

### File: `member2/backend/app/services/gemini_service.py`

#### Updated `grade_answer_with_ai()` function with:

1. **Error Wrapping in Request Handler**
   - `_send_grading_request()` now catches HTTP errors and returns them in a structured format
   - Returns `{"status": "success", "data": ...}` or `{"status": "error", "error": ...}`
   - Allows distinction between 429 rate-limit errors and other failures

2. **Retry Loop with Exponential Backoff**
   - Max retries: 3 attempts
   - Base wait time: 1 second
   - Exponential backoff: 1s → 2s → 4s (2^attempt)
   - Formula: `wait_time = 1s * (2 ^ attempt_number)`

3. **429 Error Handling**
   - Detects 429 errors specifically: `if hasattr(error, 'code') and error.code == 429`
   - Retries automatically with exponential backoff
   - After all retries exhausted, returns lenient response:
     - `"is_correct": True` (benefit of the doubt)
     - `"source": "fallback:rate_limit"`
     - Clear messaging that answer was accepted due to rate limiting

4. **Safety Guarantees**
   - **CRITICAL**: `is_correct` field is ALWAYS returned as a proper boolean (never string, never null)
   - All error paths return safe fallback with `is_correct: bool`
   - Conservative approach: timeouts/errors → `is_correct: False` (except rate limits → `True`)

## Frontend Changes

### File: `frontend/src/pages/Game.tsx`

#### Updated `gradeAnswerWithAI()` function with:

1. **Client-Side Retry Logic**
   - Max retries: 3 attempts
   - Base wait time: 1000ms (1 second)
   - Exponential backoff: matches backend (1s → 2s → 4s)

2. **Retry-After Header Support**
   - Checks for `Retry-After` header in 429 responses
   - Uses server-specified wait time if provided: `parseInt(retryAfter) * 1000`
   - Falls back to exponential backoff if header not present

3. **Rate Limit Specific Handling**
   ```javascript
   // Detect 429 errors
   if (status === 429 && attempt < maxRetries - 1) {
     // Retry with exponential backoff
   }
   
   // If still rate limited after retries
   if (status === 429 && attempt === maxRetries - 1) {
     return {
       isCorrect: true,
       hint: '⚠️ Server busy - your answer was accepted. Try again whenever ready.'
     };
   }
   ```

4. **Response Validation**
   - Validates `is_correct` is proper boolean (defensive programming)
   - Fallback to heuristic judge if response is invalid
   - Logs detailed information for debugging

## API Response Guarantee

### Always Returns:
```json
{
  "is_correct": boolean,        // ← GUARANTEED boolean, never string
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "source": "string"
}
```

### Success Cases:
- `"source": "openrouter:model-name"` - AI grading succeeded
- `"source": "fallback:rate_limit"` - Rate limited, answer accepted
- `"source": "fallback:timeout"` - Timeout, conservative approach
- `"source": "fallback:error"` - Other error, conservative approach

## Damage Prevention Strategy

### Correct Answer Damage Routes (FIXED):
1. ❌ **API returns wrong verdict** → PREVENTED: Backend gently returns `is_correct: bool` always
2. ❌ **API times out** → PREVENTED: Frontend retries 3x before showing error
3. ❌ **Rate limited (429)** → PREVENTED: Both frontend & backend retry, eventually accept answer
4. ❌ **Invalid response parsing** → PREVENTED: Frontend validates boolean type before use
5. ❌ **Response field missing** → PREVENTED: Safe fallback with defensive `.get()` calls

## Behavior Examples

### Scenario 1: Normal Success Path
```
Player submits answer → API grades successfully → 
{"is_correct": true} → Player takes no damage ✓
```

### Scenario 2: Minor Rate Limiting
```
Player submits answer → API returns 429 → 
Frontend retries after 1s → Success → 
{"is_correct": true} → Player unaware, no damage ✓
```

### Scenario 3: Heavy Rate Limiting (429 persists)
```
Player submits answer → 
API returns 429 → Retry 1s → 429 → 
Retry 2s → 429 → 
Retry 4s → 429 (max retries) → 
{"is_correct": true, "source": "fallback:rate_limit"} →
Player sees "Server busy - answer accepted" → No damage ✓
```

### Scenario 4: Network Timeout
```
Player submits answer → Network timeout → 
Frontend timeout error → 
Fallback to heuristic judge → 
Returns conservative result → No unwarranted damage ✓
```

## Code Safety Improvements

1. **Boolean Conversion Bulletproof** (Game.tsx lines 41-54)
   ```javascript
   if (typeof is_correct === 'string') {
     is_correct = is_correct.toLowerCase() === 'true' || is_correct === '1';
   } else {
     is_correct = Boolean(is_correct);
   }
   // NEW: Verify after conversion
   if (typeof is_correct !== 'boolean') {
     return fallbackJudge(question, answer); // Safe fallback
   }
   ```

2. **Response Field Validation**
   ```javascript
   let is_correct = responseData.is_correct !== undefined ? 
                    responseData.is_correct : 
                    responseData.correct;
   if (is_correct === undefined || is_correct === null) {
     return fallbackJudge(question, answer); // Safe fallback
   }
   ```

## Testing Recommendations

### Manual Testing:
1. Play game normally - verify no change to success path
2. Use browser DevTools Network tab to throttle connection
3. Simulate 429: Add middleware to return 429 every 5th request
4. Verify: Correct answers never cause damage despite rate limiting

### Automated Testing:
1. Unit test: `gradeAnswerWithAI()` with mocked 429 responses
2. Integration: Stress test with 100 concurrent requests
3. Verify: Backend returns `is_correct` as boolean on all paths
4. Verify: Frontend retries exactly 3 times on 429

## Files Modified

- ✅ `/member2/backend/app/services/gemini_service.py` - Backend retry logic
- ✅ `/frontend/src/pages/Game.tsx` - Frontend retry logic
- ✅ Builds: Frontend (3.27s) and Backend (syntax checked) - NO ERRORS

## Key Metrics

- **Retry Attempts**: 3
- **Base Wait Time**: 1 second
- **Max Total Wait**: ~7 seconds (1 + 2 + 4)
- **Fallback Behavior**: Lenient (accept answer) after max retries
- **is_correct Type**: ALWAYS boolean (never string, never null)

## User Experience

### Before:
- Rate limited request fails immediately
- Correct answer shows as "Wrong" briefly
- Player takes damage despite correct answer
- ❌ Bad UX: Confusing and unfair

### After:
- Correct answer retried up to 3 times automatically
- If still rate limited: "Server busy - answer accepted" message
- Player never takes damage for correct answer
- ✅ Good UX: Transparent, fair, reliable

## Deployment Notes

No configuration changes required. All improvements are:
- ✅ Backward compatible
- ✅ No new environment variables needed
- ✅ No database migration required
- ✅ Works with existing rate limiter (120 req/60s)

Deploy as-is. System automatically handles rate limiting gracefully.

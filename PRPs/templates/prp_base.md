name: "Base PRP Template v2 - Context-Rich with Validation Loops"
description: |

## Purpose

Template optimized for AI agents to implement features with sufficient context and self-validation capabilities to achieve working code through iterative refinement.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal

[What needs to be built - be specific about the end state and desires]

## Why

- [Business value and user impact]
- [Integration with existing features]
- [Problems this solves and for whom]

## What

[User-visible behavior and technical requirements]

### Success Criteria

- [ ] [Specific measurable outcomes]

## All Needed Context

### Documentation & References (list all context needed to implement the feature)

```yaml
# MUST READ - Include these in your context window
- url: [Official API docs URL]
  why: [Specific sections/methods you'll need]

- file: [path/to/example.ts]
  why: [Pattern to follow, gotchas to avoid]

- doc: [Library documentation URL]
  section: [Specific section about common pitfalls]
  critical: [Key insight that prevents common errors]

- docfile: [PRPs/ai_docs/file.md]
  why: [docs that the user has pasted in to the project]
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash

```

### Desired Codebase tree with files to be added and responsibility of file

```bash

```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: [Library name] requires [specific setup]
// Example: Async functions must return Promises with proper typing
// Example: We use Biome for formatting and linting
// Example: No `any` types allowed - always use proper type definitions
// Example: No non-null assertion operator (!) - use proper type guards
```

## Implementation Blueprint

### Data models and structure

Create the core data models to ensure type safety and consistency.

```typescript
// Examples:
// - TypeScript interfaces and types
// - Zod schemas for runtime validation
// - Class models with proper typing
// - Type guards and validators

// Example Zod schema:
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

type User = z.infer<typeof UserSchema>;
```

### list of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1:
MODIFY src/existing-module.ts:
  - FIND pattern: "class OldImplementation"
  - INJECT after line containing "constructor"
  - PRESERVE existing method signatures and types

CREATE src/new-feature.ts:
  - MIRROR pattern from: src/similar-feature.ts
  - MODIFY class name and core logic
  - KEEP error handling pattern identical
  - ENSURE proper TypeScript types throughout

...(...)

Task N:
...

```

### Per task pseudocode as needed added to each task

```typescript
// Task 1
// Pseudocode with CRITICAL details - don't write entire code

async function newFeature(param: string): Promise<Result> {
  // PATTERN: Always validate input first using Zod (see src/validators.ts)
  const validated = InputSchema.parse(param); // throws ZodError

  // GOTCHA: This library requires proper resource management
  const conn = await getConnection(); // see src/db/pool.ts
  try {
    // PATTERN: Use existing retry wrapper
    const result = await withRetry(
      async () => {
        // CRITICAL: API returns 429 if >10 req/sec
        await rateLimiter.acquire();
        return await externalApi.call(validated);
      },
      { attempts: 3, backoff: 'exponential' }
    );

    // PATTERN: Standardized response format
    return formatResponse(result); // see src/utils/responses.ts
  } finally {
    await conn.close();
  }
}
```

### Integration Points

```yaml
DATABASE:
  - migration: "Add column 'featureEnabled' to users table"
  - index: "CREATE INDEX idx_feature_lookup ON users(featureId)"

CONFIG:
  - add to: src/config/settings.ts
  - pattern: "export const FEATURE_TIMEOUT = Number(process.env.FEATURE_TIMEOUT ?? 30);"

ROUTES:
  - add to: src/api/routes.ts
  - pattern: "app.use('/feature', featureRouter);"
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run these FIRST - fix any errors before proceeding
bun run biome check --write src/new-feature.ts  # Format and auto-fix
bun run tsc --noEmit                             # Type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests each new feature/file/function use existing test patterns

```typescript
// CREATE tests/new-feature.test.ts with these test cases:
import { describe, it, expect, vi } from 'vitest';
import { newFeature } from '../src/new-feature';

describe('newFeature', () => {
  it('should work with valid input', async () => {
    const result = await newFeature('valid_input');
    expect(result.status).toBe('success');
  });

  it('should throw ZodError on invalid input', async () => {
    await expect(newFeature('')).rejects.toThrow();
  });

  it('should handle timeouts gracefully', async () => {
    vi.mock('../src/external-api', () => ({
      call: vi.fn().mockRejectedValue(new Error('Timeout')),
    }));

    const result = await newFeature('valid');
    expect(result.status).toBe('error');
    expect(result.message).toContain('timeout');
  });
});
```

```bash
# Run and iterate until passing:
bun test tests/new-feature.test.ts
# If failing: Read error, understand root cause, fix code, re-run (never mock to pass)
```

### Level 3: Integration Test

```bash
# Start the service
bun run dev

# Test the endpoint
curl -X POST http://localhost:3000/feature \
  -H "Content-Type: application/json" \
  -d '{"param": "test_value"}'

# Expected: {"status": "success", "data": {...}}
# If error: Check server logs or browser console for stack trace
```

## Final validation Checklist

- [ ] All tests pass: `bun test`
- [ ] No linting/format errors: `bun run biome check src/`
- [ ] No type errors: `bun run tsc --noEmit`
- [ ] Manual test successful: [specific curl/command]
- [ ] Error cases handled gracefully
- [ ] Logs are informative but not verbose
- [ ] Documentation updated if needed
- [ ] No `any` types, no `!` operator, no `as Type` assertions

---

## Anti-Patterns to Avoid

- ❌ Don't create new patterns when existing ones work
- ❌ Don't skip validation because "it should work"
- ❌ Don't ignore failing tests - fix them
- ❌ Don't use `any` types - always provide proper types
- ❌ Don't use non-null assertion (`!`) - use type guards instead
- ❌ Don't use type assertions (`as Type`) - fix the types at source
- ❌ Don't mix Promise and async/await patterns inconsistently
- ❌ Don't hardcode values that should be config
- ❌ Don't catch all errors - be specific with error types


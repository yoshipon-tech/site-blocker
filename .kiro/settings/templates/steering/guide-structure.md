# Project Structure

## Organization Philosophy

[Describe approach: feature-first, layered, domain-driven, etc.]

## Directory Patterns

### [Pattern Name]
**Location**: `/path/`  
**Purpose**: [What belongs here]  
**Example**: [Brief example]

### [Pattern Name]
**Location**: `/path/`  
**Purpose**: [What belongs here]  
**Example**: [Brief example]

## Spec と影響範囲の対応

| spec        | 範囲                 |
| ----------- | -------------------- |
| [spec-name] | [directories owned]  |

[Rules for keeping spec boundaries from overlapping, and what must be settled on main before branching]

## Naming Conventions

- **Files**: [Pattern, e.g., PascalCase, kebab-case]
- **Components**: [Pattern]
- **Functions**: [Pattern]

## Import Organization

```typescript
// Example import patterns
import { Something } from '@/path'  // Absolute
import { Local } from './local'     // Relative
```

**Path Aliases**:
- `@/`: [Maps to]

## Code Organization Principles

[Key architectural patterns and dependency rules]

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_

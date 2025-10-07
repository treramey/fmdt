import { render } from 'ink-testing-library';
import { describe, expect, test } from 'vitest';
import { BranchRow } from '../src/components/BranchRow.js';

describe('BranchRow', () => {
  // Test: Expected use case - merged branch with full data
  test('should render merged branch with all data', () => {
    const { lastFrame } = render(
      <BranchRow name="Dev" merged={true} date="2025-01-15T10:30:00Z" mergedBy="John Doe" />,
    );

    const output = lastFrame();
    expect(output).toContain('Dev');
    expect(output).toContain('✓');
    expect(output).toContain('Merged');
    expect(output).toContain('Jan 15');
    expect(output).toContain('John Doe');
  });

  // Test: Expected use case - non-merged branch
  test('should render non-merged branch with null data', () => {
    const { lastFrame } = render(<BranchRow name="QA" merged={false} date={null} mergedBy={null} />);

    const output = lastFrame();
    expect(output).toContain('QA');
    expect(output).toContain('✗');
    expect(output).toContain('Not Merged');
    expect(output).toContain('-'); // Should show dash for null date and mergedBy
  });

  // Test: Edge case - merged status with null date and author
  test('should handle merged status with missing date and author', () => {
    const { lastFrame } = render(<BranchRow name="Staging" merged={true} date={null} mergedBy={null} />);

    const output = lastFrame();
    expect(output).toContain('Staging');
    expect(output).toContain('✓');
    expect(output).toContain('Merged');
    expect(output).toContain('-');
  });

  // Test: Edge case - long branch name (truncated by width constraint)
  test('should render branch with long name', () => {
    const { lastFrame } = render(
      <BranchRow name="VeryLongBranchName" merged={true} date="2025-01-15T10:30:00Z" mergedBy="Jane Smith" />,
    );

    const output = lastFrame();
    expect(output).toContain('VeryLongBran'); // Truncated due to width: 12
    expect(output).toContain('✓');
    expect(output).toContain('Merged');
  });

  // Test: Edge case - special characters in author name
  test('should render author with special characters', () => {
    const { lastFrame } = render(
      <BranchRow name="Master" merged={true} date="2025-01-15T10:30:00Z" mergedBy="O'Brien, Mary-Jane" />,
    );

    const output = lastFrame();
    expect(output).toContain('Master');
    expect(output).toContain("O'Brien, Mary-Jane");
  });

  // Test: Failure case - empty string values
  test('should handle empty string for name and author', () => {
    const { lastFrame } = render(<BranchRow name="" merged={false} date={null} mergedBy="" />);

    const output = lastFrame();
    expect(output).toContain('✗');
    expect(output).toContain('Not Merged');
  });

  // Test: marginBottom prop
  test('should render with custom marginBottom', () => {
    const { lastFrame } = render(
      <BranchRow name="Dev" merged={true} date="2025-01-15T10:30:00Z" mergedBy="John Doe" marginBottom={2} />,
    );

    const output = lastFrame();
    expect(output).toContain('Dev');
    // Note: marginBottom is a layout prop and won't be visible in text output
  });

  // Test: default marginBottom
  test('should render with default marginBottom of 0', () => {
    const { lastFrame } = render(
      <BranchRow name="Dev" merged={true} date="2025-01-15T10:30:00Z" mergedBy="John Doe" />,
    );

    const output = lastFrame();
    expect(output).toContain('Dev');
  });
});

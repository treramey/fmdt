import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { useSimpleVirtualScroll } from '../hooks/useSimpleVirtualScroll.js';
import type { Project } from '../types/index.js';
import { colors } from '../utils/colors.js';

/**
 * Props for the ProjectSelector component.
 */
type ProjectSelectorProps = {
  /** List of Azure DevOps projects to display */
  projects: Project[];
  /** Callback invoked when user selects a project */
  onSelect: (projectName: string) => void;
};

/**
 * Interactive project selector with keyboard navigation and virtual scrolling.
 *
 * Displays a list of Azure DevOps projects with arrow key navigation and Enter
 * to select. Uses virtual scrolling to efficiently handle large project lists.
 * Shows scroll indicators when there are more items above or below the viewport.
 *
 * @param props - Component props containing projects and selection callback
 * @returns Virtualized, keyboard-navigable project list
 * @example
 * <ProjectSelector
 *   projects={allProjects}
 *   onSelect={(name) => console.log(`Selected: ${name}`)}
 * />
 */
export function ProjectSelector({ projects, onSelect }: ProjectSelectorProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    visibleItems: visibleProjects,
    scrollOffset,
    viewportHeight,
    hasTopIndicator,
    hasBottomIndicator,
  } = useSimpleVirtualScroll({
    items: projects,
    selectedIndex,
    reservedLines: 6, // Header + instructions + footer + padding
  });

  useInput((_input, key) => {
    if (key.return) {
      const selectedProject = projects[selectedIndex];
      if (selectedProject) {
        onSelect(selectedProject.name);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(projects.length - 1, prev + 1));
      return;
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.iris}>
          Select your Azure DevOps project:
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={colors.muted}>Found {projects.length} projects (use ↑↓ to navigate, Enter to select)</Text>
      </Box>
      {hasTopIndicator && (
        <Box justifyContent="center">
          <Text color={colors.muted}>↑ More above</Text>
        </Box>
      )}
      <Box flexDirection="column">
        {visibleProjects.map((project, index) => {
          const absoluteIndex = scrollOffset + index;
          const isSelected = absoluteIndex === selectedIndex;
          return (
            <Box key={project.name}>
              <Text color={isSelected ? colors.iris : colors.text}>
                {isSelected ? '❯ ' : '  '}
                {project.name}
              </Text>
            </Box>
          );
        })}
      </Box>
      {hasBottomIndicator && (
        <Box justifyContent="center">
          <Text color={colors.muted}>↓ More below</Text>
        </Box>
      )}
      {projects.length > viewportHeight && (
        <Box marginTop={1}>
          <Text dimColor>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + viewportHeight, projects.length)} of {projects.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}

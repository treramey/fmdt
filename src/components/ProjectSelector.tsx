import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { useSimpleVirtualScroll } from '../hooks/useSimpleVirtualScroll.js';
import type { Project } from '../types/index.js';
import { colors } from '../utils/colors.js';

type ProjectSelectorProps = {
  projects: Project[];
  onSelect: (projectName: string) => void;
  initialSelectedName?: string;
};

export function ProjectSelector({ projects, onSelect, initialSelectedName }: ProjectSelectorProps): React.JSX.Element {
  const initialIndex = initialSelectedName ? projects.findIndex((p) => p.name === initialSelectedName) : 0;
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;
  const [selectedIndex, setSelectedIndex] = useState(safeInitialIndex);

  const {
    visibleItems: visibleProjects,
    scrollOffset,
    viewportHeight,
    hasTopIndicator,
    hasBottomIndicator,
  } = useSimpleVirtualScroll({
    items: projects,
    selectedIndex,
    reservedLines: 6,
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
          const isCurrent = project.name === initialSelectedName;
          return (
            <Box key={project.name}>
              <Text color={isSelected ? colors.iris : colors.text}>{isSelected ? '❯ ' : '  '}</Text>
              {isCurrent ? (
                <Text color={colors.gold}>● {project.name}</Text>
              ) : (
                <Text color={isSelected ? colors.iris : colors.text}>{project.name}</Text>
              )}
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

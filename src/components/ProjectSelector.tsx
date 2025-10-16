import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';
import type { Project } from '../types/index.js';
import { colors } from '../utils/colors.js';

type ProjectSelectorProps = {
  projects: Project[];
  onSelect: (projectName: string) => void;
};

export function ProjectSelector({ projects, onSelect }: ProjectSelectorProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleCount = 10;
  const maxScroll = Math.max(0, projects.length - visibleCount);

  useInput((_input, key) => {
    if (key.return) {
      const selectedProject = projects[selectedIndex];
      if (selectedProject) {
        onSelect(selectedProject.name);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => {
        const newIndex = Math.max(0, prev - 1);
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
        return newIndex;
      });
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => {
        const newIndex = Math.min(projects.length - 1, prev + 1);
        if (newIndex >= scrollOffset + visibleCount) {
          setScrollOffset(Math.min(maxScroll, newIndex - visibleCount + 1));
        }
        return newIndex;
      });
      return;
    }
  });

  const visibleProjects = projects.slice(scrollOffset, scrollOffset + visibleCount);

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
      {projects.length > visibleCount && (
        <Box marginTop={1}>
          <Text dimColor>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + visibleCount, projects.length)} of {projects.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}

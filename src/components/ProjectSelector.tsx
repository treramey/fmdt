import { Select } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';
import type { Project } from '../types/index.js';
import { colors } from '../utils/colors.js';

type ProjectSelectorProps = {
  projects: Project[];
  onSelect: (projectName: string) => void;
};

export function ProjectSelector({ projects, onSelect }: ProjectSelectorProps): React.JSX.Element {
  const options = projects.map((project) => ({
    label: project.name,
    value: project.name,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.iris}>
          Select your Azure DevOps project:
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={colors.muted}>Found {projects.length} projects</Text>
      </Box>
      <Select options={options} onChange={onSelect} visibleOptionCount={10} />
    </Box>
  );
}

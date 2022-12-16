export const taskPositions = {
  // Task goes before SSH tasks
  ORDER: 'order',
  // Task goes first. If there were other task with FIRST earlier, it will be moved
  FIRST: 'first',
  // Task goes after release is uploaded, but before updating symlink
  AFTER_RELEASE_UPLOAD: 'after-release-upload',
  // Add directly to tasks array
  DIRECT: 'direct',
} as const;

export const DEFAULT_TASK_POSITION = taskPositions.ORDER;

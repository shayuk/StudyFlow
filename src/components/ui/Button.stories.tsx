import type { Meta, StoryObj } from '@storybook/react-vite';

import Button from './Button.js';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    ...Default.args,
    variant: 'secondary',
  },
};

export const Destructive: Story = {
    args: {
        ...Default.args,
        variant: 'destructive',
    },
};

export const Large: Story = {
    args: {
        ...Default.args,
        size: 'lg',
    },
};

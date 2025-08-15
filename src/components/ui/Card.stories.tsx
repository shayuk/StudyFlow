import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent } from './Card.js';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: <CardContent>This is the content of the card.</CardContent>,
  },
};

export const WithCustomClass: Story = {
    args: {
        ...Default.args,
        className: 'bg-primary text-white',
    },
};

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import ShiftBadge from '../components/ShiftBadge';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

describe('ShiftBadge', () => {
  it('renders the name before the night/day label', () => {
    render(createElement(ShiftBadge, { shift: 'night' }, 'Kutubuddin'));

    const name = screen.getByText('Kutubuddin');
    const badge = screen.getByText('Night');

    expect(name.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('ThemeProvider', () => {
  it('provides a theme context before the effect finishes mounting', () => {
    const ThemeConsumer = () => {
      const { theme } = useTheme();
      return createElement('div', null, theme);
    };

    render(
      createElement(
        ThemeProvider,
        null,
        createElement(ThemeConsumer)
      )
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
  });
});

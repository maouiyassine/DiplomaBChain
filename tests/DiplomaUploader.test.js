import React from 'react';
import { render, screen } from '@testing-library/react';
import DiplomaUploader from '../src/components/DiplomaUploader';

test('renders upload button and input field', () => {
  render(<DiplomaUploader onResult={jest.fn()} />);
  expect(screen.getByText(/Choisir un diplôme/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Calculer et téléverser/i })).toBeInTheDocument();
});

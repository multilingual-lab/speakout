import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SyncPromptModal from './SyncPromptModal.jsx';

afterEach(cleanup);

function renderModal(overrides = {}) {
  const props = {
    onMerge: vi.fn(),
    onUseCloud: vi.fn(),
    ...overrides,
  };
  render(<SyncPromptModal {...props} />);
  return props;
}

describe('SyncPromptModal', () => {
  it('renders title and both option buttons', () => {
    renderModal();
    expect(screen.getByText('Sync Progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge with my account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use cloud only' })).toBeInTheDocument();
  });

  it('calls onMerge when merge button is clicked', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(screen.getByRole('button', { name: 'Merge with my account' }));
    expect(props.onMerge).toHaveBeenCalledOnce();
    expect(props.onUseCloud).not.toHaveBeenCalled();
  });

  it('calls onUseCloud when cloud-only button is clicked', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(screen.getByRole('button', { name: 'Use cloud only' }));
    expect(props.onUseCloud).toHaveBeenCalledOnce();
    expect(props.onMerge).not.toHaveBeenCalled();
  });

  it('calls onUseCloud when clicking backdrop', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(screen.getByText('Sync Progress').closest('.settings-overlay'));
    expect(props.onUseCloud).toHaveBeenCalled();
  });
});

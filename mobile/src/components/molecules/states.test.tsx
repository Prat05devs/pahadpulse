import { ApiError } from '@/lib/api';
import { renderWithProviders, fireEvent } from '@/test/utils';

import { ErrorState } from './states';

describe('ErrorState', () => {
  it('tells an offline reader that saved pages still work', async () => {
    const error = new ApiError('offline', 10_503, 'No connection', 0);
    const screen = await renderWithProviders(<ErrorState error={error} onRetry={jest.fn()} />);

    expect(screen.getByText('No connection')).toBeTruthy();
    expect(screen.getByText(/Saved pages still work/)).toBeTruthy();
  });

  it('distinguishes a slow server from being offline', async () => {
    const error = new ApiError('timeout', 10_408, 'Too slow', 504);
    const screen = await renderWithProviders(<ErrorState error={error} onRetry={jest.fn()} />);

    expect(screen.getByText('The server is slow to answer')).toBeTruthy();
  });

  it('offers no retry for a 404, which retrying cannot fix', async () => {
    const error = new ApiError('not-found', 40_401, 'Missing', 404);
    const screen = await renderWithProviders(<ErrorState error={error} onRetry={jest.fn()} />);

    expect(screen.getByText('Not found')).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  it('calls onRetry when the reader taps Try again', async () => {
    const onRetry = jest.fn();
    const error = new ApiError('offline', 10_503, 'No connection', 0);
    const screen = await renderWithProviders(<ErrorState error={error} onRetry={onRetry} />);

    fireEvent.press(screen.getByLabelText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says a schema mismatch is our bug, not the reader fault', async () => {
    const error = new ApiError('invalid-response', 10_000, 'slug expected string', 200);
    const screen = await renderWithProviders(<ErrorState error={error} />);

    expect(screen.getByText(/bug on our side/)).toBeTruthy();
  });
});

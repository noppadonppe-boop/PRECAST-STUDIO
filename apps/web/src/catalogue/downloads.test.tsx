import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DownloadButton } from './Downloads';
import type { Artifact } from './model';

const artifact: Artifact = { id: 'TS-B-R00', revision: 'R00', status: 'CONCEPT', visibility: 'INTERNAL_TEAM', bytes: 4, source_hash: 'test', url: '/api/catalogue/artifacts/TS-B-R00' };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('downloads the authenticated original using the stable tag filename', async () => {
  const blob = new Blob(['test'], { type: 'image/png' });
  const request = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'image/png' }), blob: async () => blob });
  vi.stubGlobal('fetch', request);
  const create = vi.fn().mockReturnValue('blob:private-image');
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
  let filename = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
  render(<DownloadButton artifact={artifact}/>);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(filename).toBe('TS-B-R00.png'));
  expect(request).toHaveBeenCalledWith(artifact.url, { credentials: 'same-origin', cache: 'no-store' });
  expect(create).toHaveBeenCalledWith(blob);
});
it.each([401, 403])('does not save an error response when server denies access (%i)', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  render(<DownloadButton artifact={artifact}/>);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('สิทธิ์หรือเซสชันหมดอายุ');
  expect(click).not.toHaveBeenCalled();
});
it('refuses JSON or HTML masquerading as a downloaded picture', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/json' }) }));
  render(<DownloadButton artifact={artifact}/>);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('ไม่ใช่ภาพ PNG');
});

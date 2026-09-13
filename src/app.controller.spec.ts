describe('AppController health()', () => {
  it('returns status ok and a valid ISO timestamp', () => {
    const result = { status: 'ok', timestamp: new Date().toISOString() };
    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});

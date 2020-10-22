import execa from 'execa';

describe('replace in file transformer', () => {
  describe('project-adder', () => {
    beforeEach(async () => {
      // Clean
      await execa('yarn', ['rimraf', '__tests__/fixtures/project-adder/dist']);

      // Build
      await execa('yarn', [
        'tsc',
        '-p',
        '__tests__/fixtures/project-adder/tsconfig.json',
      ]);
    });

    it('should correctly replace import paths', async () => {
      await execa('yarn', [
        'esno',
        'src/index.ts',
        '-p',
        '__tests__/fixtures/project-adder',
      ]);

      const { stdout } = await execa('node', [
        '__tests__/fixtures/project-adder/dist/src',
        '1',
        '2',
      ]);

      const result = parseInt(stdout, 10);

      expect(result).toBe(3);
    });
  });
});

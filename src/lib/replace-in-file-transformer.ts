import assert from 'assert';
import { parse } from 'comment-json';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { CompilerOptions } from 'typescript';

type TsConfig = {
  compilerOptions: CompilerOptions;
};

export class Transformer {
  private tsconfig: TsConfig;
  private absoluteOutDir: string;
  private outDir: string;
  private baseUrl: string;
  private aliases: Record<string, string[]> = {};

  public fromPattern: RegExp;
  public files: string[] = [];

  constructor(projectPath: string, tsconfigFileName = 'tsconfig.json') {
    const absoluteProjectPath = path.resolve(projectPath);

    this.tsconfig = parse(
      fs
        .readFileSync(path.join(absoluteProjectPath, tsconfigFileName))
        .toString(),
    );

    assert(this.tsconfig.compilerOptions.outDir != null);
    assert(this.tsconfig.compilerOptions.baseUrl != null);
    assert(this.tsconfig.compilerOptions.paths != null);

    this.baseUrl = this.tsconfig.compilerOptions.baseUrl;

    const outDir: string = this.tsconfig.compilerOptions.outDir;
    this.outDir = outDir;
    this.absoluteOutDir = path.resolve(path.join(absoluteProjectPath, outDir));

    const paths: Record<string, string[]> = this.tsconfig.compilerOptions.paths;

    this.files = glob.sync(path.join(this.absoluteOutDir, './**/*.?(j|t)s'), {
      absolute: true,
    });

    for (const [alias, lookups] of Object.entries(paths)) {
      this.aliases[alias.replace('/*', '/.*')] = lookups.map((lookup) =>
        lookup.replace('/*', '').replace('*', '.'),
      );
    }

    const pathKeys = Object.keys(this.aliases);

    this.fromPattern = new RegExp(
      [
        `require\\("(${pathKeys.join('|')})"\\)`,
        '|',
        `require\\('(${pathKeys.join('|')})'\\)`,
      ].join(''),
      'g',
    );
  }

  transform(...args: string[]): string {
    const [match] = args;
    const [file] = args.reverse();
    // Trim the file from the path
    const fileDir = file.split('/').slice(0, -1).join('/');

    // Which path alias do you match?
    for (const [key, [lookup]] of Object.entries(this.aliases)) {
      // Convert something like `@src/*` to `@src`
      const pureKey = key.replace('/.*', '');

      // Replace match with lookup and strip require() syntax
      const requirePath = match
        .replace(pureKey, lookup)
        .replace(/require\(['"]/, '')
        .replace(/['"]\)/, '');

      if (match.includes(pureKey)) {
        const to = path.resolve(
          path.join(this.absoluteOutDir, this.baseUrl, requirePath),
        );

        let relativeRequire = path.relative(fileDir, to);

        // It's possible a relative path could look like `lib/math`
        // That won't work with require() so we need to make it relative
        if (relativeRequire.startsWith('../') === false) {
          relativeRequire = `./${relativeRequire}`;
        }

        // Once the path key to alias swap happens, it doesn't mean that folder
        // exists in the `outDir`, if it doesn't just remove it.
        if (
          !fs.existsSync(path.resolve(path.join(this.absoluteOutDir, lookup)))
        ) {
          relativeRequire = relativeRequire.replace(`${lookup}/`, '');
        }

        const newRequire = `require('${relativeRequire}')`;

        return newRequire;
      }
    }

    return match;
  }
}

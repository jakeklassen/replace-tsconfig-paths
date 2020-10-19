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
    assert(this.tsconfig.compilerOptions.paths != null);

    const outDir: string = this.tsconfig.compilerOptions.outDir;
    this.absoluteOutDir = path.resolve(path.join(absoluteProjectPath, outDir));

    const paths: Record<string, string[]> = this.tsconfig.compilerOptions.paths;

    this.files = glob.sync(path.join(this.absoluteOutDir, './**/*.?(j|t)s'), {
      absolute: true,
    });

    for (const [alias, lookups] of Object.entries(paths)) {
      this.aliases[alias.replace('/*', '/.*')] = lookups.map((lookup) =>
        lookup.replace('/*', ''),
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

    for (const [key, [lookup]] of Object.entries(this.aliases)) {
      const pureKey = key.replace('/.*', '');

      const requirePath = match
        .replace(pureKey, lookup)
        .replace(/require\(['"]/, '')
        .replace(/['"]\)/, '');

      if (match.includes(pureKey)) {
        let relativeRequire = path.relative(
          fileDir,
          path.resolve(path.join(this.absoluteOutDir, requirePath)),
        );

        if (relativeRequire.match(/^\w/) != null) {
          relativeRequire = `./${relativeRequire}`;
        }

        const newRequire = `require('${relativeRequire}')`;

        return newRequire;
      }
    }

    return match;
  }
}

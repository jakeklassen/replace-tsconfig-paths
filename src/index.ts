#!/usr/bin/env node

import { replaceInFile } from 'replace-in-file';
import yargs from 'yargs';
import { Transformer } from './lib/replace-in-file-transformer';

const args = yargs.options({
  project: {
    type: 'string',
    demandOption: false,
    alias: 'p',
    default: '.',
    description: 'Path to folder containing tsconfig',
  },
  config: {
    type: 'string',
    demandOption: false,
    alias: 'c',
    default: 'tsconfig.json',
    description: 'Name of tsconfig file',
  },
}).argv;

const { project, config } = args;

async function main() {
  const transformer = new Transformer(project, config);

  console.info(`Matched on ${transformer.files.length} files`);

  await replaceInFile({
    files: transformer.files,
    from: transformer.fromPattern,
    to: (...args: string[]) => transformer.transform(...args),
  });

  console.info('Finished');
}

main();

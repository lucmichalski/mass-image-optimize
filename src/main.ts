"use strict";
import * as sharp from "sharp";
// use fs-extra instead of fs, so that all calls are promisified
import * as fse from "fs-extra";
import * as sizeOf from "image-size";
import * as program from "commander";

// defaults
let max_width = 1200;
let max_height = 1200;
let basedir = process.cwd();

program
  .option(
    "-d, --dir <path>",
    "base absolute directory containing unoptimized files"
  )
  .option(
    "-w, --max_width <n>",
    "max width of new image (maintains aspect ratio)",
    parseInt
  )
  .option(
    "-h, --max_height <n>",
    "max height of new image (maintains aspect ratio)",
    parseInt
  )
  .parse(process.argv);

// if program was called with no arguments, show help. (or use defaults?)
console.log(program.dir);
if (!program.dir || program.dir.length === 0) {
  // first arg is node.js, second arg is main.js
  program.help();
  process.exit();
}

console.log("PROCESSING...");
try {
  walk(program.dir || basedir);
} catch (e) {
  console.error(e);
}


// inspired by: https://gist.github.com/adamwdraper/4212319
async function walk(dir: string) {
  // make new dir if doesn't exist
  let newdir = dir.replace(basedir, basedir + "-optimized");
  if (!fse.existsSync(newdir)) {
    console.log(newdir);
    await fse.mkdir(newdir);
  }
  const list: string[] = await fse.readdir(dir);
  // depth first traversal
  const promises = list.map(async function(filename) {
    if (!filename) return null;
    let filepath = dir + "/" + filename;
    const stat: fse.Stats = await fse.stat(filepath);
    if (stat && stat.isDirectory()) {
      // recurse down a directory
      await walk(filepath);
    } else {
      // process new file
      const newpath = newdir + "/" + filename;
      await processFile(filepath, newpath);
    }
  });
  await Promise.all(promises);
  console.log('DONE.')
}

async function processFile(file: string, newpath: string) {
  // console.log(file);
  // if image, optimize
  if (file.endsWith(".jpg") || file.endsWith(".png")) {
    const { width, height } = sizeOf(file);
    // if too small, just copy
    if (width < max_width && height < max_height) {
      try {
        await fse.copy(file, newpath);
      } catch (err) {
        console.error(err);
      }
    }
    await sharp(file)
      .resize(max_width, max_height)
      .max()
      .rotate()
      .toFile(newpath, (err, info) => {
        if (err) console.log(err);
      });
  }
  // else just copy
  else {
    try {
      await fse.copy(file, newpath);
    } catch (err) {
      console.error(err);
    }
  }
}
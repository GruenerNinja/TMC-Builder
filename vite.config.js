import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as glob from 'glob';
import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import chalk from 'chalk';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to dynamically detect entry points in resources/react
const getEntryPoints = () => {
  const entries = {};
  const files = glob.sync('resources/react/**/*.jsx'); // Adjust to the resources directory
  files.forEach((file) => {
    const name = file.replace(/^resources\/react\//, '').replace(/\.jsx$/, ''); // Remove .jsx extension
    entries[name] = resolve(__dirname, file); // Add entry points
  });
  return entries;
};

// Custom function to replace .jsx with .js in HTML files after Vite build
const replaceJSXExtensionInHTML = (htmlFilePath) => {
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  const updatedHtml = htmlContent.replace(/\.jsx(?=")/g, '.js');
  fs.writeFileSync(htmlFilePath, updatedHtml, 'utf-8');
};

// Helper function to copy asset folders and public folder content
const copyAssets = () => {
  return {
    name: 'copy-assets', // Plugin name
    enforce: 'post', // Ensure it runs after the build process
    async generateBundle() {
      // Get all resource directories excluding 'react'
      const resourceDirs = glob.sync('resources/*/', { absolute: true });

      // Iterate through each directory and copy
      console.log('');
      for (const dir of resourceDirs) {
        const folderName = path.basename(dir); // Get folder name (css, scripts, etc.)
        const distDir = path.resolve(__dirname, `dist/resources/${folderName}`);

        // Ensure target directory exists in dist
        await fse.ensureDir(distDir);

        // Copy the contents of each folder to the corresponding dist directory
        await fse.copy(dir, distDir);

        // Log the relative path
        const relativeDir = path.relative(__dirname, dir); // Get relative path
        console.log(chalk.hex('#459800')('Successfully copied') + ' ' + chalk.hex('#0f9c9d')(relativeDir) + ' ' + chalk.hex('#0f9c9d')(`to dist/resources/${folderName}`));
      }

      // Explicitly copy the public folder to dist/public
      const publicDir = path.resolve(__dirname, 'public');
      const distPublicDir = path.resolve(__dirname, 'dist/public');

      if (fs.existsSync(publicDir)) {
        await fse.ensureDir(distPublicDir); // Ensure dist/public exists
        await fse.copy(publicDir, distPublicDir); // Copy the public folder content
        console.log(chalk.hex('#459800')('Successfully copied') + ' ' + chalk.hex('#0f9c9d')(publicDir) + ' ' + chalk.hex('#0f9c9d')(`to dist/public`));
      }
    },
  };
};

export default defineConfig({
  publicDir: false, // Disable default Vite behavior of copying public folder content

  plugins: [
    react(),
    copyAssets(),
    {
      name: 'replace-jsx-to-js',
      writeBundle() {
        // Replace .jsx with .js in all generated HTML files
        const htmlFiles = glob.sync('dist/**/*.html');
        htmlFiles.forEach(replaceJSXExtensionInHTML);
      },
    },
  ],

  build: {
    rollupOptions: {
      input: getEntryPoints(), // Dynamically detected entry points in resources/react
      output: {
        entryFileNames: 'resources/react/[name].js', // Output JS files with the same name as the entry
        chunkFileNames: 'resources/chunks/[name].js', // Chunks are stored in the 'resources/chunks' folder
      },
    },
    minify: false, // Disable compression for easier debugging
    sourcemap: false, // Disable sourcemaps for now
  },

  // After build, copy assets dynamically using the postBuild function
  buildEnd: async () => {
    await copyAssets(); // Copy the assets after build completes
  },
});

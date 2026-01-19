const fs = require('fs');
const path = require('path');

const distDir = './dist';
const filesToCopy = ['index.html', 'styles.css', 'app.js', 'README.md', 'submit.txt'];
const assetsDir = './assets';

// 创建 dist 目录
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 复制文件
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
    console.log(`Copied: ${file}`);
  }
});

// 复制 assets 目录
if (fs.existsSync(assetsDir)) {
  const distAssetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(distAssetsDir)) {
    fs.mkdirSync(distAssetsDir, { recursive: true });
  }
  
  fs.readdirSync(assetsDir).forEach(file => {
    const srcPath = path.join(assetsDir, file);
    const destPath = path.join(distAssetsDir, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: assets/${file}`);
    }
  });
}

console.log('Build complete: Static site files copied to dist/');

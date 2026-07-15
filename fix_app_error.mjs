import fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

const updatedCode = code.replace(
  /if \(err\.message\.includes\('当前产品与场景规划数据不一致'\) \|\| err\.code === 'PRODUCT_ASSET_MISMATCH'\) \{\s*errorMsg = err\.message;\s*\} else \{/,
  `if (err.message.includes('当前产品与场景规划数据不一致') || err.code === 'PRODUCT_ASSET_MISMATCH') {
          errorMsg = err.message;
        } else if (err.code === 'GEMINI_RECIPE_PARSE_FAILED') {
          errorMsg = '生成配方失败：模型生成的格式不符合要求，请重试';
        } else {`
);

fs.writeFileSync('src/App.tsx', updatedCode);
